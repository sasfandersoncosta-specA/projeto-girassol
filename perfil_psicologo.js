// perfil_psicologo.js — Versão Final (Toast + Média Corrigida)

document.addEventListener('DOMContentLoaded', async () => {
    const profileContainer = document.getElementById('profile-container');
    const loadingElement = document.getElementById('loading-state');
    const errorElement = document.getElementById('error-state');
    const toastContainer = document.getElementById('toast-container');

    // --- FUNÇÃO DE NOTIFICAÇÃO (TOAST) ---
    const showToast = (message, type = 'success') => {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        toastContainer.appendChild(toast);

        // Remove após 4 segundos
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    };

    // --- ESTADOS DA TELA ---
    const showLoading = () => {
        loadingElement.classList.remove('hidden');
        profileContainer.classList.add('hidden');
        if(errorElement) errorElement.classList.add('hidden');
    };

    const showError = (message) => {
        loadingElement.classList.add('hidden');
        profileContainer.classList.add('hidden');
        if(errorElement) {
            const p = errorElement.querySelector('p');
            if (p) p.textContent = message;
            errorElement.classList.remove('hidden');
        }
    };

    const showProfile = () => {
        loadingElement.classList.add('hidden');
        if(errorElement) errorElement.classList.add('hidden');
        profileContainer.classList.remove('hidden');
    };

    // --- 1. RENDERIZA REDES SOCIAIS ---
    const renderSocialLinks = (profile) => {
        const container = document.getElementById('psi-social-links');
        if (!container) return;
        container.innerHTML = '';

        const networks = [
            { key: 'instagram_url', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.486-.276a2.478 2.478 0 0 1-.919-.598 2.48 2.48 0 0 1-.599-.92c-.11-.281-.24-.704-.276-1.485-.038-.843-.047-1.096-.047-3.232 0-2.136.009-2.388.047-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/></svg>' },
            { key: 'linkedin_url', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.015zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/></svg>' },
            { key: 'tiktok_url', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z"/></svg>' },
            { key: 'facebook_url', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/></svg>' },
            { key: 'x_url', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/></svg>' },
            { key: 'agenda_online_url', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg>' }
        ];

        let hasLinks = false;
        networks.forEach(net => {
            if (profile[net.key] && profile[net.key].trim() !== '') {
                const a = document.createElement('a');
                a.href = profile[net.key];
                a.target = '_blank';
                a.className = 'icon-btn'; 
                a.innerHTML = net.icon;
                container.appendChild(a);
                hasLinks = true;
            }
        });
        
        const divisor = document.querySelector('.social-share-row .vertical-divider');
        if (!hasLinks) {
            if (divisor) divisor.style.display = 'none';
            container.style.display = 'none';
        } else {
             if (divisor) divisor.style.display = 'block';
             container.style.display = 'flex';
        }
    };

    // --- 2. RENDERIZA MÉDIA DE AVALIAÇÃO (CORRIGIDA PARA CALCULAR SEMPRE) ---
    const renderRatingSummary = (profile) => {
        const container = document.getElementById('psi-rating-summary');
        if (!container) return;

        let avg = 0;
        let count = 0;

        // Tenta usar dados do backend ou calcula manualmente via lista de reviews
        if (profile.reviews && profile.reviews.length > 0) {
            count = profile.reviews.length;
            const total = profile.reviews.reduce((sum, r) => sum + parseFloat(r.rating || 0), 0);
            avg = total / count;
        } 
        else if (profile.average_rating) {
            avg = parseFloat(profile.average_rating);
            count = parseInt(profile.review_count);
        }

        // Se ainda assim for 0, mostra "Novo"
        if (count === 0) {
            container.innerHTML = `
                <span style="color:#ddd; font-size: 1.2rem;">★</span>
                <span style="color:#999; font-size:0.9rem; margin-left: 5px; font-style: italic;">Novo na plataforma</span>
            `;
            container.style.display = 'flex';
            return;
        }

        // Renderiza as estrelas douradas
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.round(avg)) {
                starsHtml += '<span style="color:#f39c12;">★</span>';
            } else {
                starsHtml += '<span style="color:#ddd;">★</span>';
            }
        }

        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 5px; cursor: pointer;" onclick="document.getElementById('tab-btn-avaliacoes').click()">
                <span style="font-size: 1.2rem; letter-spacing: 1px;">${starsHtml}</span>
                <span style="font-weight: bold; color:#333; margin-left: 4px;">${avg.toFixed(1)}</span>
                <span style="color:#777; font-size: 0.9rem; text-decoration: underline;">(${count} avaliações)</span>
            </div>
        `;
        container.style.display = 'flex';
    };

    // --- 3. VERIFICAÇÃO DE LOGIN PARA AVALIAR ---
    function checkPatientLoginStatus(psychologistId) {
        const token = localStorage.getItem('girassol_token');
        
        if (token) {
            // LOGADO
            const formWrapper = document.getElementById('review-form-wrapper');
            const loginCta = document.getElementById('login-to-review-cta');
            if (formWrapper) formWrapper.style.display = 'block';
            if (loginCta) loginCta.style.display = 'none';

            const reviewForm = document.getElementById('review-form');
            if (reviewForm) {
                const newForm = reviewForm.cloneNode(true);
                reviewForm.parentNode.replaceChild(newForm, reviewForm);

                newForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const ratingEl = document.querySelector('input[name="rating"]:checked');
                    const commentEl = document.getElementById('review-comment');
                    
                    if (!ratingEl) {
                        showToast('Por favor, selecione uma nota.', 'error');
                        return;
                    }

                    try {
                        const response = await fetch('/api/reviews', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                psychologistId: psychologistId,
                                rating: parseInt(ratingEl.value),
                                comment: commentEl.value
                            })
                        });

                        if (response.ok) {
                            showToast('Avaliação enviada com sucesso!', 'success');
                            setTimeout(() => window.location.reload(), 1500);
                        } else {
                            const err = await response.json();
                            showToast(err.error || 'Erro ao enviar.', 'error');
                        }
                    } catch (error) {
                        showToast('Erro de conexão.', 'error');
                    }
                });
            }
        } else {
            // DESLOGADO
            const formWrapper = document.getElementById('review-form-wrapper');
            const loginCta = document.getElementById('login-to-review-cta');
            if (formWrapper) formWrapper.style.display = 'none';
            if (loginCta) {
                loginCta.style.display = 'block';
                const btn = document.getElementById('login-wall-btn');
                if (btn) {
                    const returnUrl = encodeURIComponent(window.location.href);
                    btn.href = `login.html?return_url=${returnUrl}`;
                }
            }
        }
    }

    // --- 4. PREENCHE O PERFIL ---
    const populateProfile = (profile) => {
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        document.getElementById('psi-nome').textContent = profile.nome || 'Nome não disponível';
        
        if (profile.status === 'active') {
            const h1 = document.getElementById('psi-nome');
            if (!h1.querySelector('.verification-badge')) {
                const badge = document.createElement('span');
                badge.className = 'verification-badge';
                badge.title = 'Perfil Verificado';
                badge.innerHTML = '✓';
                h1.appendChild(badge);
            }
        }
        
        setText('psi-crp', profile.crp ? `CRP: ${profile.crp}` : 'CRP não informado');

        const foto = document.getElementById('psi-foto');
        if (foto) {
            foto.src = profile.fotoUrl || 'assets/images/default-avatar.png';
            foto.alt = `Foto de ${profile.nome}`;
        }

        setText('psi-valor', profile.valor_sessao_numero ? `R$ ${parseFloat(profile.valor_sessao_numero).toFixed(2).replace('.', ',')}` : 'Valor a combinar');

        const modalidadeEl = document.getElementById('psi-modalidade');
        if (modalidadeEl) modalidadeEl.textContent = profile.modalidade || 'Online e Presencial';

        const locEl = document.getElementById('psi-localizacao');
        if (locEl) {
            locEl.innerHTML = '';
            if (profile.modalidade && profile.modalidade.includes('Presencial')) {
                locEl.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                    </svg>
                    <span>Consultório Presencial (São Paulo/SP)</span> 
                `;
            }
        }

        const contactButton = document.getElementById('btn-agendar-whatsapp');
        if (contactButton) {
            if (profile.telefone) {
                const clean = profile.telefone.replace(/\D/g, '');
                contactButton.href = `https://wa.me/55${clean}?text=Olá,%20encontrei%20seu%20perfil%20na%20Girassol.`;
                contactButton.textContent = 'Agendar uma conversa';
                contactButton.classList.remove('disabled');
            } else {
                contactButton.href = '#';
                contactButton.textContent = 'Contato indisponível';
                contactButton.classList.add('disabled');
            }
        }

        const fillTags = (id, items) => {
            const container = document.getElementById(id);
            if (!container) return;
            container.innerHTML = '';
            
            let tags = [];
            if (Array.isArray(items)) tags = items;
            else if (typeof items === 'string') tags = items.split(',');
            
            if (tags.length) {
                tags.forEach(item => {
                    const span = document.createElement('span');
                    span.className = 'tag'; 
                    span.textContent = item.trim();
                    container.appendChild(span);
                });
            }
        };

        renderSocialLinks(profile);
        renderRatingSummary(profile);

        // 1. Preenche o Texto da Bio no Topo (Novo Local)
        const bioElement = document.getElementById('psi-bio-text');
        if (bioElement) {
            bioElement.innerHTML = profile.bio 
                ? profile.bio.replace(/\n/g, '<br>') 
                : 'Este profissional ainda não adicionou uma biografia.';
        }

        // 2. Popula a Aba "Detalhes" (Antiga Aba Sobre) com Especialidades e Práticas
        const tabSobre = document.getElementById('tab-sobre');
        if (tabSobre) {
            
            // Helper para gerar HTML de tags
            const generateTagsHtml = (itemsStringOrArray, cssClass = 'tag') => {
                if (!itemsStringOrArray || itemsStringOrArray.length === 0) {
                    return '<span style="color:#999; font-style:italic;">Nenhuma informação.</span>';
                }
                const list = Array.isArray(itemsStringOrArray) 
                    ? itemsStringOrArray 
                    : itemsStringOrArray.split(',');
                
                return list.map(item => `<span class="${cssClass}">${item.trim()}</span>`).join('');
            };

            // --- AQUI ESTÁ A MUDANÇA ---
            // Agora TODOS usam 'practice-tag' para ter o mesmo visual moderno
            const especialidadesHtml = generateTagsHtml(profile.temas_atuacao, 'practice-tag');
            const abordagensHtml = generateTagsHtml(profile.abordagens_tecnicas, 'practice-tag');
            const praticasHtml = generateTagsHtml(profile.praticas_vivencias, 'practice-tag'); 
            // ---------------------------
            // Injeta o HTML na aba de baixo (ORDEM E TÍTULOS CORRIGIDOS)
            tabSobre.innerHTML = `
                <div class="about-section-modern">
                    
                    <h3 class="practices-title">Abordagem</h3>
                    <div class="practices-container" style="margin-bottom: 30px;">
                        ${abordagensHtml}
                    </div>

                    <h3 class="practices-title">Especialidades e Temas</h3>
                    <div class="practices-container" style="margin-bottom: 30px;">
                        ${especialidadesHtml}
                    </div>

                    <h3 class="practices-title">Práticas e Vivências Afirmativas</h3>
                    <div class="practices-container">
                        ${praticasHtml}
                    </div>
                </div>
            `;
        }

        const reviewsContainer = document.getElementById('reviews-list-container');
        const tabBtnAvaliacoes = document.getElementById('tab-btn-avaliacoes');
        
        if (reviewsContainer) {
            reviewsContainer.innerHTML = '';
            if (profile.reviews && profile.reviews.length > 0) {
                if(tabBtnAvaliacoes) tabBtnAvaliacoes.textContent = `Avaliações (${profile.reviews.length})`;
                profile.reviews.forEach((r) => {
                    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
                    const div = document.createElement('div');
                    div.className = 'review-card';
                    div.innerHTML = `
                        <div class="review-header">
                            <h4>${r.patientName || 'Paciente'}</h4>
                            <div class="rating-stars" style="color:#f39c12;">${stars}</div>
                        </div>
                        <p class="review-comment">"${r.comment}"</p>
                        <small style="color:#999;">${new Date(r.createdAt).toLocaleDateString('pt-BR')}</small>
                    `;
                    reviewsContainer.appendChild(div);
                });
            } else {
                if(tabBtnAvaliacoes) tabBtnAvaliacoes.textContent = 'Avaliações';
                reviewsContainer.innerHTML = '<p style="color:#777;">Este profissional ainda não recebeu avaliações.</p>';
            }
        }

        checkPatientLoginStatus(profile.id);
    };

    // --- SETUP SHARE ---
    const setupShareButton = () => {
        const btn = document.getElementById('share-profile-btn');
        if(!btn) return;
        btn.addEventListener('click', async () => {
            const shareData = {
                title: document.title,
                text: 'Confira este psicólogo na Plataforma Girassol!',
                url: window.location.href
            };
            if (navigator.share) {
                try { await navigator.share(shareData); } catch(e) {}
            } else {
                navigator.clipboard.writeText(window.location.href);
                showToast('Link copiado!', 'success');
            }
        });
    };

    const extractSlug = () => {
        const parts = window.location.pathname.split('/').filter(Boolean);
        const slug = parts[parts.length - 1];
        if (!slug || slug.endsWith('.html')) return null;
        return slug;
    };

    const fetchProfile = async () => {
        showLoading();
        const slug = extractSlug();
        if (!slug) {} // Lógica local

        try {
            const res = await fetch(`${API_BASE_URL}/api/psychologists/slug/${encodeURIComponent(slug)}`);
            if (res.status === 404) {
                showError('Perfil não encontrado.');
                return;
            }
            if (!res.ok) throw new Error('Erro na busca');
            const data = await res.json();
            populateProfile(data);
            showProfile();
        } catch (err) {
            console.error(err);
            showError('Erro ao carregar perfil.');
        }
    };

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

    fetchProfile();
    setupShareButton();
});