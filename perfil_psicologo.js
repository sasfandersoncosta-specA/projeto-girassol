document.addEventListener('DOMContentLoaded', () => {
    // Seletores dos novos placeholders
    const profileContentPlaceholder = document.getElementById('profile-content-placeholder');
    const reviewsContentPlaceholder = document.getElementById('reviews-content-placeholder');
    const loadingIndicator = document.getElementById('perfil-loading');

    // 1. Pega o ID do psicólogo da URL (ex: perfil_psicologo.html?id=123)
    const params = new URLSearchParams(window.location.search);
    const psychologistId = params.get('id');

    if (!psychologistId) {
        showError("ID do profissional não fornecido na URL.");
        return;
    }

    // Função para buscar os dados do profissional na API
    async function fetchProfileData() {
        try {
            const response = await fetch(`http://localhost:3001/api/psychologists/${psychologistId}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Profissional não encontrado.");
            }

            const profile = await response.json();
            // Renderiza o perfil e depois busca as avaliações
            renderProfile(profile);
            fetchAndRenderReviews();

        } catch (error) {
            console.error("Erro ao buscar dados do perfil:", error);
            showError(error.message);
        }
    }

    // Função para renderizar o perfil na página (agora assíncrona)
    function renderProfile(profile) {
        // Esconde o indicador de carregamento
        loadingIndicator.style.display = 'none';

        // Atualiza o título da página
        document.title = `${profile.nome} - Perfil Girassol`;

        // Helper para criar listas de tags
        const createTags = (items) => {
            if (!items || items.length === 0) return '<li>Não informado</li>';
            return items.map(item => `<li class="tag">${item}</li>`).join('');
        };
        
        // Helper para gerar estrelas
        const renderStars = (rating) => {
            return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
        };

        // Define valores padrão para o botão de favorito
        let heartIcon = '♡';
        let heartClass = 'heart-icon';

        const profileHTML = `
            <div class="perfil-container">
                <!-- CABEÇALHO DO PERFIL -->
                <header class="perfil-header">
                    <div class="perfil-foto">
                        <img src="${profile.fotoUrl || 'https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'}" alt="Foto de ${profile.nome}">
                    </div>
                    <div class="perfil-info">
                        <h1>${profile.nome}</h1>
                        <p class="crp">CRP: ${profile.crp}</p>
                        <div class="perfil-rating">
                            <span class="stars">${renderStars(profile.average_rating)}</span>
                            <span><strong>${profile.average_rating || 'N/A'}</strong> (${profile.review_count || 0} avaliações)</span>
                        </div>
                        <div class="perfil-acoes">
                            <a href="#" class="btn btn-principal">Iniciar Conversa</a>
                            <span class="${heartClass}" data-id="${profile.id}" role="button" aria-label="Favoritar">${heartIcon}</span>
                        </div>
                    </div>
                </header>

                <!-- SEÇÃO SOBRE -->
                <section class="perfil-secao">
                    <h2>Sobre</h2>
                    <p>${profile.bio || 'Biografia não informada.'}</p>
                </section>

                <!-- SEÇÃO DE DETALHES -->
                <section class="perfil-secao">
                    <h2>Detalhes</h2>
                    <div class="info-card" style="margin-bottom: 20px;">
                        <h3>Valor da Sessão</h3>
                        <p>R$ ${profile.valor_sessao_numero ? profile.valor_sessao_numero.toFixed(2).replace('.', ',') : 'A combinar'}</p>
                    </div>

                    <h3>Abordagens e Técnicas</h3>
                    <ul class="tags-container">${createTags(profile.abordagens_tecnicas)}</ul>

                    <h3 style="margin-top: 20px;">Temas de Atuação</h3>
                    <ul class="tags-container">${createTags(profile.temas_atuacao)}</ul>

                    <h3 style="margin-top: 20px;">Práticas e Vivências</h3>
                    <ul class="tags-container">${createTags(profile.praticas_vivencias)}</ul>
                </section>
            </div>
        `;

        profileContentPlaceholder.innerHTML = profileHTML;

        // Após renderizar o perfil, verifica o status de favorito e atualiza o botão
        checkFavoriteStatus();
        setupFavoriteButtons();
    }

    // Nova função para verificar e atualizar o status do botão de favorito
    async function checkFavoriteStatus() {
        const token = localStorage.getItem('girassol_token');
        if (!token) return; // Se não estiver logado, não faz nada

        try {
            const response = await fetch('http://localhost:3001/api/patients/me/favorites', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const favorites = await response.json();
            const isFavorited = favorites.some(fav => fav.id.toString() === psychologistId);

            if (isFavorited) {
                const heartButton = document.querySelector('.heart-icon');
                if (heartButton) {
                    heartButton.textContent = '♥';
                    heartButton.classList.add('favorited');
                }
            }
        } catch (error) {
            console.error("Erro ao verificar status de favorito:", error);
        }
    }

    // Função para buscar e renderizar as avaliações
    async function fetchAndRenderReviews() {
        const token = localStorage.getItem('girassol_token');
        
        try {
            const response = await fetch(`http://localhost:3001/api/psychologists/${psychologistId}/reviews`);
            const reviews = await response.json();

            let reviewsHTML = `
                <div class="perfil-container">
                    <section class="perfil-secao">
                        <h2>Avaliações</h2>`;

            if (reviews.length > 0) {
                reviews.forEach(review => {
                    reviewsHTML += `
                        <div class="review-item">
                            <div class="review-header">
                                <span class="review-author">${review.patient.nome}</span>
                                <span class="review-date">${new Date(review.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div class="perfil-rating">
                                <span class="stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
                            </div>
                            <p>${review.comment || '<i>Nenhum comentário adicionado.</i>'}</p>
                        </div>
                    `;
                });
            } else {
                reviewsHTML += '<p>Este profissional ainda não possui avaliações.</p>';
            }

            // Adiciona o formulário de avaliação se o usuário estiver logado
            if (token) {
                reviewsHTML += `
                    <div class="review-form-container">
                        <h3>Deixe sua avaliação</h3>
                        <p>Sua opinião ajuda outras pessoas a encontrarem o cuidado certo.</p>
                        <form id="review-form">
                            <div class="star-rating" data-rating="0">
                                <span class="star" data-value="1">★</span>
                                <span class="star" data-value="2">★</span>
                                <span class="star" data-value="3">★</span>
                                <span class="star" data-value="4">★</span>
                                <span class="star" data-value="5">★</span>
                            </div>
                            <textarea id="review-comment" placeholder="Conte como foi sua experiência... (opcional)"></textarea>
                            <button type="submit" class="btn btn-principal" style="margin-top: 15px;">Enviar Avaliação</button>
                            <p id="review-message" style="margin-top: 10px;"></p>
                        </form>
                    </div>
                `;
            }

            reviewsHTML += `</section></div>`;
            reviewsContentPlaceholder.innerHTML = reviewsHTML;

            // Adiciona os eventos para o formulário recém-criado
            if (token) {
                setupReviewFormEvents();
            }

        } catch (error) {
            console.error("Erro ao buscar avaliações:", error);
        }
    }

    // Função para configurar os eventos do formulário de avaliação
    function setupReviewFormEvents() {
        const form = document.getElementById('review-form');
        const starContainer = form.querySelector('.star-rating');
        const stars = form.querySelectorAll('.star');
        const messageEl = document.getElementById('review-message');

        starContainer.addEventListener('click', e => {
            if (e.target.classList.contains('star')) {
                const rating = e.target.dataset.value;
                starContainer.dataset.rating = rating;
                stars.forEach(star => {
                    star.classList.toggle('selected', star.dataset.value <= rating);
                });
            }
        });

        form.addEventListener('submit', async e => {
            e.preventDefault();
            const rating = starContainer.dataset.rating;
            const comment = document.getElementById('review-comment').value;
            const token = localStorage.getItem('girassol_token');

            if (rating === "0") {
                messageEl.textContent = "Por favor, selecione uma nota (de 1 a 5 estrelas).";
                messageEl.style.color = 'red';
                return;
            }

            try {
                const response = await fetch('http://localhost:3001/api/reviews', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        psychologistId: psychologistId,
                        rating: parseInt(rating),
                        comment: comment
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    messageEl.textContent = "Avaliação enviada com sucesso! Obrigado.";
                    messageEl.style.color = 'green';
                    form.reset();
                    starContainer.dataset.rating = "0";
                    stars.forEach(s => s.classList.remove('selected'));
                    // Recarrega as avaliações para mostrar a nova
                    fetchAndRenderReviews(); 
                } else {
                    messageEl.textContent = result.error || "Ocorreu um erro.";
                    messageEl.style.color = 'red';
                }
            } catch (error) {
                messageEl.textContent = "Erro de conexão ao enviar avaliação.";
                messageEl.style.color = 'red';
            }
        });
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

    // --- FUNÇÃO PARA CONTROLAR OS BOTÕES DE FAVORITO (REUTILIZADA) ---
    function setupFavoriteButtons() {
        const favoriteButtons = document.querySelectorAll('.heart-icon');
        favoriteButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const psychologistId = button.dataset.id;
                const token = localStorage.getItem('girassol_token');

                if (!token) {
                    // Idealmente, o usuário não deveria ver o botão se não estiver logado,
                    // mas é uma boa prática de segurança.
                    return;
                }

                try {
                    const response = await fetch('http://localhost:3001/api/patients/me/favorites', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ psychologistId })
                    });

                    if (response.ok) {
                        const data = await response.json();
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

    // Função para mostrar erros
    function showError(message) {
        loadingIndicator.style.display = 'none';
        profileContentPlaceholder.innerHTML = `
            <div class="perfil-container" style="text-align: center;">
                <h2>Erro ao carregar perfil</h2>
                <p>${message}</p>
                <a href="index.html" class="btn btn-principal">Voltar para o início</a>
            </div>
        `;
    }

    // Inicia o processo
    fetchProfileData();
});