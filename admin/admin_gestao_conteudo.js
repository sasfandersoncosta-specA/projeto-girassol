// admin/admin_gestao_conteudo.js

window.initializePage = function() {
    const token = localStorage.getItem('girassol_token');
    const reviewsList = document.getElementById('pending-reviews-list');
    const loadingState = document.getElementById('reviews-loading-state');
    const emptyState = document.getElementById('reviews-empty-state');

    if (!reviewsList || !token) {
        console.error("Elementos essenciais ou token não encontrados.");
        return;
    }

    /**
     * Renderiza uma única avaliação na lista.
     * @param {object} review - O objeto da avaliação.
     */
    function renderReviewItem(review) {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-review-id', review.id);

        const ratingStars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

        listItem.innerHTML = `
            <div class="avaliacao-info">
                <span class="avaliacao-autor">${review.patient.nome} (para ${review.psychologist.nome})</span>
                <span class="avaliacao-data">${new Date(review.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <p class="avaliacao-texto">"${review.comment}"</p>
            <div class="avaliacao-rating">${ratingStars} (${review.rating}/5)</div>
            <div class="moderacao-acoes">
                <button class="btn-tabela btn-aprovar" data-action="approved">Aprovar</button>
                <button class="btn-tabela btn-reprovar" data-action="rejected">Rejeitar</button>
            </div>
        `;
        return listItem;
    }

    /**
     * Busca as avaliações pendentes da API e as renderiza.
     */
    async function fetchPendingReviews() {
        loadingState.style.display = 'block';
        emptyState.style.display = 'none';
        reviewsList.innerHTML = '';

        try {
            const response = await fetch('http://localhost:3001/api/admin/reviews/pending', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Falha ao buscar avaliações.');

            const reviews = await response.json();
            loadingState.style.display = 'none';
 
            if (reviews.length === 0) {
                emptyState.style.display = 'block';
            } else {
                reviews.forEach(review => {
                    reviewsList.appendChild(renderReviewItem(review));
                });
            }

        } catch (error) {
            loadingState.style.display = 'none';
            emptyState.textContent = `Erro ao carregar avaliações: ${error.message}`;
            emptyState.style.display = 'block';
        }
    }

    /**
     * Lida com o clique nos botões de moderação.
     * @param {string} reviewId - O ID da avaliação.
     * @param {string} action - 'approved' ou 'rejected'.
     */
    async function handleModeration(reviewId, action) {
        try {
            const response = await fetch(`http://localhost:3001/api/admin/reviews/${reviewId}/moderate`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: action })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            // Animação de remoção e atualização da UI
            const itemToRemove = reviewsList.querySelector(`[data-review-id="${reviewId}"]`);
            if (itemToRemove) {
                itemToRemove.style.transition = 'opacity 0.5s, transform 0.5s';
                itemToRemove.style.opacity = '0';
                itemToRemove.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    itemToRemove.remove();
                    if (reviewsList.children.length === 0) {
                        emptyState.style.display = 'block';
                    }
                }, 500);
            }

        } catch (error) {
            alert(`Erro ao moderar avaliação: ${error.message}`);
        }
    }

    // Adiciona um único event listener na lista para lidar com todos os cliques (delegação)
    reviewsList.addEventListener('click', (e) => {
        if (e.target.matches('.btn-aprovar, .btn-reprovar')) {
            const reviewItem = e.target.closest('li');
            const reviewId = reviewItem.dataset.reviewId;
            const action = e.target.dataset.action;
            handleModeration(reviewId, action);
        }
    });

    // Inicia o carregamento dos dados
    function initializeStaticPageManagement() {
        const editButtons = document.querySelectorAll('.widget .btn-tabela');

        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const pageKey = e.target.closest('tr').querySelector('td').textContent;
                
                // Simula a navegação para a página de edição, passando a chave da página como parâmetro
                // A função loadPage do seu admin.js precisaria ser ajustada para lidar com parâmetros.
                // Por enquanto, vamos fazer um redirecionamento simples.
                window.location.hash = `admin_editar_pagina.html?page=${pageKey}`;
            });
        });
    }

    fetchPendingReviews();
    initializeStaticPageManagement(); // Adiciona a inicialização dos botões de edição
};