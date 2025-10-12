// Arquivo: patient.js (VERSÃO CORRIGIDA E COMPLETA)

document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA PARA O MENU MOBILE ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('is-open');
        });
    }
    // --- FIM DA LÓGICA DO MENU ---

    // --- ELEMENTOS PRINCIPAIS DO DASHBOARD (declarados uma única vez) ---
    const mainContent = document.getElementById('patient-main-content');
    const navLinks = document.querySelectorAll('.sidebar-nav li');

    // --- DADOS SIMULADOS DO PACIENTE ---
    const dadosPaciente = {
        nome: "Anderson",
        status: "novo"
    };
    
    // --- LÓGICA DA PÁGINA DE VISÃO GERAL ---
    function inicializarVisaoGeral() {
        const nomeUsuarioEl = document.getElementById('nome-usuario');
        if (nomeUsuarioEl) {
            nomeUsuarioEl.textContent = dadosPaciente.nome;
        }

        const cardPassosEl = document.getElementById('card-proximos-passos');
        if (cardPassosEl) {
            if (dadosPaciente.status === 'novo') {
                cardPassosEl.innerHTML = `
                    <h2>Pronto(a) para começar a conversa?</h2>
                    <p>Explore os perfis que encontramos para você na seção 'Meus Matches' e inicie o contato com quem você mais se identificar.</p>
                    <a href="#" class="btn btn-principal" data-target="patient_matches.html">Ver meus Matches</a>
                `;
            } else {
                cardPassosEl.innerHTML = `
                    <h2>Como foi sua experiência?</h2>
                    <p>Sua opinião é muito importante para nossa comunidade. Quando se sentir confortável, você pode deixar uma avaliação sobre o profissional com quem conversou.</p>
                    <a href="#" class="btn btn-principal" data-target="patient_matches.html">Avaliar Profissional</a>
                `;
            }
        }
    }

    // --- GERENCIADOR DE CARREGAMENTO DE PÁGINAS ---
    function loadPage(pageUrl) {
        if (!pageUrl) return;

        fetch(pageUrl) 
            .then(response => response.ok ? response.text() : Promise.reject(`Arquivo não encontrado: ${pageUrl}`))
            .then(html => {
                mainContent.innerHTML = html;

                if (pageUrl.includes('patient_visao_geral.html')) {
                    inicializarVisaoGeral();
                }
                // Adicione outras chamadas de função aqui para as outras páginas no futuro
            })
            .catch(error => {
                mainContent.innerHTML = `<h1>Página em Construção</h1>`;
                console.error(error);
            });
    }

    // --- INICIALIZAÇÃO DO DASHBOARD ---
    // Carrega a página inicial
    loadPage('patient_visao_geral.html');

    // Adiciona o evento de clique para a navegação
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Fecha a sidebar ao clicar em um link no menu mobile
            if (sidebar.classList.contains('is-open')) {
                sidebar.classList.remove('is-open');
            }

            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            const page = this.getAttribute('data-page');
            loadPage(page);
        });
    });

}); // FIM DO DOMContentLoaded