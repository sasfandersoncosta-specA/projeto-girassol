// Arquivo: perfil_psicologo.js

document.addEventListener('DOMContentLoaded', () => {
    const profilePlaceholder = document.getElementById('profile-content-placeholder');
    const reviewsPlaceholder = document.getElementById('reviews-content-placeholder');
    const loadingIndicator = document.getElementById('perfil-loading');

    // Função para gerar as estrelas de avaliação
    function getStarRating(rating) {
        if (rating === null || rating === undefined) return '<span>Novo na plataforma</span>';
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStar;
        return '★'.repeat(fullStars) + '½'.repeat(halfStar) + '☆'.repeat(emptyStars);
    }

    // Função para renderizar o perfil principal
    function renderProfile(profile) {
        document.title = `${profile.nome} - Perfil Girassol`; // Atualiza o título da página

        const profileHTML = `
            <div class="perfil-container">
                <header class="perfil-header">
                    <div class="perfil-foto">
                        <img src="${profile.fotoUrl || 'https://placehold.co/150x150'}" alt="Foto de ${profile.nome}">
                    </div>
                    <div class="perfil-info">
                        <h1>${profile.nome}</h1>
                        <p class="crp">CRP: ${profile.crp}</p>
                        <div class="perfil-rating">
                            <span class="stars">${getStarRating(profile.average_rating)}</span>
                            <span>(${profile.review_count} ${profile.review_count === 1 ? 'avaliação' : 'avaliações'})</span>
                        </div>
                        <div class="perfil-acoes">
                            <a href="https://wa.me/55${profile.telefone}?text=Olá, encontrei seu perfil na Girassol e gostaria de mais informações." target="_blank" class="btn btn-principal">Iniciar Conversa</a>
                            <button class="btn btn-secundario">Favoritar</button>
                        </div>
                    </div>
                </header>

                <section class="perfil-secao">
                    <h2>Sobre Mim</h2>
                    <p>${profile.bio || 'Este profissional ainda não adicionou uma biografia.'}</p>
                </section>

                <section class="perfil-secao">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px;">
                        <div class="info-card">
                            <h3>Valor da Sessão</h3>
                            <p>R$ ${profile.valor_sessao_numero ? profile.valor_sessao_numero.toFixed(2).replace('.', ',') : 'N/A'}</p>
                        </div>
                        <div class="info-card">
                            <h3>Gênero</h3>
                            <p>${profile.genero_identidade || 'Não informado'}</p>
                        </div>
                        <div class="info-card">
                            <h3>Disponibilidade</h3>
                            <p>${profile.disponibilidade_periodo ? profile.disponibilidade_periodo.join(', ') : 'Não informada'}</p>
                        </div>
                    </div>
                </section>

                <section class="perfil-secao">
                    <h2>Especialidades e Abordagens</h2>
                    <h3>Principais Temas de Atuação</h3>
                    <ul class="tags-container">
                        ${profile.temas_atuacao ? profile.temas_atuacao.map(tag => `<li class="tag">${tag}</li>`).join('') : '<li>Não informado</li>'}
                    </ul>
                    <h3 style="margin-top: 20px;">Abordagem Teórica</h3>
                    <ul class="tags-container">
                        ${profile.abordagens_tecnicas ? profile.abordagens_tecnicas.map(tag => `<li class="tag">${tag}</li>`).join('') : '<li>Não informado</li>'}
                    </ul>
                    <h3 style="margin-top: 20px;">Práticas e Vivências</h3>
                    <ul class="tags-container">
                        ${profile.praticas_vivencias ? profile.praticas_vivencias.map(tag => `<li class="tag">${tag}</li>`).join('') : '<li>Não informado</li>'}
                    </ul>
                </section>
            </div>
        `;
        profilePlaceholder.innerHTML = profileHTML;
    }

    // Função para renderizar as avaliações
    function renderReviews(reviews) {
        const reviewsHTML = `
            <div class="perfil-container">
                <section class="perfil-secao">
                    <h2>Avaliações de Pacientes</h2>
                    ${reviews.length > 0 ? reviews.map(review => `
                        <div class="review-item">
                            <div class="review-header">
                                <span class="review-author">${review.patient.nome}</span>
                                <span class="stars">${getStarRating(review.rating)}</span>
                            </div>
                            <p>${review.comment}</p>
                            <div class="review-date">Publicado em: ${new Date(review.createdAt).toLocaleDateString('pt-BR')}</div>
                        </div>
                    `).join('') : '<p>Este profissional ainda não recebeu avaliações.</p>'}
                </section>
            </div>
        `;
        reviewsPlaceholder.innerHTML = reviewsHTML;
    }

    // Função principal para buscar todos os dados
    async function fetchProfileData() {
        const params = new URLSearchParams(window.location.search);
        const psychologistId = params.get('id');

        if (!psychologistId) {
            loadingIndicator.innerHTML = '<p style="text-align: center; color: red;">ID do profissional não encontrado na URL.</p>';
            return;
        }

        try {
            // Busca os dados do perfil e as avaliações em paralelo
            const [profileResponse, reviewsResponse] = await Promise.all([
                fetch(`http://localhost:3001/api/psychologists/${psychologistId}`),
                fetch(`http://localhost:3001/api/psychologists/${psychologistId}/reviews`)
            ]);

            if (!profileResponse.ok) {
                throw new Error(`Erro ao buscar perfil: ${profileResponse.statusText}`);
            }
            if (!reviewsResponse.ok) {
                throw new Error(`Erro ao buscar avaliações: ${reviewsResponse.statusText}`);
            }

            const profileData = await profileResponse.json();
            const reviewsData = await reviewsResponse.json();

            // Esconde o loading e renderiza o conteúdo
            loadingIndicator.style.display = 'none';
            renderProfile(profileData);
            renderReviews(reviewsData);

        } catch (error) {
            console.error("Falha ao carregar dados do perfil:", error);
            loadingIndicator.innerHTML = `<p style="text-align: center; color: red;">Não foi possível carregar o perfil. Tente novamente mais tarde.</p>`;
        }
    }

    fetchProfileData();
});