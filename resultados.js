// Arquivo: resultados.js
document.addEventListener('DOMContentLoaded', () => {
    const loadingState = document.getElementById('loading-state');
    const resultsContainer = document.getElementById('results-container');

    // --- SIMULAÇÃO DE RESPOSTAS DA API ---
    // (Em um projeto real, você faria uma chamada fetch para seu backend aqui)

    // Cenário A: Matches Ideais
    const mockResponseIdeal = {
        matchTier: 'ideal',
        results: [
            { id: 1, nome: "Dra. Ana Silva", crp: "06/00001", fotoUrl: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg", rating: 4.8, tags: ["Especialista em Ansiedade", "Ferramentas Práticas"], bio: "Ajudo você a construir ferramentas para uma vida mais leve." },
            { id: 2, nome: "Dr. Bruno Costa", crp: "06/00002", fotoUrl: "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg", rating: 4.9, tags: ["Relacionamentos", "Prática Afirmativa LGBTQIAPN+"], bio: "Um espaço seguro para explorar suas conexões e identidade." }
        ]
    };

    // Cenário B: Correspondências Aproximadas
    const mockResponseApproximate = {
        matchTier: 'near',
        results: [
            { id: 3, nome: "Dr. Carlos Lima", crp: "06/00003", fotoUrl: "https://images.pexels.com/photos/1043473/pexels-photo-1043473.jpeg", rating: 4.7, tags: ["Carreira", "Autoestima"], bio: "Apoio para você alcançar seu potencial profissional e pessoal.", compromisedCriteria: ["abordagem"] }
        ],
        compromiseText: "Ótima combinação nos <strong>temas de interesse</strong>."
    };

    // Cenário C: Nenhum Resultado
    const mockResponseNone = {
        matchTier: 'none',
        results: []
    };

    // --- FUNÇÃO PARA CRIAR UM CARD DE PROFISSIONAL (REUTILIZÁVEL) ---
    function createProfileCard(profile, tier, compromiseText = "") {
        const contextLabel = tier === 'near' 
            ? `<div class="context-label">${compromiseText}</div>` 
            : '';

        return `
            <div class="pro-card">
                <img src="${profile.fotoUrl}" alt="Foto de ${profile.nome}" class="pro-card-img">
                ${contextLabel}
                <div class="pro-card-content">
                    <h3>${profile.nome}</h3>
                    <p class="crp">CRP ${profile.crp}</p>
                    <div class="rating">★★★★☆ ${profile.rating}</div>
                    <div class="compatibility-tags">
                        ${profile.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <p class="bio-snippet">"${profile.bio}"</p>
                    <div class="pro-card-actions">
                        <a href="#" class="btn btn-principal">Ver Perfil Completo</a>
                        <span class="heart-icon">♡</span>
                    </div>
                </div>
            </div>
        `;
    }

    // --- FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO ---
    function renderResults(data) {
        let htmlContent = '';

        // Cenário A: Matches Ideais
        if (data.results.length > 0 && data.matchTier === 'ideal') {
            htmlContent = `
                <div class="resultados-header">
                    <h1>Encontramos ótimas recomendações para você.</h1>
                    <p>Com base nas suas respostas, estes são os profissionais que mais se alinham com o seu momento.</p>
                </div>
                <div class="pro-results-grid">
                    ${data.results.map(profile => createProfileCard(profile, 'ideal')).join('')}
                </div>
            `;
        }
        // Cenário B: Correspondências Aproximadas
        else if (data.results.length > 0 && data.matchTier === 'near') {
             htmlContent = `
                <div class="resultados-header">
                    <h1>Não encontramos um perfil 100% compatível, mas aqui estão algumas ótimas alternativas.</h1>
                    <p>Às vezes, a combinação perfeita de todas as suas preferências não está disponível no momento. Selecionamos alguns profissionais excelentes que se aproximam muito do que você busca.</p>
                </div>
                <div class="pro-results-grid">
                    ${data.results.map(profile => createProfileCard(profile, 'near', data.compromiseText)).join('')}
                </div>
            `;
        }
        // Cenário C: Nenhum Resultado
        else {
            htmlContent = `
                <div class="no-results-container">
                    <div class="resultados-header">
                        <h1>Seu perfil é único, e estamos empenhados em encontrar a pessoa certa.</h1>
                    </div>
                    <img src="assets/images/ilustracao-espera.png" alt="Ilustração de uma pessoa em uma jornada" class="ilustracao">
                    <p>No momento, não temos um profissional disponível que corresponda aos seus critérios. Mas nossa rede de psicólogos está sempre crescendo. Aqui estão algumas opções:</p>
                    <div class="action-box">
                        <h3>Amplie sua Busca</h3>
                        <p>Pequenos ajustes em suas respostas podem revelar novos perfis.</p>
                        <a href="questionario.html" class="btn btn-secundario">Ajustar minhas respostas</a>
                    </div>
                    <div class="action-box">
                        <h3>Seja Notificado(a)</h3>
                        <p>Deixe seu contato e nós te avisaremos assim que um novo profissional com o seu perfil se cadastrar.</p>
                        <a href="#" class="btn btn-principal">Quero ser avisado(a)</a>
                    </div>
                </div>
            `;
        }
        
        // Esconde o loading e mostra os resultados
        loadingState.classList.add('hidden');
        resultsContainer.innerHTML = htmlContent;
        resultsContainer.classList.remove('hidden');
    }

    // --- INICIA O PROCESSO ---
    console.log("Processando resultados...");
    setTimeout(() => {
        // MUDE AQUI PARA TESTAR OS 3 CENÁRIOS:
        // renderResults(mockResponseIdeal);
        // renderResults(mockResponseApproximate);
        renderResults(mockResponseNone); 
    }, 2500); // Simula 2.5 segundos de processamento do algoritmo
});