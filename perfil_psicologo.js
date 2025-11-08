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

    // --- FUNÇÃO PARA MOSTRAR NOTIFICAÇÕES (TOAST) ---
    const showToast = (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Remove o toast do DOM após a animação de saída
        setTimeout(() => toast.remove(), 4500);
    }

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

        // --- NOVO: Popula links de redes sociais ---
        const socialLinksContainer = document.getElementById('psi-social-links');
        if (socialLinksContainer) {
            socialLinksContainer.innerHTML = ''; // Limpa antes de adicionar
            const createSocialLink = (url, icon, label) => {
                if (!url) return '';
                return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="social-link" title="${label}"><img src="/assets/icons/${icon}.svg" alt="${label}"></a>`;
            };
            
            let socialHTML = '';
            socialHTML += createSocialLink(profile.linkedinUrl, 'linkedin-icon', 'LinkedIn');
            socialHTML += createSocialLink(profile.instagramUrl, 'instagram-icon', 'Instagram');
            socialHTML += createSocialLink(profile.websiteUrl, 'website-icon', 'Site Pessoal');
            
            socialLinksContainer.innerHTML = socialHTML;
        }

        // --- NOVO: Adiciona o botão de favoritar ---
        const favoritePlaceholder = document.getElementById('favorite-heart-placeholder');
        const token = localStorage.getItem('girassol_token');
        if (favoritePlaceholder && token) { // Só mostra o coração se o usuário estiver logado
            const heartIcon = profile.isFavorited ? '♥' : '♡';
            const heartClass = profile.isFavorited ? 'heart-icon favorited' : 'heart-icon';
            favoritePlaceholder.innerHTML = `<span class="${heartClass}" data-id="${profile.id}" role="button" aria-label="Favoritar">${heartIcon}</span>`;
            setupFavoriteButton();
        } else if (favoritePlaceholder) {
            // Mostra um coração "deslogado" que leva ao login
            favoritePlaceholder.innerHTML = `<a href="${loginUrl}" class="heart-icon" role="button" aria-label="Faça login para favoritar">♡</a>`;
        }

        // --- NOVO: Configura botões de compartilhamento ---
        const profileUrl = window.location.href;
        const profileName = profile.nome || 'um profissional incrível';
        const shareText = `Confira o perfil de ${profileName} na Girassol: ${profileUrl}`;

        document.getElementById('share-whatsapp').onclick = () => {
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
        };
        document.getElementById('share-facebook').onclick = () => {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`, '_blank');
        };
        document.getElementById('share-email').onclick = () => {
            window.location.href = `mailto:?subject=Recomendação de Psicólogo(a): ${profile.nome}&body=${encodeURIComponent(shareText)}`;
        };
        document.getElementById('share-copy').onclick = () => {
            navigator.clipboard.writeText(profileUrl).then(() => {
                showToast('Link copiado para a área de transferência!', 'success');
            });
        };


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

    // --- NOVO: Lógica para o botão de favoritar ---
    const setupFavoriteButton = () => {
        const button = document.querySelector('#favorite-heart-placeholder .heart-icon');
        if (!button || button.tagName === 'A') return; // Não adiciona listener se for um link para login

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
                    showToast(data.message, 'success');
                } else {
                    throw new Error('Falha ao favoritar');
                }
            } catch (error) {
                console.error("Erro ao favoritar:", error);
                showToast("Erro ao salvar favorito. Tente novamente.", 'error');
            }
        });
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
            const token = localStorage.getItem('girassol_token');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await fetch(`${API_BASE_URL}/api/psychologists/slug/${encodeURIComponent(slug)}`, {
                headers: headers
            });

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
            showProfile();
        } catch (err) {
            console.error('Erro ao carregar perfil:', err);
            showError('Ocorreu um problema ao carregar o perfil. Tente novamente mais tarde.');
        }
    };

    // --- Alternância de abas ("Sobre" / "Avaliações") ---
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
