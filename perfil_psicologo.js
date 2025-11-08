document.addEventListener('DOMContentLoaded', async () => {
    const profileContainer = document.getElementById('profile-container');
    const loadingElement = document.getElementById('loading-state');
    const errorElement = document.getElementById('error-state');

    // Função para exibir o estado de carregamento
    const showLoading = () => {
        loadingElement.classList.remove('hidden');
        profileContainer.classList.add('hidden');
        errorElement.classList.add('hidden');
    };

    // Função para exibir o estado de erro
    const showError = (message) => {
        loadingElement.classList.add('hidden');
        profileContainer.classList.add('hidden');
        errorElement.querySelector('p').textContent = message;
        errorElement.classList.remove('hidden');
    };

    // Função para exibir o perfil carregado
    const showProfile = () => {
        loadingElement.classList.add('hidden');
        errorElement.classList.add('hidden');
        profileContainer.classList.remove('hidden');
    };

    // Função para popular os dados do perfil na página
    const populateProfile = (profile) => {
        // Elementos principais
        document.getElementById('psy-name').textContent = profile.nome;
        document.getElementById('psy-crp').textContent = `CRP ${profile.crp}`;
        document.getElementById('psy-photo').src = profile.fotoUrl || 'assets/images/avatar-placeholder.png';
        document.getElementById('psy-photo').alt = `Foto de ${profile.nome}`;

        // Biografia
        document.getElementById('psy-bio').textContent = profile.bio || 'Nenhuma biografia fornecida.';

        // Valor da sessão
        document.getElementById('psy-session-value').textContent = profile.valor_sessao_numero 
            ? `R$ ${profile.valor_sessao_numero.toFixed(2).replace('.', ',')}` 
            : 'Valor a combinar';

        // Botão de contato
        const contactButton = document.getElementById('psy-contact-btn');
        if (profile.telefone) {
            const whatsappLink = `https://wa.me/55${profile.telefone.replace(/\D/g, '')}?text=Olá, ${profile.nome.split(' ')[0]}! Encontrei seu perfil na Girassol e gostaria de agendar uma conversa.`;
            contactButton.href = whatsappLink;
        } else {
            contactButton.href = '#';
            contactButton.textContent = 'Contato Indisponível';
            contactButton.classList.add('disabled');
        }

        // Tags (Temas, Abordagens, etc.)
        const tagsContainer = document.getElementById('psy-tags');
        tagsContainer.innerHTML = ''; // Limpa tags existentes

        const createTag = (text, icon) => {
            const tag = document.createElement('div');
            tag.className = 'tag-item';
            tag.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
            return tag;
        };

        if (profile.abordagens_tecnicas && profile.abordagens_tecnicas.length > 0) {
            tagsContainer.appendChild(createTag(profile.abordagens_tecnicas.join(', '), 'fa-brain'));
        }
        if (profile.temas_atuacao && profile.temas_atuacao.length > 0) {
            tagsContainer.appendChild(createTag(`Atua com: ${profile.temas_atuacao.slice(0, 2).join(', ')}`, 'fa-comment-dots'));
        }
        if (profile.praticas_vivencias && profile.praticas_vivencias.length > 0) {
            profile.praticas_vivencias.forEach(p => tagsContainer.appendChild(createTag(p, 'fa-seedling')));
        }

        // Avaliações
        const reviewsContainer = document.getElementById('psy-reviews');
        const reviewHeader = document.getElementById('review-header');
        reviewsContainer.innerHTML = '';

        if (profile.reviews && profile.reviews.length > 0) {
            reviewHeader.textContent = `Avaliações (${profile.review_count})`;
            document.getElementById('psy-avg-rating').textContent = `★ ${profile.average_rating.toFixed(1)}`;

            profile.reviews.forEach(review => {
                const reviewElement = document.createElement('div');
                reviewElement.className = 'review-card';
                reviewElement.innerHTML = `
                    <div class="review-card-header">
                        <strong>${review.patient.nome}</strong>
                        <span class="review-rating">★ ${review.rating}</span>
                    </div>
                    <p>"${review.comment}"</p>
                    <small>${new Date(review.createdAt).toLocaleDateString('pt-BR')}</small>
                `;
                reviewsContainer.appendChild(reviewElement);
            });
        } else {
            reviewHeader.textContent = 'Avaliações';
            document.getElementById('psy-avg-rating').textContent = 'Novo na plataforma';
            reviewsContainer.innerHTML = '<p>Este profissional ainda não recebeu avaliações.</p>';
        }
    };

    // Função principal para buscar e renderizar
    const fetchProfileData = async () => {
        showLoading();

        // 1. Pega o slug da URL
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('slug');

        if (!slug) {
            showError('Perfil não especificado. Verifique o link e tente novamente.');
            return;
        }

        try {
            // 2. Busca os dados na API
            const response = await fetch(`${API_BASE_URL}/api/psychologists/slug/${slug}`);

            if (response.status === 404) {
                showError('Perfil não encontrado. Este profissional pode não estar mais na plataforma.');
                return;
            }

            if (!response.ok) {
                throw new Error('Falha ao carregar os dados do perfil.');
            }

            const profileData = await response.json();

            // 3. Popula a página com os dados
            populateProfile(profileData);

            // 4. Exibe o perfil
            showProfile();

        } catch (error) {
            console.error("Erro ao buscar dados do perfil:", error);
            showError('Ocorreu um erro ao carregar o perfil. Tente novamente mais tarde.');
        }
    };

    // Inicia o processo
    fetchProfileData();
});