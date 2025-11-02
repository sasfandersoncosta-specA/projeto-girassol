// Arquivo: resultados.js
document.addEventListener('DOMContentLoaded', () => {
    const loadingState = document.getElementById('loading-state');
    const resultsContainer = document.getElementById('results-container');
    const loginUrl = 'http://127.0.0.1:5500/login.html'; // URL para redirecionar se não houver login

    // --- FUNÇÃO PARA CRIAR UM CARD DE PROFISSIONAL (REUTILIZÁVEL) ---
    function createProfileCard(profile, tier, compromiseText = "") {
        const contextLabel = tier === 'near' && compromiseText
            ? `<div class="context-label">${compromiseText}</div>`
            : '';

        // Adaptação para os dados reais da API:
        const foto = profile.fotoUrl || 'https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'; // Foto padrão
        const bio = profile.bio || "Profissional dedicado(a) a oferecer um espaço seguro para seu desenvolvimento."; // Bio padrão
        
        // Gera tags dinamicamente a partir dos dados do psicólogo
        const tags = [];
        if (profile.temas_atuacao && profile.temas_atuacao.length > 0) {
            tags.push(profile.temas_atuacao[0]); // Pega o primeiro tema como tag principal
        }
        if (profile.praticas_vivencias && profile.praticas_vivencias.length > 0) {
            tags.push(profile.praticas_vivencias[0]); // Pega a primeira prática como tag
        }

        // Define o ícone e a classe do coração com base no status de favorito
        const heartIcon = profile.isFavorited ? '♥' : '♡';
        const heartClass = profile.isFavorited ? 'heart-icon favorited' : 'heart-icon';

        return `
            <div class="pro-card">
                <img src="${foto}" alt="Foto de ${profile.nome}" class="pro-card-img">
                ${contextLabel}
                <div class="pro-card-content">
                    <h3>${profile.nome}</h3>
                    <p class="crp">CRP ${profile.crp}</p>
                    <div class="rating">★★★★☆ (Novo na plataforma)</div>
                    <div class="compatibility-tags">
                        ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <p class="bio-snippet">"${bio}"</p>
                    <div class="pro-card-actions">
                        <a href="perfil_psicologo.html?id=${profile.id}" class="btn btn-principal">Ver Perfil Completo</a>
                        <span class="${heartClass}" data-id="${profile.id}" role="button" aria-label="Favoritar">${heartIcon}</span>
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

        // Adiciona os eventos de clique aos novos ícones de coração
        setupFavoriteButtons();
    }

    // --- FUNÇÃO DE INICIALIZAÇÃO DA PÁGINA ---
    function initializePage() {
        // 1. Verifica se há resultados do questionário no sessionStorage
        const storedResults = sessionStorage.getItem('matchResults');

        if (storedResults) {
            console.log("Resultados encontrados no sessionStorage. Renderizando...");
            const matchData = JSON.parse(storedResults);
            renderResults(matchData);

            // Limpa o sessionStorage para não usar os mesmos dados em uma visita futura
            sessionStorage.removeItem('matchResults');
        } else {
            // 2. Se não houver, executa o fluxo para usuário logado
            console.log("Nenhum resultado no sessionStorage. Buscando para usuário logado...");
            fetchAndRenderMatches();
        }
    }

    // --- FUNÇÃO PARA BUSCAR OS DADOS REAIS DA API ---
    async function fetchAndRenderMatches() {
        // Esta função agora é o "fallback" para usuários já logados
        console.log("Buscando recomendações na API...");

        // SUGESTÃO: Lógica para texto de carregamento dinâmico
        const loadingMessages = [
            "Analisando suas respostas...",
            "Buscando os perfis mais compatíveis...",
            "Afinando os últimos detalhes...",
            "Quase lá!"
        ];
        let messageIndex = 0;
        const loadingTextElement = document.querySelector('#loading-state p');

        const messageInterval = setInterval(() => {
            if (loadingTextElement && messageIndex < loadingMessages.length) {
                loadingTextElement.textContent = loadingMessages[messageIndex];
                messageIndex++;
            } else {
                clearInterval(messageInterval);
            }
        }, 2000); // Muda a mensagem a cada 2 segundos

        // Garante que o intervalo seja limpo quando os resultados chegarem
        const clearLoadingInterval = () => clearInterval(messageInterval);

        // 1. Pega o token do localStorage
        const token = localStorage.getItem('girassol_token');

        // 2. Se não houver token, redireciona para o login
        if (!token) {
            console.error("Token não encontrado. Redirecionando para login.");
            clearLoadingInterval();
            window.location.href = loginUrl;
            return;
        }

        try {
            // 3. Faz a chamada para a API, enviando o token
            const response = await fetch(`${API_BASE_URL}/api/psychologists/matches`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // 4. Trata a resposta
            if (response.ok) {
                clearLoadingInterval();
                const data = await response.json();
                console.log("Dados recebidos da API:", data);
                renderResults(data); // Renderiza os resultados reais
            } else {
                // Se o token for inválido ou expirado, a API retornará um erro 401
                clearLoadingInterval();
                console.error("Falha na autenticação ou erro na API:", response.status);
                localStorage.removeItem('girassol_token'); // Limpa o token inválido
                window.location.href = loginUrl; // Envia para o login
            }

        } catch (error) {
            clearLoadingInterval();
            console.error("Erro de conexão ao buscar matches:", error);
            // Renderiza o estado de "nenhum resultado" com uma mensagem de erro
            renderResults({ matchTier: 'none', results: [] });
        }
    }

    // --- FUNÇÃO PARA MOSTRAR NOTIFICAÇÕES (TOAST) ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Remove o toast do DOM após a animação de saída
        setTimeout(() => {
            toast.remove();
        }, 4500);
    }

    // --- FUNÇÃO PARA CONTROLAR OS BOTÕES DE FAVORITO ---
    function setupFavoriteButtons() {
        const favoriteButtons = document.querySelectorAll('.heart-icon');
        favoriteButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const psychologistId = button.dataset.id;
                const token = localStorage.getItem('girassol_token');

                if (!token) {
                    window.location.href = loginUrl;
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE_URL}/api/patients/me/favorites`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ psychologistId })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        // Atualiza a UI instantaneamente
                        button.textContent = data.favorited ? '♥' : '♡';
                        button.classList.toggle('favorited', data.favorited);
                        // Mostra a notificação
                        showToast(data.message, 'success');
                    }
                } catch (error) {
                    console.error("Erro ao favoritar:", error);
                    showToast("Erro ao salvar favorito.", 'error');
                }
            });
        });
    }

    // --- INICIA O PROCESSO REAL ---
    initializePage();
});