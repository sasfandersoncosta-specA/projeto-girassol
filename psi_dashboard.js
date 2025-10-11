// Arquivo: psi_dashboard.js (Versão Final com Caixa de Entrada)

document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('.sidebar-nav li');

    // --- FUNÇÕES DE VALIDAÇÃO ---
    function validarCPF(cpf) {
        cpf = String(cpf).replace(/[^\d]/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false;
        }
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

    // --- LÓGICA MODULAR POR PÁGINA ---

    // Lógica da Página: MEU PERFIL
    function inicializarLogicaDoPerfil() {
        const form = document.getElementById('perfil-form');
        const fieldset = document.getElementById('form-fieldset');
        const btnAlterar = document.getElementById('btn-alterar');
        const btnSalvar = document.getElementById('btn-salvar');
        const emailInput = document.getElementById('email');
        const cpfInput = document.getElementById('cpf');

        if (!form) return; // Se não encontrou o form, sai da função

        btnAlterar.addEventListener('click', () => {
            fieldset.disabled = false;
            btnAlterar.classList.add('hidden');
            btnSalvar.classList.remove('hidden');
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!validarEmail(emailInput.value)) {
                alert('Por favor, insira um e-mail válido.');
                emailInput.focus();
                return;
            }
            if (!validarCPF(cpfInput.value)) {
                alert('O CPF digitado é inválido. Por favor, verifique.');
                cpfInput.focus();
                return;
            }
            console.log('Dados validados e salvos!');
            fieldset.disabled = true;
            btnSalvar.classList.add('hidden');
            btnAlterar.classList.remove('hidden');
        });

        const whatsappInput = document.getElementById('whatsapp');
        if (cpfInput && whatsappInput) {
            IMask(cpfInput, { mask: '000.000.000-00' });
            IMask(whatsappInput, { mask: '(00) 00000-0000' });
        }
    }

    // NOVA FUNÇÃO: Lógica da Página: CAIXA DE ENTRADA
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

        const messageItems = document.querySelectorAll('.message-item');
        messageItems.forEach(item => {
            item.addEventListener('click', () => {
                messageItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                item.classList.remove('unread');
                // Futuramente, aqui você carregaria o conteúdo da mensagem via fetch
            });
        });
    }

    // --- GERENCIADOR DE CARREGAMENTO DE PÁGINAS ---
    function loadPage(pageUrl) {
        if (!pageUrl) return;
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
                // Adicione outros 'else if' para as futuras páginas (ex: assinatura)
            })
            .catch(error => {
                mainContent.innerHTML = `<div style="padding: 40px;"><h1>Página em Construção</h1></div>`;
                console.error(error);
            });
    }

    // --- CÓDIGO DE INICIALIZAÇÃO ---
    const initialPage = document.querySelector('.sidebar-nav li.active')?.getAttribute('data-page');
    if (initialPage) {
        loadPage(initialPage);
    } else {
        const firstPage = document.querySelector('.sidebar-nav li')?.getAttribute('data-page');
        if (firstPage) {
            loadPage(firstPage);
            document.querySelector('.sidebar-nav li')?.classList.add('active');
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            loadPage(this.getAttribute('data-page'));
        });
    });
});