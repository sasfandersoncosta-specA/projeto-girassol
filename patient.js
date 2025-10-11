// Arquivo: patient.js
document.addEventListener('DOMContentLoaded', () => {
    // Arquivo: patient.js

document.addEventListener('DOMContentLoaded', () => {

    // --- NOVA LÓGICA PARA O MENU MOBILE ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('is-open');
        });
    }
    // --- FIM DA NOVA LÓGICA ---


    const mainContent = document.getElementById('patient-main-content');
    const navLinks = document.querySelectorAll('.sidebar-nav li');

    // ... (o restante do seu código JS continua exatamente o mesmo) ...
});
    const mainContent = document.getElementById('patient-main-content');
    const navLinks = document.querySelectorAll('.sidebar-nav li');

    // --- DADOS SIMULADOS (substituir por dados reais do backend) ---
    const dadosPaciente = { nome: "Anderson", status: "novo" };
    
    // --- LÓGICA DAS PÁGINAS ---
    function inicializarVisaoGeral() {
        const nomeUsuarioEl = document.getElementById('nome-usuario');
        if (nomeUsuarioEl) nomeUsuarioEl.textContent = dadosPaciente.nome;

        const cardPassosEl = document.getElementById('card-proximos-passos');
        if (cardPassosEl) {
            if (dadosPaciente.status === 'novo') {
    cardPassosEl.innerHTML = `
        <h2>Pronto(a) para começar a conversa?</h2>
        <p>Explore os perfis que encontramos para você na seção 'Meus Matches' e inicie o contato com quem você mais se identificar.</p>
        <a href="#" class="btn btn-principal" data-target="patient_matches.html">Ver meus Matches</a>
    `;
} else { // Se o status for 'contatou'
    cardPassosEl.innerHTML = `
        <h2>Como foi sua experiência?</h2>
        <p>Sua opinião é muito importante para nossa comunidade. Quando se sentir confortável, você pode deixar uma avaliação sobre o profissional com quem conversou.</p>
        <a href="#" class="btn btn-principal" data-target="patient_matches.html">Avaliar Profissional</a>
    `;
}
        }
    }
    function inicializarMatches() { console.log("Página de Matches Carregada"); }
    function inicializarFavoritos() { console.log("Página de Favoritos Carregada"); }
    function inicializarMinhaConta() { console.log("Página de Minha Conta Carregada"); }

    // --- GERENCIADOR DE CARREGAMENTO ---
    function loadPage(pageUrl) {
        if (!pageUrl) return;
        fetch(pageUrl) 
            .then(response => response.ok ? response.text() : Promise.reject(`Arquivo não encontrado: ${pageUrl}`))
            .then(html => {
                mainContent.innerHTML = html;

                if (pageUrl.includes('patient_visao_geral.html')) inicializarVisaoGeral();
                else if (pageUrl.includes('patient_matches.html')) inicializarMatches();
                else if (pageUrl.includes('patient_favoritos.html')) inicializarFavoritos();
                else if (pageUrl.includes('patient_minha_conta.html')) inicializarMinhaConta();
            })
            .catch(error => { mainContent.innerHTML = `<h1>Página em Construção</h1>`; console.error(error); });
    }

    // --- INICIALIZAÇÃO ---
    loadPage('patient_visao_geral.html');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            loadPage(this.getAttribute('data-page'));
        });
    });
});