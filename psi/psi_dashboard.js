// Arquivo: psi_dashboard.js (Versão Final com Caixa de Entrada e Menu Mobile)

document.addEventListener('DOMContentLoaded', function() {
    
    // --- SELETORES GLOBAIS ---
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('.sidebar-nav li');
    const menuToggleButton = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.dashboard-sidebar');

    // =====================================================================
    // LÓGICA DO MENU MOBILE (HAMBÚRGUER)
    // =====================================================================
    if (menuToggleButton && sidebar) {
        menuToggleButton.addEventListener('click', function() {
            sidebar.classList.toggle('is-open');
        });
    }

    // =====================================================================
    // LÓGICA DA CAIXA DE ENTRADA (INTERAÇÃO MOBILE)
    // =====================================================================
    // Usamos "delegação de eventos" no 'mainContent' porque os elementos da
    // caixa de entrada não existem no início, eles são carregados depois.
    if (mainContent) {
        mainContent.addEventListener('click', function(event) {
            const inboxContainer = event.target.closest('.inbox-container');
            if (!inboxContainer) return;

            // Lógica para ABRIR uma mensagem
            if (event.target.closest('.message-item')) {
                inboxContainer.classList.add('mostrando-conteudo');
                const clickedItem = event.target.closest('.message-item');
                inboxContainer.querySelectorAll('.message-item').forEach(item => item.classList.remove('active'));
                clickedItem.classList.add('active');
            }

            // Lógica para VOLTAR para a lista
            if (event.target.closest('.btn-voltar-inbox')) {
                inboxContainer.classList.remove('mostrando-conteudo');
            }
        });
    }

    // =====================================================================
    // FUNÇÕES DE VALIDAÇÃO (Reutilizáveis)
    // =====================================================================
    function validarCPF(cpf) {
        cpf = String(cpf).replace(/[^\d]/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        return true;
    }

    function validarEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    // =====================================================================
    // LÓGICA MODULAR POR PÁGINA (Funções de Inicialização)
    // =====================================================================
    
    // Lógica da Página: MEU PERFIL
    function inicializarLogicaDoPerfil() {
        const form = document.getElementById('perfil-form');
        if (!form) return;

        const fieldset = document.getElementById('form-fieldset');
        const btnAlterar = document.getElementById('btn-alterar');
        const btnSalvar = document.getElementById('btn-salvar');
        const emailInput = document.getElementById('email');
        const cpfInput = document.getElementById('cpf');
        const whatsappInput = document.getElementById('whatsapp');

        btnAlterar.addEventListener('click', () => {
            fieldset.disabled = false;
            btnAlterar.classList.add('hidden');
            btnSalvar.classList.remove('hidden');
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!validarEmail(emailInput.value)) {
                alert('Por favor, insira um e-mail válido.');
                return emailInput.focus();
            }
            if (!validarCPF(cpfInput.value)) {
                alert('O CPF digitado é inválido. Por favor, verifique.');
                return cpfInput.focus();
            }
            console.log('Dados validados e salvos!');
            fieldset.disabled = true;
            btnSalvar.classList.add('hidden');
            btnAlterar.classList.remove('hidden');
        });

        if (cpfInput) IMask(cpfInput, { mask: '000.000.000-00' });
        if (whatsappInput) IMask(whatsappInput, { mask: '(00) 00000-0000' });
    }

    // Lógica da Página: CAIXA DE ENTRADA (Modal)
    function inicializarLogicaDaCaixaDeEntrada() {
        const btnAbrirFeedback = document.getElementById('btn-abrir-feedback');
        const modalFeedback = document.getElementById('modal-feedback');
        const btnFecharModal = document.getElementById('btn-fechar-modal');

        if (btnAbrirFeedback && modalFeedback && btnFecharModal) {
            btnAbrirFeedback.addEventListener('click', () => modalFeedback.classList.remove('hidden'));
            btnFecharModal.addEventListener('click', () => modalFeedback.classList.add('hidden'));
            modalFeedback.addEventListener('click', (e) => {
                if (e.target === modalFeedback) modalFeedback.classList.add('hidden');
            });
        }
    }

    // =====================================================================
    // GERENCIADOR DE CARREGAMENTO DE PÁGINAS (Fetch e Roteador)
    // =====================================================================
    function loadPage(pageUrl) {
        if (!pageUrl) return;
        mainContent.innerHTML = '<p style="text-align:center; padding: 40px;">Carregando...</p>';
        
        fetch(pageUrl)
            .then(response => response.ok ? response.text() : Promise.reject(`Arquivo não encontrado: ${pageUrl}`))
            .then(html => {
                mainContent.innerHTML = html;
                
                // Roteador de Lógica: Chama a função certa para a página carregada
                if (pageUrl.includes('psi_meu_perfil.html')) {
                    inicializarLogicaDoPerfil();
                } else if (pageUrl.includes('psi_caixa_de_entrada.html')) {
                    inicializarLogicaDaCaixaDeEntrada();
                }
                // Adicione outros 'else if' para as futuras páginas aqui
            })
            .catch(error => {
                mainContent.innerHTML = `<div style="padding: 40px; text-align:center;"><h2>Página em Construção</h2><p>O conteúdo para esta seção estará disponível em breve.</p></div>`;
                console.error(error);
            });
    }

    // =====================================================================
    // CÓDIGO DE INICIALIZAÇÃO E EVENTOS DE NAVEGAÇÃO
    // =====================================================================
    
    // Carrega a página inicial
    const initialPage = document.querySelector('.sidebar-nav li.active')?.getAttribute('data-page');
    if (initialPage) {
        loadPage(initialPage);
    } else {
        const firstPage = document.querySelector('.sidebar-nav li')?.getAttribute('data-page');
        if (firstPage) {
            document.querySelector('.sidebar-nav li')?.classList.add('active');
            loadPage(firstPage);
        }
    }

    // Adiciona evento de clique para os links da navegação principal
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            loadPage(this.getAttribute('data-page'));

            // Fecha a sidebar no mobile após clicar em um link
            if (window.innerWidth <= 992 && sidebar && sidebar.classList.contains('is-open')) {
                sidebar.classList.remove('is-open');
            }
        });
    });

});