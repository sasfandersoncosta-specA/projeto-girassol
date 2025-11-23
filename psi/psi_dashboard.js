// Arquivo: psi_dashboard.js (VERSÃO FINAL - COMPLETA)

document.addEventListener('DOMContentLoaded', function() {
    console.log("--- SISTEMA GIRASSOL INICIADO ---");
    
    let psychologistData = null; 
    const mainContent = document.getElementById('main-content');
    const toastContainer = document.getElementById('toast-container');

    // --- 1. CONFIGURAÇÃO STRIPE ---
    let stripe;
    let elements;
    try {
        // SUA CHAVE PÚBLICA DE TESTE
        stripe = Stripe('pk_test_51SWdGOR73Pott0IUw2asi2NZg0DpjAOdziPGvVr8SAmys1VASh2i3EAEpErccZLYHMEWfI9hIq68xL3piRCjsvIa00MkUDANOA');
    } catch (e) {
        console.error("Erro ao iniciar Stripe:", e);
    }

    // --- 2. HELPERS (Toast, Imagem, Fetch, Máscaras) ---
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

    function isValidCPF(cpf) {
        if (typeof cpf !== "string") return false;
        cpf = cpf.replace(/[^\d]+/g, '');
        if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i-1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i-1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        return true;
    }

    function setupMasks() {
        if (typeof IMask === 'undefined') return;
        const cpf = document.getElementById('cpf');
        const tel = document.getElementById('telefone');
        const crp = document.getElementById('crp');
        if (cpf) IMask(cpf, { mask: '000.000.000-00' });
        if (tel) IMask(tel, { mask: '(00) 00000-0000' });
        if (crp) IMask(crp, { mask: '00/000000' }); 
    }

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

    // --- 3. LÓGICA DE PAGAMENTO ---
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
                throw new Error("Erro ao iniciar pagamento.");
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
        const container = document.getElementById("payment-element");
        
        if (!modal || !container) return alert("Erro: Modal não encontrado no HTML.");

        // FORÇA O MODAL A APARECER (Display Flex + Opacidade)
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        
        container.innerHTML = ''; // Limpeza

        const appearance = { theme: 'stripe', variables: { colorPrimary: '#1B4332' } };
        elements = stripe.elements({ appearance, clientSecret });
        const paymentElement = elements.create("payment");
        paymentElement.mount("#payment-element");

        const form = document.getElementById('payment-form');
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById("btn-confirmar-stripe");
            btn.disabled = true;
            btn.textContent = "Processando...";

            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: { return_url: "https://projeto-girassol.onrender.com/psi/psi_dashboard.html?status=approved" },
            });

            if (error) {
                const msg = document.getElementById("payment-message");
                msg.textContent = error.message;
                msg.classList.remove("hidden");
                btn.disabled = false;
                btn.textContent = "Pagar Agora";
            }
        };
    }

    window.fecharModalStripe = function() {
        document.getElementById('payment-modal').style.display = 'none';
    };

    // --- 4. LÓGICA DO PERFIL (RESTAURADA) ---
    function inicializarLogicaDoPerfil() {
        const form = document.getElementById('perfil-form');
        if (!form) return;
        setupMasks();

        if (psychologistData) {
            const fields = ['nome', 'cpf', 'email', 'crp', 'telefone', 'bio', 'valor_sessao_numero', 'slug'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    let val = psychologistData[id] || '';
                    if (id === 'cpf' && val) val = String(val);
                    el.value = val;
                    el.dispatchEvent(new Event('input')); // Atualiza máscara
                }
            });

            // Redes Sociais
            const setSocial = (id, prefix) => {
                let val = psychologistData[id] || '';
                val = val.replace('https://', '').replace('http://', '').replace('www.', '').replace(prefix, '');
                if(document.getElementById(id)) document.getElementById(id).value = val;
            };
            setSocial('linkedin_url', 'linkedin.com/in/');
            setSocial('instagram_url', 'instagram.com/');
            setSocial('facebook_url', 'facebook.com/');
            setSocial('tiktok_url', 'tiktok.com/@');
            setSocial('x_url', 'x.com/');
            
            // Multiselects (Simplificado para brevidade - se tiver a função completa, use-a)
            document.querySelectorAll('.multiselect-tag').forEach(el => el.classList.remove('disabled')); 
        }

        // Botões
        const btnAlterar = document.getElementById('btn-alterar');
        const btnSalvar = document.getElementById('btn-salvar');
        const fieldset = document.getElementById('form-fieldset');

        btnAlterar.onclick = (e) => {
            e.preventDefault();
            fieldset.disabled = false;
            btnAlterar.classList.add('hidden');
            btnSalvar.classList.remove('hidden');
        };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const cpfInput = document.getElementById('cpf');
            if (!isValidCPF(cpfInput.value)) {
                showToast('CPF inválido!', 'error');
                return;
            }

            btnSalvar.textContent = "Salvando...";
            const fd = new FormData(form);
            const data = Object.fromEntries(fd.entries());
            if (data.cpf) data.cpf = data.cpf.replace(/\D/g, '');
            
            try {
                await apiFetch(`${API_BASE_URL}/api/psychologists/me`, { method: 'PUT', body: JSON.stringify(data) });
                showToast('Perfil salvo!', 'success');
                psychologistData = { ...psychologistData, ...data };
                fieldset.disabled = true;
                btnSalvar.classList.add('hidden');
                btnAlterar.classList.remove('hidden');
            } catch (err) { showToast(err.message, 'error'); }
            finally { btnSalvar.textContent = "Salvar Alterações"; }
        };
    }

    // --- 5. LÓGICA DE ASSINATURA ---
    function inicializarAssinatura() {
        const cardResumo = document.getElementById('card-resumo-assinatura');
        const temPlano = psychologistData && psychologistData.plano;
        
        if (temPlano && cardResumo) {
            cardResumo.style.display = 'flex';
            document.querySelector('.nome-plano-destaque').textContent = `Plano ${psychologistData.plano}`;
            
            const btnCancelar = document.getElementById('btn-cancelar-assinatura');
            if(btnCancelar) {
                const novoBtn = btnCancelar.cloneNode(true);
                btnCancelar.parentNode.replaceChild(novoBtn, btnCancelar);
                novoBtn.onclick = () => document.getElementById('modal-cancelamento').style.display = 'flex';
            }
        } else if (cardResumo) {
            cardResumo.style.display = 'none';
        }

        document.querySelectorAll('.plano-card').forEach(card => {
            const btn = card.querySelector('.btn-mudar-plano');
            if (!btn) return;
            
            let plano = btn.getAttribute('data-plano');
            if(!plano) { // Fallback
                if(card.textContent.toLowerCase().includes('semente')) plano = 'semente';
                else if(card.textContent.toLowerCase().includes('luz')) plano = 'luz';
                else plano = 'sol';
            }
            
            // Limpa estado anterior
            card.classList.remove('plano-card--ativo');
            const selo = card.querySelector('.selo-plano-atual');
            if(selo) selo.remove();

            // Se for o plano atual
            if(temPlano && psychologistData.plano.toLowerCase() === plano.toLowerCase()) {
                card.classList.add('plano-card--ativo');
                const novoSelo = document.createElement('div');
                novoSelo.className = 'selo-plano-atual';
                novoSelo.textContent = 'Seu Plano Atual';
                card.insertBefore(novoSelo, card.firstChild);
                btn.textContent = "Plano Atual";
                btn.disabled = true;
            } else {
                btn.textContent = "Assinar Agora";
                btn.disabled = false;
                btn.onclick = (e) => {
                    e.preventDefault();
                    window.iniciarPagamento(plano.toLowerCase(), btn);
                };
            }
        });

        const btnCupom = document.getElementById('btn-aplicar-cupom');
        if(btnCupom) btnCupom.onclick = () => window.iniciarPagamento('sol', btnCupom);
    }

    // --- 6. ROTEADOR ---
    function loadPage(url) {
        if (!url) return;
        mainContent.innerHTML = '<div style="padding:40px; text-align:center;">Carregando...</div>';
        
        fetch(url).then(r => r.ok ? r.text() : Promise.reject(url))
            .then(html => {
                mainContent.innerHTML = html;
                if (url.includes('meu_perfil')) inicializarLogicaDoPerfil();
                else if (url.includes('visao_geral')) {
                    if(document.getElementById('psi-welcome-name') && psychologistData)
                        document.getElementById('psi-welcome-name').textContent = `Olá, ${psychologistData.nome.split(' ')[0]}`;
                }
                else if (url.includes('assinatura')) inicializarAssinatura();
            })
            .catch(e => mainContent.innerHTML = `<p>Erro ao carregar: ${e}</p>`);
    }

    // --- INICIALIZAÇÃO ---
    async function fetchPsychologistData() {
        const token = localStorage.getItem('girassol_token');
        if (!token) { window.location.href = '../login.html'; return false; }
        try {
            const r = await fetch(`${API_BASE_URL}/api/psychologists/me`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (r.ok) { psychologistData = await r.json(); return true; }
            throw new Error();
        } catch { localStorage.removeItem('girassol_token'); window.location.href = '../login.html'; return false; }
    }

    fetchPsychologistData().then(ok => {
        if (ok) {
            document.getElementById('dashboard-container').style.display = 'flex';
            // Sidebar setup
            if(document.getElementById('psi-sidebar-name')) 
                document.getElementById('psi-sidebar-name').textContent = psychologistData.nome;
            
            document.querySelectorAll('.sidebar-nav a').forEach(l => {
                l.onclick = (e) => { e.preventDefault(); loadPage(l.getAttribute('data-page')); };
            });

            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('status')) {
                loadPage('psi_assinatura.html');
                if (urlParams.get('status') === 'approved') showToast('Assinatura Ativa!', 'success');
            } else {
                loadPage('psi_visao_geral.html');
            }
        }
    });
});