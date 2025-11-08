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
        const errorParagraph = errorElement.querySelector('p');
        if (errorParagraph) errorParagraph.textContent = message;
        errorElement.classList.remove('hidden');
    };

    // Função para exibir o perfil carregado
    const showProfile = () => {
        loadingElement.classList.add('hidden');
        errorElement.classList.add('hidden');
        profileContainer.classList.remove('hidden');
    };

    // A FUNÇÃO CORRIGIDA (COM 'psi-')
const populateProfile = (profile) => {
    // Elementos principais
    document.getElementById('psi-nome').textContent = profile.nome;
    document.getElementById('psi-crp').textContent = `CRP ${profile.crp}`;
    const psyPhoto = document.getElementById('psi-foto'); // Renomeado no HTML, vamos usar 'psi-foto'
    psyPhoto.src = profile.fotoUrl || 'assets/images/default-avatar.png';
    psyPhoto.alt = `Foto de ${profile.nome}`;

    // Biografia
    document.getElementById('psi-bio').textContent = profile.bio || 'Nenhuma biografia fornecida.';

    // Valor da sessão
    document.getElementById('psi-valor').textContent = profile.valor_sessao_numero 
        ? `R$ ${profile.valor_sessao_numero.toFixed(2).replace('.', ',')}` 
        : 'Valor a combinar';
        
    // Modalidade (Eu vi no seu HTML que também tem esse ID)
    if (document.getElementById('psi-modalidade')) {
        document.getElementById('psi-modalidade').textContent = profile.modalidade || 'Online e Presencial';
    }

    // Botão de contato
    const contactButton = document.getElementById('btn-agendar-whatsapp');
    if (profile.telefone) {
        const whatsappLink = `https://wa.me/55${profile.telefone.replace(/\D/g, '')}?text=Olá, ${profile.nome.split(' ')[0]}! Encontrei seu perfil na Girassol e gostaria de agendar uma conversa.`;
        contactButton.href = whatsappLink;
    } else {
        contactButton.href = '#';
        contactButton.textContent = 'Contato Indisponível';
        contactButton.classList.add('disabled');
    }

    // Tags (Temas, Abordagens, etc.)
    const tagsEspecialidades = document.getElementById('psi-tags-especialidades');
    tagsEspecialidades.innerHTML = ''; // Limpa tags existentes

    const createTag = (text, iconClass) => {
        const tag = document.createElement('span'); // Usar <span> ou <div>
        tag.className = 'tag-item'; // Use a classe correta do seu CSS
        if (iconClass) {
            tag.innerHTML = `<i class="fas ${iconClass}"></i> ${text}`;
        } else {
            tag.textContent = text;
        }
        return tag;
    };
    
    // Abordagens
    const tagsAbordagens = document.getElementById('psi-tags-abordagens');
    if (tagsAbordagens && profile.abordagens_tecnicas && profile.abordagens_tecnicas.length > 0) {
        profile.abordagens_tecnicas.forEach(a => tagsAbordagens.appendChild(createTag(a)));
    }

    // Especialidades (Temas)
    if (profile.temas_atuacao && profile.temas_atuacao.length > 0) {
        profile.temas_atuacao.forEach(t => tagsEspecialidades.appendChild(createTag(t)));
    }

    // Práticas e Vivências
    const tagsPraticas = document.getElementById('psi-tags-praticas');
    if (tagsPraticas && profile.praticas_vivencias && profile.praticas_vivencias.length > 0) {
        profile.praticas_vivencias.forEach(p => tagsPraticas.appendChild(createTag(p)));
    }

    // Avaliações (O seu JS antigo não tinha, mas o HTML pedia)
    const reviewsContainer = document.getElementById('reviews-list-container');
    const reviewTabButton = document.getElementById('tab-btn-avaliacoes');
    reviewsContainer.innerHTML = '';

    if (profile.reviews && profile.reviews.length > 0) {
        reviewTabButton.textContent = `Avaliações (${profile.review_count})`;
        // Você precisa de um ID para o 'avg-rating'
        // document.getElementById('psi-avg-rating').textContent = `★ ${profile.average_rating.toFixed(1)}`;

        profile.reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.className = 'review-card'; // Use a classe correta
            reviewElement.innerHTML = `
                <div class="review-card-header">
                    <strong>${review.patient ? review.patient.nome : 'Paciente anônimo'}</strong>
                    <span class="review-rating">★ ${review.rating}</span>
                </div>
                <p>"${review.comment}"</p>
                <small>${new Date(review.createdAt).toLocaleDateString('pt-BR')}</small>
            `;
            reviewsContainer.appendChild(reviewElement);
        });
    } else {
        reviewTabButton.textContent = 'Avaliações';
        reviewsContainer.innerHTML = '<p>Este profissional ainda não recebeu avaliações.</p>';
    }
};

    // Função principal para buscar e renderizar
    const fetchProfileData = async () => {
        showLoading();

        // 1. Pega o slug da URL (CORRIGIDO)
const pathParts = window.location.pathname.split('/');
const slug = pathParts[pathParts.length - 1]; // Pega a última parte da URL
        // 1. Pega o slug do parâmetro da URL (ex: ?slug=nome-do-psi)
        const slug = new URLSearchParams(window.location.search).get('slug');

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
// ==========================================================
// CONTROLADOR DAS ABAS (Sobre Mim / Avaliações)
// ==========================================================
const tabButtons = document.querySelectorAll('.tabs-nav .tab-link');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Pega o nome da aba do atributo 'data-tab' (ex: "sobre" ou "avaliacoes")
        const tabName = button.getAttribute('data-tab');

        // 1. Remove a classe 'active' de TODOS os botões
        tabButtons.forEach(btn => btn.classList.remove('active'));
        // 2. Adiciona 'active' SÓ no botão que foi clicado
        button.classList.add('active');

        // 3. Remove a classe 'active' de TODOS os conteúdos
        tabContents.forEach(content => content.classList.remove('active'));
        // 4. Adiciona 'active' SÓ no conteúdo correspondente (ex: id="tab-avaliacoes")
        document.getElementById(`tab-${tabName}`).classList.add('active');
    });
});

// ... (Aqui vem o 'fetchProfileData();' e o '});' de fechamento)
    // Inicia o processo
    fetchProfileData();
    
});