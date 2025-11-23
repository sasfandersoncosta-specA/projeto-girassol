// Arquivo: psi_dashboard.js (VERSÃO DIAGNÓSTICO E CORREÇÃO)

document.addEventListener('DOMContentLoaded', function() {
    console.log("--- SISTEMA INICIADO ---");
    
    let psychologistData = null; 
    const mainContent = document.getElementById('main-content');
    const toastContainer = document.getElementById('toast-container');

    // --- 1. CONFIGURAÇÃO STRIPE COM PROTEÇÃO ---
    let stripe;
    let elements;
    try {
        // Sua chave pública (Test Mode)
        stripe = Stripe('pk_test_51SWdGOR73Pott0IUw2asi2NZg0DpjAOdziPGvVr8SAmys1VASh2i3EAEpErccZLYHMEWfI9hIq68xL3piRCjsvIa00MkUDANOA');
        console.log("Stripe inicializado com sucesso.");
    } catch (e) {
        console.error("ERRO CRÍTICO NO STRIPE:", e);
        alert("Erro ao carregar sistema de pagamentos. Verifique o console.");
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

    // --- 3. LÓGICA DE PAGAMENTO (MODAL E REDIRECIONAMENTO) ---
    
    // Torna acessível globalmente para os botões
    window.iniciarPagamento = async function(planType, btnElement) {
        console.log(`Botão clicado para o plano: ${planType}`); // LOG DIAGNÓSTICO
        
        const originalText = btnElement.textContent;
        btnElement.textContent = "Carregando...";
        btnElement.disabled = true;

        try {
            const cupomInput = document.getElementById('cupom-input');
            const cupomCodigo = cupomInput ? cupomInput.value.trim() : '';

            console.log("Enviando pedido ao backend..."); // LOG DIAGNÓSTICO

            const res = await apiFetch(`${API_BASE_URL}/api/payments/create-preference`, {
                method: 'POST',
                body: JSON.stringify({ planType, cupom: cupomCodigo })
            });

            const data = await res.json();
            console.log("Resposta do Backend:", data); // LOG DIAGNÓSTICO

            // A. Cupom VIP
            if (data.couponSuccess) {
                showToast(data.message, 'success');
                await fetchPsychologistData();
                loadPage('psi_assinatura.html');
                return;
            }

            // B. Stripe (Modal Transparente)
            if (data.clientSecret) {
                console.log("ClientSecret recebido. Abrindo modal...");
                abrirModalStripe(data.clientSecret);
            } else {
                throw new Error("Erro: Backend não retornou chave de pagamento.");
            }

        } catch (error) {
            console.error("ERRO NO PAGAMENTO:", error);
            showToast('Erro ao iniciar: ' + error.message, 'error');
        } finally {
            btnElement.textContent = originalText;
            btnElement.disabled = false;
        }
    };

    function abrirModalStripe(clientSecret) {
        const modal = document.getElementById('payment-modal');
        const container = document.getElementById("payment-element");
        
        // VERIFICAÇÃO DE SEGURANÇA
        if (!modal || !container) {
            console.error("ERRO: Modal ou Container não encontrados no HTML.");
            alert("Erro interno: Elemento do modal não existe na página.");
            return;
        }

        modal.style.display = 'flex';
        container.innerHTML = ''; // Limpeza crítica

        const appearance = { theme: 'stripe', variables: { colorPrimary: '#1B4332' } };
        
        try {
            elements = stripe.elements({ appearance, clientSecret });
            const paymentElement = elements.create("payment");
            paymentElement.mount("#payment-element");
        } catch (e) {
            console.error("Erro ao montar Stripe Elements:", e);
            return;
        }

        const form = document.getElementById('payment-form');
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
    }

    window.fecharModalStripe = function() {
        document.getElementById('payment-modal').style.display = 'none';
    };

    // --- 4. INICIALIZADORES DE PÁGINA ---

    function inicializarAssinatura() {
        console.log("Carregando aba Assinatura...");
        
        // Verifica se os elementos existem antes de usar
        const cardResumo = document.getElementById('card-resumo-assinatura');
        const nomePlanoEl = document.querySelector('.nome-plano-destaque');
        const precoPlanoEl = document.querySelector('.preco-destaque');
        const dataPlanoEl = document.querySelector('.data-renovacao');
        
        const temPlano = psychologistData && psychologistData.plano;
        const planoAtualDB = temPlano ? psychologistData.plano.toLowerCase() : null;
        const mapPreco = { 'semente': 'R$ 49,00 / mês', 'luz': 'R$ 99,00 / mês', 'sol': 'R$ 149,00 / mês' };

        // Configura Card de Topo
        if (temPlano && cardResumo) {
            cardResumo.style.display = 'flex';
            if(nomePlanoEl) nomePlanoEl.textContent = `Plano ${psychologistData.plano}`;
            if(precoPlanoEl) precoPlanoEl.textContent = mapPreco[planoAtualDB] || 'Valor sob consulta';
            if(dataPlanoEl) {
                const dataVenc = psychologistData.subscription_expires_at ? new Date(psychologistData.subscription_expires_at) : new Date();
                dataPlanoEl.textContent = `Renova em: ${dataVenc.toLocaleDateString('pt-BR')}`;
            }
            
            // Configura botão cancelar
            const btnCancelar = document.getElementById('btn-cancelar-assinatura');
            const modalCancel = document.getElementById('modal-cancelamento');
            
            if(btnCancelar && modalCancel) {
                // Clone para limpar eventos
                const novoBtn = btnCancelar.cloneNode(true);
                btnCancelar.parentNode.replaceChild(novoBtn, btnCancelar);
                novoBtn.onclick = () => modalCancel.style.display = 'flex';

                // Configura botões do modal de cancelamento
                const btnFechar = document.getElementById('btn-fechar-modal-cancel');
                const btnConfirmar = document.getElementById('btn-confirmar-cancelamento');
                
                if(btnFechar) btnFechar.onclick = () => modalCancel.style.display = 'none';
                
                if(btnConfirmar) {
                    const novoConfirmar = btnConfirmar.cloneNode(true);
                    btnConfirmar.parentNode.replaceChild(novoConfirmar, btnConfirmar);
                    novoConfirmar.onclick = async function() {
                        this.textContent = "Processando...";
                        try {
                            await apiFetch(`${API_BASE_URL}/api/psychologists/me/cancel-subscription`, { method: 'POST' });
                            psychologistData.plano = null;
                            modalCancel.style.display = 'none';
                            showToast('Assinatura cancelada.', 'info');
                            inicializarAssinatura(); // Recarrega a tela
                        } catch(e) {
                            showToast('Erro ao cancelar.', 'error');
                            this.textContent = "Sim, Cancelar";
                        }
                    };
                }
            }
        } else if (cardResumo) {
            cardResumo.style.display = 'none';
        }

        // Configura Botões dos Cards (Assinar Agora)
        document.querySelectorAll('.plano-card').forEach(card => {
            const btn = card.querySelector('.btn-mudar-plano');
            if (!btn) return;

            let planoDoCard = btn.getAttribute('data-plano');
            if(!planoDoCard) {
                const h2 = card.querySelector('h2');
                if(h2) {
                    if(h2.textContent.toLowerCase().includes('semente')) planoDoCard = 'Semente';
                    else if(h2.textContent.toLowerCase().includes('luz')) planoDoCard = 'Luz';
                    else if(h2.textContent.toLowerCase().includes('sol')) planoDoCard = 'Sol';
                }
            }
            const planoLower = planoDoCard ? planoDoCard.toLowerCase() : '';

            // Reset visual
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
            } else {
                btn.textContent = temPlano ? "Trocar para este" : "Assinar Agora";
                btn.disabled = false;
                btn.style.opacity = "1";
                
                // CORREÇÃO CRÍTICA: Event Listener direto
                // Removemos o cloneNode para garantir que o JS pegue o elemento atual
                btn.onclick = function(e) {
                    e.preventDefault();
                    window.iniciarPagamento(planoLower, this);
                };
            }
        });

        // Configura Cupom
        const btnCupom = document.getElementById('btn-aplicar-cupom');
        if(btnCupom) {
            btnCupom.onclick = () => window.iniciarPagamento('sol', btnCupom);
        }
    }

    // --- 5. SISTEMA DE CARREGAMENTO (LOADER) ---
    
    function loadPage(url) {
        if (!url) return;
        
        // Feedback de carregamento
        mainContent.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">Carregando...</div>';
        
        // Sincroniza menu lateral
        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        const activeLink = document.querySelector(`.sidebar-nav a[data-page="${url}"]`);
        if (activeLink) activeLink.closest('li').classList.add('active');

        console.log(`Tentando carregar página: ${url}`); // LOG DIAGNÓSTICO

        // Fetch da página HTML (Sem ./ para evitar erro de path relativo)
        fetch(url)
            .then(r => {
                if (r.ok) return r.text();
                throw new Error(`Erro HTTP: ${r.status}`);
            })
            .then(html => {
                mainContent.innerHTML = html;
                
                // Roteador Manual
                if (url.includes('meu_perfil')) inicializarLogicaDoPerfil(); // (Precisa estar definida no arquivo, traga de volta se sumiu)
                else if (url.includes('excluir_conta')) inicializarLogicaExclusao(); 
                else if (url.includes('visao_geral')) inicializarVisaoGeral(); 
                else if (url.includes('assinatura')) inicializarAssinatura();
            })
            .catch(e => {
                console.error("Erro no loadPage:", e);
                mainContent.innerHTML = `<div style="color:red; padding:20px; text-align:center;">
                    <h3>Erro ao carregar página</h3>
                    <p>Não foi possível abrir: ${url}</p>
                    <p>Detalhe: ${e.message}</p>
                </div>`;
            });
    }

    // --- INICIALIZAÇÃO GERAL ---
    
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
            throw new Error("Token inválido");
        } catch (error) {
            console.error('Auth Error:', error);
            localStorage.removeItem('girassol_token');
            window.location.href = '../login.html';
            return false;
        }
    }

    async function initializeDashboard() {
        document.getElementById('dashboard-container').style.display = 'flex';
        
        // Configura sidebar
        if (psychologistData) {
            const nameEl = document.getElementById('psi-sidebar-name');
            const imgEl = document.getElementById('psi-sidebar-photo');
            if(nameEl) nameEl.textContent = psychologistData.nome;
            if(imgEl) imgEl.src = formatImageUrl(psychologistData.fotoUrl);
        }

        // Configura links do menu
        document.querySelectorAll('.sidebar-nav a').forEach(l => {
            l.onclick = (e) => { 
                e.preventDefault(); 
                loadPage(l.getAttribute('data-page')); 
            };
        });

        // Verifica retorno da Stripe (Query Param)
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

    // Funções "Placeholder" para as páginas que não mandei código agora
    // (Você deve recolocar o código completo delas aqui se tiver apagado)
    function inicializarVisaoGeral() {
        if(document.getElementById('psi-welcome-name') && psychologistData) {
            document.getElementById('psi-welcome-name').textContent = `Olá, ${psychologistData.nome.split(' ')[0]}`;
        }
    }
    function inicializarLogicaExclusao() { /* Código da exclusão... */ }
    // Nota: Certifique-se de que 'inicializarLogicaDoPerfil' esteja no seu arquivo final
    // Se não estiver, copie do arquivo anterior que você mandou.

    // START
    fetchPsychologistData().then(ok => { if (ok) initializeDashboard(); });
});