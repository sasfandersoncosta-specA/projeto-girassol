// Arquivo: perfil_psicologo.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Pega o ID do psicólogo da URL
    const urlParams = new URLSearchParams(window.location.search);
    const psychologistId = urlParams.get('id'); // Espera uma URL como: .../perfil_psicologo.html?id=123

    if (psychologistId) {
        fetchProfileData(psychologistId);
    } else {
        // Lidar com o caso de ID não encontrado
        document.getElementById('psi-nome').textContent = "Perfil não encontrado";
        document.getElementById('psi-bio').textContent = "O ID do psicólogo não foi fornecido na URL.";
    }

    // 2. Configura a lógica das Abas (Tabs)
    setupTabs();

    // 3. Verifica se o paciente está logado para mostrar o form de avaliação
    checkPatientLoginStatus(psychologistId);
});

/**
 * Busca os dados do psicólogo na API e preenche a página.
 */
/**
 * Busca os dados do psicólogo na API e preenche a página. (VERSÃO CORRIGIDA)
 */
async function fetchProfileData(id) {
    try {
        // ROTA DO BACKEND
        const response = await fetch(`/api/psychologists/${id}`);
        
        if (!response.ok) {
            throw new Error('Perfil não encontrado ou erro no servidor.');
        }
        
        const data = await response.json();

        // 1. Preenche o Título da Página
        document.title = `${data.nome} - Psicólogo(a) na Jano`;

        // 2. Preenche o Cabeçalho do Perfil (Info) (REQ. 2)
        document.getElementById('psi-foto').src = data.fotoUrl || 'assets/images/default-avatar.png';
        document.getElementById('psi-nome').textContent = data.nome;
        document.getElementById('psi-crp').textContent = `CRP: ${data.crp}`;

        // 3. Preenche o Card de Conversão (REQ. 2 e 3)
        // Usa 'valor_sessao_numero' do dashboard
        document.getElementById('psi-valor').textContent = data.valor_sessao_numero ? `R$ ${parseFloat(data.valor_sessao_numero).toFixed(2)}` : 'A consultar';
        document.getElementById('psi-modalidade').textContent = data.modalidade || 'Não informado';
        
        // Configura o botão do WhatsApp
        const ctaButton = document.getElementById('btn-agendar-whatsapp');
        if (data.telefone) {
            const telefoneLimpo = data.telefone.replace(/\D/g, ''); // Remove máscara ( ) -
            const nomeProfissional = data.nome.split(' ')[0];
            const mensagem = encodeURIComponent(`Olá, ${nomeProfissional}! Vi seu perfil na Jano e gostaria de agendar uma conversa.`);
            
            ctaButton.href = `https://wa.me/55${telefoneLimpo}?text=${mensagem}`;
            ctaButton.target = "_blank"; // Abre em nova aba
        } else {
            ctaButton.href = "#";
            ctaButton.style.opacity = "0.5";
            ctaButton.style.cursor = "not-allowed";
        }
        
        // 4. Preenche as Tags (usando a função auxiliar) (REQ. 2)
        populateTags('psi-tags-especialidades', data.temas_atuacao, 'tag');
        populateTags('psi-tags-abordagens', data.abordagens_tecnicas, 'small-tag');
        
        // 5. Preenche a Aba "Sobre Mim" (REQ. 1 e 2)
        document.getElementById('psi-bio').textContent = data.bio || 'Este profissional ainda não escreveu uma biografia.';
        populateTags('psi-tags-praticas', data.praticas_vivencias, 'tag');

        // 6. Preenche a Aba "Avaliações" (com os placeholders)
        renderRatingSummary(data.average_rating, data.review_count);
        renderReviews(data.reviews || []);

    } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
        document.getElementById('psi-nome').textContent = "Erro ao carregar perfil";
        document.getElementById('psi-bio').textContent = "Não foi possível carregar os dados. Tente atualizar a página.";
    }
}

/**
 * Função auxiliar para criar e injetar tags (especialidades, etc.)
 */
function populateTags(containerId, tagsArray, tagClass) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Limpa o container
    
    if (tagsArray && tagsArray.length > 0) {
        tagsArray.forEach(text => {
            const span = document.createElement('span');
            span.className = tagClass;
            span.textContent = text;
            container.appendChild(span);
        });
    } else {
        container.innerHTML = `<span class="${tagClass}" style="background-color: #f1f3f5;">Não informado</span>`;
    }
}

/**
 * Renderiza o resumo das estrelas (ex: 4.8 (12 avaliações))
 */
function renderRatingSummary(avgRating, reviewCount) {
    const container = document.getElementById('psi-rating-summary');
    container.innerHTML = ''; // Limpa
    
    const rating = parseFloat(avgRating) || 0;
    const count = parseInt(reviewCount) || 0;

    // Cria as 5 estrelas
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'star';
        // Preenche a estrela se o 'i' for menor que a nota arredondada
        if (i <= Math.round(rating)) {
            star.classList.add('filled');
        }
        star.innerHTML = '★';
        container.appendChild(star);
    }
    
    // Adiciona o texto
    const text = document.createElement('span');
    if (count > 0) {
        text.textContent = `${rating.toFixed(1)} (${count} ${count === 1 ? 'avaliação' : 'avaliações'})`;
    } else {
        text.textContent = "Nenhuma avaliação";
    }
    container.appendChild(text);
}

/**
 * Renderiza a lista de cards de avaliação
 */
function renderReviews(reviews) {
    const container = document.getElementById('reviews-list-container');
    container.innerHTML = ''; // Limpa

    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<p>Este profissional ainda não recebeu avaliações.</p>';
        return;
    }

    reviews.forEach(review => {
        const card = document.createElement('div');
        card.className = 'review-card';
        
        const rating = parseFloat(review.rating);
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            starsHTML += `<span class="star ${i <= rating ? 'filled' : ''}">★</span>`;
        }

        card.innerHTML = `
            <div class="review-header">
                <h4>${review.patient ? review.patient.nome : 'Paciente Anônimo'}</h4>
                <div class="rating-stars">${starsHTML}</div>
            </div>
            <p class="review-comment">"${review.comment}"</p>
        `;
        container.appendChild(card);
    });
}

/**
 * Configura a navegação por Abas (Tabs)
 */
function setupTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.getAttribute('data-tab');

            // Remove 'active' de todos
            tabLinks.forEach(item => item.classList.remove('active'));
            tabContents.forEach(item => item.classList.remove('active'));

            // Adiciona 'active' ao clicado
            link.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
}

/**
 * Verifica se é um paciente logado e mostra o formulário de avaliação
 */
function checkPatientLoginStatus(psychologistId) {
    // ASSUMINDO que você salva o token do PACIENTE no localStorage
    const patientToken = localStorage.getItem('patientToken');
    
    if (patientToken) {
        document.getElementById('review-form-wrapper').style.display = 'block';
        
        // Adiciona o listener para o submit do formulário
        const reviewForm = document.getElementById('review-form');
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const rating = new FormData(reviewForm).get('rating');
            const comment = new FormData(reviewForm).get('comment');
            
            if (!rating) {
                alert('Por favor, selecione uma nota (de 1 a 5 estrelas).');
                return;
            }

            try {
                // ROTA NOVA (você precisará criar no backend)
                const response = await fetch('/api/reviews', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${patientToken}`
                    },
                    body: JSON.stringify({
                        psychologistId: psychologistId,
                        rating: parseInt(rating),
                        comment: comment
                    })
                });

                if (response.ok) {
                    alert('Avaliação enviada com sucesso!');
                    window.location.reload(); // Recarrega a página para ver a nova avaliação
                } else {
                    const errorData = await response.json();
                    alert(`Erro ao enviar avaliação: ${errorData.error}`);
                }
            } catch (error) {
                console.error('Erro no submit da avaliação:', error);
                alert('Erro de conexão ao enviar avaliação.');
            }
        });
    }
}