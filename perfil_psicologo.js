// perfil_psicologo.js — versão final e corrigida
// Compatível com URLs públicas no formato: dominio.com/nome-do-psicologo

document.addEventListener('DOMContentLoaded', async () => {
    const loginUrl = 'login.html';
    const profileContainer = document.getElementById('profile-container');
    const loadingElement = document.getElementById('loading-state');
    const errorElement = document.getElementById('error-state');

    const showLoading = () => {
        loadingElement.classList.remove('hidden');
        profileContainer.classList.add('hidden');
        errorElement.classList.add('hidden');
        errorElement.classList.remove('visivel'); // <-- NOVO, remove a classe que força mostrar
    };

    const showError = (message) => {
        loadingElement.classList.add('hidden');
        profileContainer.classList.add('hidden');
        const p = errorElement.querySelector('p');
        if (p) p.textContent = message;
        errorElement.classList.remove('hidden');
    };

    const showProfile = () => {
        loadingElement.classList.add('hidden');
        errorElement.classList.add('hidden');
        errorElement.classList.remove('visivel'); // <-- NOVO, remove a classe que força mostrar
        profileContainer.classList.remove('hidden');
    };

/**
 * Busca os dados do psicólogo na API e preenche a página. (VERSÃO ATUALIZADA)
 */
async function fetchProfileData(id) {
    try {
        const response = await fetch(`/api/psychologists/${id}`);
        
        if (!response.ok) {
            throw new Error('Perfil não encontrado ou erro no servidor.');
        }
        
        const data = await response.json();

        // 1. Preenche o Título da Página
        document.title = `${data.nome} - Psicólogo(a) na Jano`;

        // 2. Preenche o Cabeçalho do Perfil (Info)
        document.getElementById('psi-foto').src = data.fotoUrl || 'assets/images/default-avatar.png';
        document.getElementById('psi-nome').textContent = data.nome;
        document.getElementById('psi-crp').textContent = `CRP: ${data.crp}`;

        // 3. Preenche o Resumo de Avaliação (Req 1)
        // (A função 'renderRatingSummary' já existe e vai usar isso)
        renderRatingSummary(data.average_rating, data.review_count);

        // 4. Preenche os Ícones de Ação (Req 2 e 4)
        populateSocialLinks(data); // Chama a nova função (ver abaixo)
        
        const blogLink = document.getElementById('psi-blog-link');
        if (blogLink && data.slug) {
            // (Assumindo que seu blog possa filtrar por slug)
            blogLink.href = `/blog.html?autor=${data.slug}`;
            blogLink.style.display = 'flex'; // Mostra o ícone
        }
        
        // 5. Preenche o Card de Conversão (Já corrigido)
        document.getElementById('psi-valor').textContent = data.valor_sessao_numero ? `R$ ${parseFloat(data.valor_sessao_numero).toFixed(2)}` : 'A consultar';
        document.getElementById('psi-modalidade').textContent = data.modalidade || 'Não informado';
        
        const ctaButton = document.getElementById('btn-agendar-whatsapp');
        if (data.telefone) {
            const telefoneLimpo = data.telefone.replace(/\D/g, ''); 
            const nomeProfissional = data.nome.split(' ')[0];
            const mensagem = encodeURIComponent(`Olá, ${nomeProfissional}! Vi seu perfil na Jano e gostaria de agendar uma conversa.`);
            
            ctaButton.href = `https://wa.me/55${telefoneLimpo}?text=${mensagem}`;
            ctaButton.target = "_blank"; 
        } else {
            ctaButton.href = "#";
            ctaButton.textContent = "Contato indisponível"; // Atualiza o texto
            ctaButton.style.opacity = "0.7";
            ctaButton.style.cursor = "not-allowed";
        }
        
        // 6. Preenche as Tags (usando a função auxiliar)
        populateTags('psi-tags-especialidades', data.temas_atuacao, 'tag');
        populateTags('psi-tags-abordagens', data.abordagens_tecnicas, 'small-tag');
        
        // 7. Preenche a Aba "Sobre Mim"
        document.getElementById('psi-bio').textContent = data.bio || 'Este profissional ainda não escreveu uma biografia.';
        populateTags('psi-tags-praticas', data.praticas_vivencias, 'tag');

        // 8. Preenche a Aba "Avaliações"
        renderReviews(data.reviews || []);

    } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
        document.getElementById('psi-nome').textContent = "Erro ao carregar perfil";
        document.getElementById('psi-bio').textContent = "Não foi possível carregar os dados. Tente atualizar a página.";
    }
}

/**
 * (NOVO) Preenche os ícones de redes sociais dinamicamente (Req 2)
 */
function populateSocialLinks(data) {
    const container = document.getElementById('psi-social-links');
    if (!container) return;
    
    // Mapeia os dados para os SVGs corretos
    const socialLinks = [
        { 
            url: data.linkedin_url, 
            title: 'LinkedIn', 
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zm-11.5 6H10v8H7.5V9zm.25-2A1.25 1.25 0 1 0 6 5.75 1.25 1.25 0 0 0 7.75 7zM17 9h-2.5c-1.9 0-2.5 1-2.5 2.5V17h-2.5V9H12v1.5c.5-1 1.5-1.5 2.5-1.5C16 9 17 10 17 11.5V17h-2.5v-5c0-.8-.2-1.5-1-1.5s-1 .7-1 1.5v5H10V11.5C10 10 11 9 12.5 9c1.2 0 2 .5 2 1.5V17z"/></svg>` 
        },
        { 
            url: data.instagram_url, 
            title: 'Instagram', 
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c2.7 0 3 .01 4.06.06 1.06.05 1.8.22 2.45.47.65.25 1.2.58 1.76.1.58.58 1 1.13 1.24 1.76.25.65.42 1.4.47 2.45.05 1.06.06 1.35.06 4.06s-.01 3-.06 4.06c-.05 1.06-.22 1.8-.47 2.45-.25.65-.58 1.2-1.1 1.76-.58.58-1.13 1-1.76 1.24-.65.25-1.4.42-2.45.47-1.06.05-1.35.06-4.06.06s-3-.01-4.06-.06c-1.06-.05-1.8-.22-2.45-.47-.65-.25-1.2-.58-1.76-1.1-.58-.58-1-1.13-1.24-1.76-.25-.65-.42-1.4-.47-2.45C2.01 15 2 14.7 2 12s.01-3 .06-4.06c.05-1.06.22-1.8.47-2.45.25.65.58 1.2 1.1-1.76.58-.58 1.13-1 1.76-1.24.65-.25 1.4-.42 2.45-.47C9 2.01 9.3 2 12 2zm0 2c-2.7 0-2.95 0-4 .05-1 .04-1.6.2-2.12.4-.54.2-.95.48-1.37.9-.4.4-.7.83-.9 1.37-.2.52-.36 1.12-.4 2.12C4.01 9.05 4 9.3 4 12s0 2.95.05 4c.04 1 .2 1.6.4 2.12.2.54.48.95.9 1.37.4.4.83.7 1.37.9.52.2 1.12.36 2.12.4C9.05 19.99 9.3 20 12 20s2.95 0 4-.05c1-.04 1.6-.2 2.12-.4.54-.2.95-.48 1.37.9.4-.4.7-.83.9-1.37.2-.52.36-1.12.4-2.12.05-1.05.05-1.3.05-4s0-2.95-.05-4c-.04-1-.2-1.6-.4-2.12-.2-.54-.48-.95-.9-1.37-.4-.4-.83-.7-1.37-.9-.52-.2-1.12-.36-2.12-.4C14.95 4.01 14.7 4 12 4zm0 3c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6.4-8.8c-.4 0-.72.32-.72.72s.32.72.72.72.72-.32.72-.72-.32-.72-.72-.72z"/></svg>`
        },
        { 
            url: data.facebook_url, 
            title: 'Facebook', 
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 5.04 3.66 9.2 8.44 9.88V15.5H8.31v-3.5h2.13v-2.67c0-2.12 1.26-3.29 3.2-3.29.9 0 1.83.16 1.83.16v2.97h-1.49c-1.05 0-1.39.62-1.39 1.35v1.98h3.33l-.53 3.5h-2.8v6.38C18.34 21.2 22 17.04 22 12z"/></svg>`
        },
        { 
            url: data.tiktok_url, 
            title: 'TikTok', 
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21.2 8.3c-.6 1.3-1.5 2.4-2.6 3.2v6.6c0 1.6-1.3 2.9-2.9 2.9H8.4c-1.6 0-2.9-1.3-2.9-2.9V6.9c0-1.6 1.3-2.9 2.9-2.9h6.6c1 .9 2.1 1.6 3.2 2.1.8.3 1.5.5 2.1.5.4 0 .8-.1 1.2-.2.3-.1.6-.2.9-.4 0 .1.1.3.1.4v.1c.1 1.2-.5 2.4-1.6 3zM10.8 15c-2.3 0-4.2-1.9-4.2-4.2V4h3.3v7c0 .5.4.9.9.9s.9-.4.9-.9V4h3.3v7c0 2.3-1.9 4.2-4.2 4.2z"/></svg>`
        },
        { 
            url: data.x_url, 
            title: 'X (Twitter)', 
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.2 4.1c.9-.7 1.6-1.5 2-2.5-.9.5-1.8.8-2.8 1.1C16.5 1.8 15.4 1 14 1c-2.6 0-4.8 2.1-4.8 4.8 0 .4 0 .7.1 1.1-4-.2-7.5-2.1-9.9-5C-.1 2.8 0 3.8 0 4.8c0 1.7.8 3.1 2.1 4-.8 0-1.5-.2-2.1-.6v.1c0 2.3 1.7 4.3 3.9 4.7-.4.1-.8.2-1.3.2-.3 0-.6 0-.9-.1.6 1.9 2.4 3.3 4.6 3.3-1.7 1.3-3.8 2.1-6.1 2.1-.4 0-.8 0-1.2-.1C1.7 21.8 3.7 23 6 23c7.2 0 11.2-6 11.2-11.2 0-.2 0-.4 0-.6.8-.6 1.4-1.3 2-2.1z"/></svg>`
        }
    ];

    socialLinks.forEach(item => {
        if (item.url) { // Só cria o ícone se o link existir
            const a = document.createElement('a');
            a.href = item.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.className = "icon-btn";
            a.title = item.title;
            a.innerHTML = item.svg;
            container.appendChild(a);
        }
    });
}

/**
 * (NOVO) Configura o botão de compartilhar (Req 3)
 */
function setupShareButton() {
    const shareBtn = document.getElementById('share-profile-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const profileName = document.getElementById('psi-nome').textContent || 'Perfil Jano';
            const url = window.location.href;

            if (navigator.share) {
                // API Web Share (Moderno, Mobile)
                navigator.share({
                    title: `Conheça ${profileName} na Jano`,
                    text: `Encontrei um(a) psicólogo(a) na Jano que pode te interessar: ${profileName}`,
                    url: url,
                })
                .catch(err => console.error('Erro ao compartilhar:', err));
            } else {
                // Fallback (Desktop - Copiar link)
                navigator.clipboard.writeText(url).then(() => {
                    alert('Link do perfil copiado para a área de transferência!');
                }, () => {
                    alert('Erro ao copiar o link.');
                });
            }
        });
    }
}

    // --- Extração de slug para URLs públicas tipo dominio.com/nome-do-psicologo ---
    const extractSlug = () => {
        const parts = window.location.pathname.split('/').filter(Boolean);
        const slug = parts[parts.length - 1];
        if (!slug || slug.endsWith('.html')) return null;
        return slug;
    };

    const fetchProfile = async () => {
        showLoading();

        const slug = extractSlug();
        if (!slug) {
            showError('Perfil não especificado. Acesse o link direto do profissional.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/psychologists/slug/${encodeURIComponent(slug)}`);

            if (res.status === 404) {
                showError('Perfil não encontrado. Este profissional pode não estar mais na plataforma.');
                return;
            }

            if (res.status === 401) {
                console.warn('401 (não autenticado) ao carregar perfil público — ignorado.');
                populateProfile({ nome: 'Informação restrita', bio: 'Perfil público protegido.' });
                showProfile();
                return;
            }

            if (!res.ok) {
                console.warn('Falha ao buscar perfil:', res.status, res.statusText);
                showError('Não foi possível carregar o perfil no momento. Tente novamente mais tarde.');
                return;
            }

            const data = await res.json();
            await fetchProfileData(data.id); // Alterado para chamar a nova função com o ID
            checkPatientLoginStatus(data.id); // Chama a verificação de login
            showProfile();
        } catch (err) {
            console.error('Erro ao carregar perfil:', err);
            showError('Ocorreu um problema ao carregar o perfil. Tente novamente mais tarde.');
        }
    };

    // --- Alternância de abas ("Sobre" / "Avaliações") ---
/**
 * Verifica se é um paciente logado e mostra o formulário de avaliação
 * OU mostra o CTA de login.
 */
function checkPatientLoginStatus(psychologistId) {
    
    // --- INÍCIO DA CORREÇÃO ---
    // 1. Procura pelo token E pelo role corretos
    const token = localStorage.getItem('girassol_token');
    const role = localStorage.getItem('girassol_role');
    // --- FIM DA CORREÇÃO ---

    // 2. Verifica se o token existe E se o usuário é um PACIENTE
    if (token && role === 'patient') {
        // --- USUÁRIO LOGADO COMO PACIENTE ---
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
                        'Authorization': `Bearer ${token}` // Usa o token correto
                    },
                    body: JSON.stringify({
                        psychologistId: psychologistId,
                        rating: parseInt(rating),
                        comment: comment
                    })
                });

                if (response.ok) {
                    alert('Avaliação enviada com sucesso!');
                    window.location.reload(); 
                } else {
                    const errorData = await response.json();
                    alert(`Erro ao enviar avaliação: ${errorData.error}`);
                }
            } catch (error) {
                console.error('Erro no submit da avaliação:', error);
                alert('Erro de conexão ao enviar avaliação.');
            }
        });
    } else {
        // --- USUÁRIO DESLOGADO (ou é um psicólogo) ---
        const loginWall = document.getElementById('login-to-review-cta');
        if (loginWall) {
            loginWall.style.display = 'block';

            const loginButton = document.getElementById('login-wall-btn');
            if (loginButton) {
                const redirectUrl = encodeURIComponent(window.location.href);
                loginButton.href = `login.html?return_url=${redirectUrl}`;
            }
        }
    }
}
    const tabButtons = document.querySelectorAll('.tabs-nav .tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            tabButtons.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            tabContents.forEach((c) => c.classList.remove('active'));
            const target = document.getElementById(`tab-${tabName}`);
            if (target) target.classList.add('active');
        });
    });

    // Inicia o carregamento
    fetchProfile();
    // 4. (LINHA NOVA) Configura o botão de compartilhar
    setupShareButton(); 
});
