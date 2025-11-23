// Arquivo: psi_dashboard.js (VERSÃO FINAL - CORRIGIDA)

document.addEventListener('DOMContentLoaded', function() {
    console.log("--- SISTEMA GIRASSOL V2.0 INICIADO ---");
    
    let psychologistData = null; 
    const mainContent = document.getElementById('main-content');
    const toastContainer = document.getElementById('toast-container');

    // No topo de psi_dashboard.js, logo após as variáveis:
    function setupMasks() {
        if (typeof IMask === 'undefined') return;
        const cpf = document.getElementById('cpf');
        const tel = document.getElementById('telefone');
        const crp = document.getElementById('crp');
        if (cpf) IMask(cpf, { mask: '000.000.000-00' });
        if (tel) IMask(tel, { mask: '(00) 00000-0000' });
        if (crp) IMask(crp, { mask: '00/000000' }); 
    }

    // --- 1. CONFIGURAÇÃO STRIPE ---
    let stripe;
    let elements;
    try {
        stripe = Stripe('pk_test_51SWdGOR73Pott0IUw2asi2NZg0DpjAOdziPGvVr8SAmys1VASh2i3EAEpErccZLYHMEWfI9hIq68xL3piRCjsvIa00MkUDANOA');
    } catch (e) {
        console.error("Erro Stripe:", e);
    }

    // --- 2. HELPERS ---
    function showToast(message, type = 'success') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    function formatImageUrl(path) {
        if (!path) return 'https://placehold.co/70x70/1B4332/FFFFFF?text=Psi';
        if (path.startsWith('http')) return path; 
        let cleanPath = path.replace(/\\/g, '/');
        if (cleanPath.includes('uploads/')) cleanPath = cleanPath.substring(cleanPath.lastIndexOf('uploads/'));
        if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
        return `${API_BASE_URL}${cleanPath}`;
    }

    // --- 3. CORE FUNCTIONS (NAV E DATA) ---

    async function apiFetch(url, options = {}) {
        const token = localStorage.getItem('girassol_token');
        if (!token) throw new Error("Token não encontrado.");
        const headers = { 'Authorization': `Bearer ${token}`, ...options.headers };
        if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            localStorage.removeItem('girassol_token');
            window.location.href = '../login.html';
            throw new Error("Sessão expirada.");
        }
        return response;
    }

    async function fetchPsychologistData() {
        const token = localStorage.getItem('girassol_token');
        if (!token) { window.location.href = '../login.html'; return false; }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/psychologists/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                psychologistData = await response.json();
                atualizarInterfaceLateral(); // Atualiza sidebar assim que os dados chegam
                return true;
            }
            throw new Error("Token inválido");
        } catch (error) {
            localStorage.removeItem('girassol_token');
            window.location.href = '../login.html';
            return false;
        }
    }

    function atualizarInterfaceLateral() {
        if (!psychologistData) return;
        
        // Nome e Foto
        const nameEl = document.getElementById('psi-sidebar-name');
        const imgEl = document.getElementById('psi-sidebar-photo');
        if(nameEl) nameEl.textContent = psychologistData.nome;
        if(imgEl) imgEl.src = formatImageUrl(psychologistData.fotoUrl);

        // Link do Perfil Público (CORRIGIDO)
        const btnLink = document.getElementById('btn-view-public-profile');
        if(btnLink && psychologistData.slug) {
            // Removemos o window.location.origin para evitar duplicação se o ambiente tiver subpasta
            // Usamos apenas a barra para ir para a raiz do domínio
            const finalLink = `/${psychologistData.slug}`;
            btnLink.href = finalLink;
            // O target="_blank" no HTML já garante nova aba, mas o link tem que ser diferente da página atual
        }
    }

    function loadPage(url) {
        if (!url) return;
        mainContent.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">Carregando...</div>';
        
        // Dentro de loadPage(url)
        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));

        // Procura o link que tem o data-page igual à URL que estamos carregando
        // O seletor agora é mais específico para evitar conflitos
        const activeLink = document.querySelector(`.sidebar-nav a[data-page="${url}"]`);

        if (activeLink) {
            activeLink.closest('li').classList.add('active');
        }

        fetch(url).then(r => r.ok ? r.text() : Promise.reject(url))
            .then(html => {
                mainContent.innerHTML = html;
                if (url.includes('meu_perfil')) inicializarLogicaDoPerfil();
                else if (url.includes('visao_geral')) inicializarVisaoGeral();
                else if (url.includes('assinatura')) inicializarAssinatura();
                // Outras páginas...
            })
            .catch(e => mainContent.innerHTML = `<p>Erro ao carregar: ${e}</p>`);
    }

    // --- 4. PAGAMENTOS (STRIPE E CUPOM) ---

    window.iniciarPagamento = async function(planType, btnElement) {
        const originalText = btnElement.textContent;
        btnElement.textContent = "Carregando...";
        btnElement.disabled = true;

        try {
            const cupomInput = document.getElementById('cupom-input');
            const cupomCodigo = cupomInput ? cupomInput.value.trim() : '';

            const res = await apiFetch(`${API_BASE_URL}/api/payments/create-preference`, {
                method: 'POST', body: JSON.stringify({ planType, cupom: cupomCodigo })
            });
            const data = await res.json();

            if (data.couponSuccess) {
                showToast(data.message, 'success');
                await fetchPsychologistData();
                loadPage('psi_assinatura.html');
                return;
            }

            if (data.clientSecret) {
                abrirModalStripe(data.clientSecret);
            } else {
                throw new Error("Falha ao iniciar pagamento.");
            }
        } catch (error) {
            console.error(error);
            showToast('Erro: ' + error.message, 'error');
        } finally {
            btnElement.textContent = originalText;
            btnElement.disabled = false;
        }
    };

function abrirModalStripe(clientSecret) {
        const modal = document.getElementById('payment-modal');
        const container = document.getElementById('payment-element');
        const btnCloseX = document.getElementById('btn-close-modal-x');

        if (!modal || !container) return;

        modal.style.display = 'flex';
        modal.style.opacity = 1;
        modal.style.visibility = 'visible';
        container.innerHTML = '';
        container.style.minHeight = '64px';

        const appearance = { theme: 'stripe', labels: 'floating' };
        elements = stripe.elements({ appearance, clientSecret });

        setTimeout(() => {
            const paymentElement = elements.create('payment', { layout: 'tabs' });
            paymentElement.mount('#payment-element');
        }, 50);

        if (btnCloseX) {
            btnCloseX.onclick = (e) => {
                e.preventDefault();
                modal.style.display = 'none';
            };
        }

        const form = document.getElementById('payment-form');
        if (form) {
            form.onsubmit = async function(e) {
                e.preventDefault();
                const btn = document.getElementById('btn-confirmar-stripe');
                btn.disabled = true;
                btn.textContent = 'Processando...';
                const { error } = await stripe.confirmPayment({
                    elements,
                    confirmParams: {
                        return_url: window.location.href.split('?')[0] + '?status=approved',
                    }
                });
                if (error) {
                    btn.disabled = false;
                    btn.textContent = 'Pagar Agora';
                    document.getElementById('payment-message').textContent = error.message;
                }
            };
        }
    }
    
    window.fecharModalStripe = function() {
        document.getElementById('payment-modal').style.display = 'none';
    };

    // --- 5. PÁGINAS ESPECÍFICAS ---

    function inicializarVisaoGeral() {
        if(document.getElementById('psi-welcome-name') && psychologistData) {
            document.getElementById('psi-welcome-name').textContent = `Olá, ${psychologistData.nome.split(' ')[0]}`;
        }
    }

    function inicializarLogicaDoPerfil() {
        const form = document.getElementById('perfil-form');
        if (!form) return;
        
        // Preenche dados
        if (psychologistData) {
            const fields = ['nome', 'cpf', 'email', 'crp', 'telefone', 'bio', 'valor_sessao_numero', 'slug'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = psychologistData[id] || '';
            });
            setupMasks();
            
            // Redes sociais
            ['linkedin_url', 'instagram_url', 'facebook_url', 'tiktok_url', 'x_url'].forEach(key => {
                const el = document.getElementById(key);
                if(el && psychologistData[key]) {
                    // Remove prefixos para exibir bonito
                    let val = psychologistData[key];
                    val = val.replace('https://', '').replace('http://', '').replace('www.', '')
                             .replace('linkedin.com/in/', '').replace('instagram.com/', '')
                             .replace('facebook.com/', '').replace('tiktok.com/@', '').replace('x.com/', '');
                    el.value = val;
                }
            });
            
            // Botões
            const btnAlterar = document.getElementById('btn-alterar');
            const btnSalvar = document.getElementById('btn-salvar');
            const fieldset = document.getElementById('form-fieldset');

            btnAlterar.onclick = (e) => { e.preventDefault(); fieldset.disabled = false; btnAlterar.classList.add('hidden'); btnSalvar.classList.remove('hidden'); };
            
            form.onsubmit = async (e) => {
                e.preventDefault();
                const cpfInput = document.getElementById('cpf');
                if (!isValidCPF(cpfInput.value)) { showToast('CPF inválido!', 'error'); return; }

                btnSalvar.textContent = "Salvando...";
                const fd = new FormData(form);
                const data = Object.fromEntries(fd.entries());
                if (data.cpf) data.cpf = data.cpf.replace(/\D/g, '');

                try {
                    await apiFetch(`${API_BASE_URL}/api/psychologists/me`, { method: 'PUT', body: JSON.stringify(data) });
                    showToast('Perfil salvo!', 'success');
                    psychologistData = { ...psychologistData, ...data }; // Atualiza local
                    atualizarInterfaceLateral(); // Atualiza nome/link na lateral
                    fieldset.disabled = true;
                    btnSalvar.classList.add('hidden');
                    btnAlterar.classList.remove('hidden');
                } catch (err) { showToast(err.message, 'error'); }
                finally { btnSalvar.textContent = "Salvar Alterações"; }
            };
        }
        
        // Upload Foto
        const uploadInput = document.getElementById('profile-photo-upload');
        const imgEl = document.getElementById('psi-sidebar-photo');
        if (uploadInput && imgEl) {
            uploadInput.onchange = async (e) => {
                if(e.target.files[0]) {
                    const fd = new FormData();
                    fd.append('foto', e.target.files[0]);
                    try {
                        const res = await apiFetch(`${API_BASE_URL}/api/psychologists/me/foto`, { method: 'POST', body: fd });
                        if(res.ok) {
                            const d = await res.json();
                            psychologistData.fotoUrl = d.fotoUrl;
                            atualizarInterfaceLateral();
                            showToast('Foto atualizada!');
                        }
                    } catch (err) { showToast('Erro na foto', 'error'); }
                }
            };
        }
    }

    function inicializarAssinatura() {
        const cardResumo = document.getElementById('card-resumo-assinatura');
        const temPlano = psychologistData && psychologistData.plano;
        
        if (temPlano && cardResumo) {
            cardResumo.style.display = 'flex';
            document.querySelector('.nome-plano-destaque').textContent = `Plano ${psychologistData.plano}`;
            
            const btnCancelar = document.getElementById('btn-cancelar-assinatura');
            const modalCancel = document.getElementById('modal-cancelamento');
            
            if(btnCancelar && modalCancel) {
                const novoBtn = btnCancelar.cloneNode(true);
                btnCancelar.parentNode.replaceChild(novoBtn, btnCancelar);
                novoBtn.onclick = () => modalCancel.style.display = 'flex';

                document.getElementById('btn-fechar-modal-cancel').onclick = () => modalCancel.style.display = 'none';
                
                document.getElementById('btn-confirmar-cancelamento').onclick = async function() {
                    this.textContent = "Processando...";
                    try {
                        await apiFetch(`${API_BASE_URL}/api/psychologists/me/cancel-subscription`, { method: 'POST' });
                        psychologistData.plano = null;
                        modalCancel.style.display = 'none';
                        showToast('Assinatura cancelada.', 'info');
                        inicializarAssinatura(); 
                    } catch(e) {
                        showToast('Erro ao cancelar.', 'error');
                        this.textContent = "Sim, Cancelar";
                    }
                };
            }
        } else if (cardResumo) {
            cardResumo.style.display = 'none';
        }

        document.querySelectorAll('.plano-card').forEach(card => {
            const btn = card.querySelector('.btn-mudar-plano');
            if (!btn) return;
            
            let plano = btn.getAttribute('data-plano');
            if(!plano) {
                const text = card.textContent.toLowerCase();
                if(text.includes('semente')) plano = 'semente';
                else if(text.includes('luz')) plano = 'luz';
                else plano = 'sol';
            }
            
            card.classList.remove('plano-card--ativo');
            const selo = card.querySelector('.selo-plano-atual');
            if(selo) selo.remove();

            if(temPlano && psychologistData.plano.toLowerCase() === plano.toLowerCase()) {
                card.classList.add('plano-card--ativo');
                const novoSelo = document.createElement('div');
                novoSelo.className = 'selo-plano-atual';
                novoSelo.textContent = 'Seu Plano Atual';
                card.insertBefore(novoSelo, card.firstChild);
                btn.textContent = "Plano Atual";
                btn.disabled = true;
                btn.style.opacity = "0.5";
            } else {
                btn.textContent = "Assinar Agora";
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.onclick = (e) => {
                    e.preventDefault();
                    window.iniciarPagamento(plano.toLowerCase(), btn);
                };
            }
        });

        const btnCupom = document.getElementById('btn-aplicar-cupom');
        if(btnCupom) btnCupom.onclick = () => window.iniciarPagamento('sol', btnCupom);
    }

    // --- START ---
    fetchPsychologistData().then(ok => {
        if (ok) {
            document.getElementById('dashboard-container').style.display = 'flex';
            
            // Sidebar clicks
            document.querySelectorAll('.sidebar-nav a').forEach(l => {
                l.onclick = (e) => { e.preventDefault(); loadPage(l.getAttribute('data-page')); };
            });

            // Stripe Return
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('status')) {
                loadPage('psi_assinatura.html');
                if (urlParams.get('status') === 'approved') {
                    showToast('Pagamento Aprovado! Assinatura ativa.', 'success');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } else {
                loadPage('psi_visao_geral.html');
            }
        }
    });
});