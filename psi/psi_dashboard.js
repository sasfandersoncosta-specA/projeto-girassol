// Arquivo: psi_dashboard.js (VERSÃO FINAL - STRIPE TRANSPARENTE CORRIGIDO)

document.addEventListener('DOMContentLoaded', function() {
    
    let psychologistData = null; 
    const mainContent = document.getElementById('main-content');
    const toastContainer = document.getElementById('toast-container');

    // CONFIGURAÇÃO STRIPE (Sua chave pública validada)
    const stripe = Stripe('pk_test_51SWdGOR73Pott0IUw2asi2NZg0DpjAOdziPGvVr8SAmys1VASh2i3EAEpErccZLYHMEWfI9hIq68xL3piRCjsvIa00MkUDANOA');
    let elements;

    // --- HELPER: CORREÇÃO DE URL DE IMAGEM ---
    function formatImageUrl(path) {
        if (!path) return 'https://placehold.co/70x70/1B4332/FFFFFF?text=Psi';
        if (path.startsWith('http')) return path; 
        let cleanPath = path.replace(/\\/g, '/');
        if (cleanPath.includes('uploads/')) {
            cleanPath = cleanPath.substring(cleanPath.lastIndexOf('uploads/'));
        }
        if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
        return `${API_BASE_URL}${cleanPath}`;
    }

    // --- HELPER: VALIDAÇÃO DE CPF ---
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

    function showToast(message, type = 'success') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    async function apiFetch(url, options = {}) {
        const token = localStorage.getItem('girassol_token');
        if (!token) throw new Error("Token não encontrado.");
        
        const isFormData = options.body instanceof FormData;
        const headers = { 'Authorization': `Bearer ${token}`, ...options.headers };
        if (!isFormData) headers['Content-Type'] = 'application/json';

        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            localStorage.removeItem('girassol_token');
            window.location.href = '../login.html';
            throw new Error("Sessão inválida.");
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
                return true;
            }
            throw new Error("Sessão inválida.");
        } catch (error) {
            console.error('Auth Error:', error.message);
            localStorage.removeItem('girassol_token');
            window.location.href = '../login.html';
            return false;
        }
    }

    // --- LÓGICA DE PAGAMENTO STRIPE ---
    window.iniciarPagamento = async function(planType, btnElement) {
        const originalText = btnElement.textContent;
        btnElement.textContent = "Processando...";
        btnElement.disabled = true;

        try {
            const cupomInput = document.getElementById('cupom-input');
            const cupomCodigo = cupomInput ? cupomInput.value.trim() : '';

            const res = await apiFetch(`${API_BASE_URL}/api/payments/create-preference`, {
                method: 'POST',
                body: JSON.stringify({ planType, cupom: cupomCodigo })
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
            }

        } catch (error) {
            console.error(error);
            showToast('Erro ao iniciar pagamento.', 'error');
        } finally {
            btnElement.textContent = originalText;
            btnElement.disabled = false;
        }
    };

    window.abrirModalStripe = function(clientSecret) {
        const modal = document.getElementById('payment-modal');
        modal.style.display = 'flex';
    
        // --- A CORREÇÃO CRÍTICA ESTÁ AQUI ---
        const container = document.getElementById("payment-element");
        if (container) container.innerHTML = ''; // <--- LIMPEZA DA FAXINA
        // -------------------------------------
    
        const appearance = {
            theme: 'stripe',
            variables: { colorPrimary: '#1B4332' },
        };

        elements = stripe.elements({ appearance, clientSecret });
        const paymentElement = elements.create("payment");
        paymentElement.mount("#payment-element");

        const form = document.getElementById('payment-form');
        // Clona para remover listeners antigos
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.onsubmit = async (e) => {
            e.preventDefault();
            const btnConfirm = document.getElementById("btn-confirmar-stripe");
            btnConfirm.disabled = true;
            btnConfirm.textContent = "Processando...";

            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: "https://projeto-girassol.onrender.com/psi/psi_dashboard.html?status=approved",
                },
            });

            if (error) {
                const msg = document.getElementById("payment-message");
                msg.textContent = error.message;
                msg.classList.remove("hidden");
                btnConfirm.disabled = false;
                btnConfirm.textContent = "Pagar Agora";
            }
        };
    };

    window.fecharModalStripe = function() {
        document.getElementById('payment-modal').style.display = 'none';
    };

    // --- INICIALIZADORES DE PÁGINA ---

    function inicializarAssinatura() {
        console.log("Inicializando Assinatura...");
        const cardResumo = document.getElementById('card-resumo-assinatura');
        const nomePlanoEl = document.querySelector('.nome-plano-destaque');
        const precoPlanoEl = document.querySelector('.preco-destaque');
        const dataPlanoEl = document.querySelector('.data-renovacao');
        
        const temPlano = psychologistData && psychologistData.plano;
        const planoAtualDB = temPlano ? psychologistData.plano.toLowerCase() : null;
        const mapPreco = { 'semente': 'R$ 49,00 / mês', 'luz': 'R$ 99,00 / mês', 'sol': 'R$ 149,00 / mês' };

        if (temPlano) {
            if(cardResumo) cardResumo.style.display = 'flex';
            if(nomePlanoEl) nomePlanoEl.textContent = `Plano ${psychologistData.plano}`;
            if(precoPlanoEl) precoPlanoEl.textContent = mapPreco[planoAtualDB] || 'Valor sob consulta';
            if(dataPlanoEl) {
                const dataVenc = psychologistData.subscription_expires_at ? new Date(psychologistData.subscription_expires_at) : new Date();
                dataPlanoEl.textContent = `Renova em: ${dataVenc.toLocaleDateString('pt-BR')}`;
            }
            
            // Lógica Cancelar
            const btnCancelar = document.getElementById('btn-cancelar-assinatura');
            if(btnCancelar) {
                const novoBtn = btnCancelar.cloneNode(true);
                btnCancelar.parentNode.replaceChild(novoBtn, btnCancelar);
                novoBtn.onclick = () => document.getElementById('modal-cancelamento').style.display = 'flex';
            }
        } else {
            if(cardResumo) cardResumo.style.display = 'none';
        }

        // Botões dos Planos
        document.querySelectorAll('.plano-card').forEach(card => {
            const btn = card.querySelector('.btn-mudar-plano');
            if (!btn) return;

            let planoDoCard = btn.getAttribute('data-plano');
            if(!planoDoCard) {
                const h2 = card.querySelector('h2').textContent.toLowerCase();
                if(h2.includes('semente')) planoDoCard = 'Semente';
                else if(h2.includes('luz')) planoDoCard = 'Luz';
                else if(h2.includes('sol')) planoDoCard = 'Sol';
            }
            const planoLower = planoDoCard ? planoDoCard.toLowerCase() : '';

            card.classList.remove('plano-card--ativo');
            const selo = card.querySelector('.selo-plano-atual');
            if(selo) selo.remove();

            if (temPlano && planoAtualDB === planoLower) {
                card.classList.add('plano-card--ativo');
                const novoSelo = document.createElement('div');
                novoSelo.className = 'selo-plano-atual';
                novoSelo.textContent = 'Seu Plano Atual';
                card.insertBefore(novoSelo, card.firstChild);
                btn.textContent = "Plano Atual";
                btn.disabled = true;
                btn.style.opacity = "0.5";
                btn.style.cursor = "default";
            } else {
                btn.textContent = temPlano ? "Trocar para este" : "Assinar Agora";
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.style.cursor = "pointer";
                
                // CLIQUE DIRETO (Sem clone complexo)
                btn.onclick = (e) => {
                    e.preventDefault();
                    window.iniciarPagamento(planoLower, btn);
                };
            }
        });

        // Botão Cupom
        const btnCupom = document.getElementById('btn-aplicar-cupom');
        if(btnCupom) {
            btnCupom.onclick = () => window.iniciarPagamento('sol', btnCupom);
        }

        // Modal Cancelamento
        const btnConfirmarCancel = document.getElementById('btn-confirmar-cancelamento');
        if(btnConfirmarCancel) {
            const novoBtn = btnConfirmarCancel.cloneNode(true);
            btnConfirmarCancel.parentNode.replaceChild(novoBtn, btnConfirmarCancel);
            novoBtn.onclick = async function() {
                this.textContent = "Processando...";
                try {
                    await apiFetch(`${API_BASE_URL}/api/psychologists/me/cancel-subscription`, { method: 'POST' });
                    psychologistData.plano = null;
                    document.getElementById('modal-cancelamento').style.display = 'none';
                    showToast('Assinatura cancelada.', 'info');
                    inicializarAssinatura(); 
                } catch(e) {
                    showToast('Erro ao cancelar.', 'error');
                    this.textContent = "Sim, Cancelar";
                }
            };
        }
        const btnFecharModal = document.getElementById('btn-fechar-modal-cancel');
        if(btnFecharModal) btnFecharModal.onclick = () => document.getElementById('modal-cancelamento').style.display = 'none';
    }

    function inicializarLogicaDoPerfil() {
        // ... (Código do perfil, setupMasks, uploadFoto mantidos por brevidade se já estiverem ok)
        // Se precisar, posso colar o bloco inteiro aqui novamente, mas o foco é o pagamento.
        // Vou assumir que você tem o bloco do perfil. Se não, me avise que mando completo.
        // Para garantir, vou reinserir a lógica básica de carga:
        
        const form = document.getElementById('perfil-form');
        if (!form) return;
        setupMasks();
        // Preenchimento de dados...
        if (psychologistData) {
            const fields = ['nome', 'cpf', 'email', 'crp', 'telefone', 'bio', 'valor_sessao_numero', 'slug'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = psychologistData[id] || '';
            });
            // Social...
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
            
            // Multiselect setup...
            setupMultiselects(psychologistData);
        }
        
        // Botões
        const btnAlterar = document.getElementById('btn-alterar');
        const btnSalvar = document.getElementById('btn-salvar');
        const fieldset = document.getElementById('form-fieldset');
        
        btnAlterar.addEventListener('click', (e) => {
            e.preventDefault();
            fieldset.disabled = false;
            btnAlterar.classList.add('hidden');
            btnSalvar.classList.remove('hidden');
            document.querySelectorAll('.multiselect-tag').forEach(el => el.classList.remove('disabled'));
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Valida CPF...
            const cpfInput = document.getElementById('cpf');
            if (!isValidCPF(cpfInput.value)) {
                showToast('CPF inválido!', 'error');
                return;
            }
            
            btnSalvar.textContent = "Salvando...";
            const fd = new FormData(form);
            const data = Object.fromEntries(fd.entries());
            if (data.cpf) data.cpf = data.cpf.replace(/\D/g, '');
            
            // Multiselect get values...
            document.querySelectorAll('.multiselect-tag').forEach(dropdown => {
                const key = dropdown.id.replace('_multiselect', '');
                const vals = dropdown.getValues();
                data[key] = ['genero_identidade', 'disponibilidade_periodo'].includes(key) ? vals[0] : vals;
            });

            try {
                await apiFetch(`${API_BASE_URL}/api/psychologists/me`, { method: 'PUT', body: JSON.stringify(data) });
                showToast('Perfil salvo!', 'success');
                psychologistData = { ...psychologistData, ...data };
                fieldset.disabled = true;
                btnSalvar.classList.add('hidden');
                btnAlterar.classList.remove('hidden');
            } catch (err) { showToast(err.message, 'error'); }
            finally { btnSalvar.textContent = "Salvar Alterações"; }
        });
    }

    // --- CORE ---
    function loadPage(url) {
        if (!url) return;
        mainContent.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">Carregando...</div>';
        
        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        const activeLink = document.querySelector(`.sidebar-nav a[data-page="${url}"]`);
        if (activeLink) activeLink.closest('li').classList.add('active');

        fetch('./' + url).then(r => r.ok ? r.text() : Promise.reject(url))
            .then(html => {
                mainContent.innerHTML = html;
                if (url.includes('meu_perfil')) inicializarLogicaDoPerfil();
                else if (url.includes('excluir_conta')) inicializarLogicaExclusao(); // (Função existente no código anterior)
                else if (url.includes('visao_geral')) inicializarVisaoGeral(); // (Função existente)
                else if (url.includes('assinatura')) inicializarAssinatura();
            })
            .catch(e => mainContent.innerHTML = '<p>Erro ao carregar.</p>');
    }

    async function initializeDashboard() {
        document.getElementById('dashboard-container').style.display = 'flex';
        const imgEl = document.getElementById('psi-sidebar-photo');
        const nameEl = document.getElementById('psi-sidebar-name');
        
        if (psychologistData) {
            if(nameEl) nameEl.textContent = psychologistData.nome;
            if(imgEl) imgEl.src = formatImageUrl(psychologistData.fotoUrl);
        }

        document.querySelectorAll('.sidebar-nav a').forEach(l => {
            l.onclick = (e) => { e.preventDefault(); loadPage(l.getAttribute('data-page')); };
        });

        // Roteamento de Retorno da Stripe
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

    // INÍCIO
    fetchPsychologistData().then(ok => { if (ok) initializeDashboard(); });
});