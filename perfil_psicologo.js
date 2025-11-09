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

    const populateProfile = (profile) => {
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setText('psi-nome', profile.nome || 'Nome não disponível');
        setText('psi-crp', profile.crp ? `CRP: ${profile.crp}` : 'CRP não informado');

        const foto = document.getElementById('psi-foto');
        if (foto) {
            foto.src = profile.fotoUrl || 'assets/images/default-avatar.png';
            foto.alt = profile.nome ? `Foto de ${profile.nome}` : 'Foto do profissional';
        }

        setText('psi-bio', profile.bio || 'Biografia não disponível.');
        setText('psi-valor', profile.valor_sessao_numero
            ? `R$ ${profile.valor_sessao_numero.toFixed(2).replace('.', ',')}`
            : 'Valor a combinar');

        const modalidadeEl = document.getElementById('psi-modalidade');
        if (modalidadeEl)
            modalidadeEl.textContent = profile.modalidade || 'Online e Presencial';

        const contactButton = document.getElementById('btn-agendar-whatsapp');
        if (contactButton) {
            if (profile.telefone) {
                const clean = profile.telefone.replace(/\D/g, '');
                const link = `https://wa.me/55${clean}?text=Olá,%20${(profile.nome || '').split(' ')[0]}!%20Encontrei%20seu%20perfil%20na%20Girassol.`;
                contactButton.href = link;
                contactButton.textContent = 'Agendar uma conversa';
                contactButton.classList.remove('disabled');
            } else {
                contactButton.href = '#';
                contactButton.textContent = 'Contato indisponível';
                contactButton.classList.add('disabled');
            }
        }

        const makeTag = (text) => {
            const span = document.createElement('span');
            span.className = 'tag-item';
            span.textContent = text;
            return span;
        };

        const fillTags = (id, items) => {
            const container = document.getElementById(id);
            if (!container) return;
            container.innerHTML = '';
            if (items && items.length) {
                items.forEach((item) => container.appendChild(makeTag(item)));
            } else {
                container.appendChild(makeTag('Não informado'));
            }
        };

        fillTags('psi-tags-especialidades', profile.temas_atuacao);
        fillTags('psi-tags-abordagens', profile.abordagens_tecnicas);
        fillTags('psi-tags-praticas', profile.praticas_vivencias);

        const reviewsContainer = document.getElementById('reviews-list-container');
        const tabBtnAvaliacoes = document.getElementById('tab-btn-avaliacoes');
        if (reviewsContainer) {
            reviewsContainer.innerHTML = '';
            if (profile.reviews && profile.reviews.length > 0) {
                if (tabBtnAvaliacoes)
                    tabBtnAvaliacoes.textContent = `Avaliações (${profile.reviews.length})`;
                profile.reviews.forEach((r) => {
                    const div = document.createElement('div');
                    div.className = 'review-card';
                    div.innerHTML = `
                        <div class="review-card-header">
                            <strong>${r.patient ? r.patient.nome : 'Paciente anônimo'}</strong>
                            <span class="review-rating">★ ${r.rating}</span>
                        </div>
                        <p>${r.comment || ''}</p>
                        <small>${r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : ''}</small>
                    `;
                    reviewsContainer.appendChild(div);
                });
            } else {
                if (tabBtnAvaliacoes)
                    tabBtnAvaliacoes.textContent = 'Avaliações';
                reviewsContainer.innerHTML = '<p>Este profissional ainda não recebeu avaliações.</p>';
            }
        }
    };

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
            populateProfile(data);
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
        // ASSUMINDO que você salva o token do PACIENTE no localStorage
        const patientToken = localStorage.getItem('patientToken');
        
        if (patientToken) {
            // --- USUÁRIO LOGADO ---
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
        } else {
            // --- USUÁRIO DESLOGADO (Req 1) ---
            // Mostra o "Login Wall"
            const loginWall = document.getElementById('login-to-review-cta');
            if (loginWall) {
                loginWall.style.display = 'block';
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
});
