// Arquivo: psi_dashboard.js (VERSÃO FINAL 2.1)

document.addEventListener('DOMContentLoaded', function() {
    console.log("--- SISTEMA GIRASSOL V2.1 INICIADO ---");
    
    let psychologistData = null; 
    
    // Variável para guardar qual plano o usuário está tentando assinar no modal
    let currentPlanAttempt = '';

    // Variável global temporária para saber qual botão disparou a ação
    let btnReativacaoAtual = null;

    const mainContent = document.getElementById('main-content');
    const toastContainer = document.getElementById('toast-container');

    // BOTÃO X FECHAR MODAL (Lógica Global Segura)
    const btnCloseX = document.getElementById('btn-close-modal-x');
    const modalPagamento = document.getElementById('payment-modal');

    if (btnCloseX && modalPagamento) {
        btnCloseX.addEventListener('click', function(e) {
            e.preventDefault();
            modalPagamento.style.setProperty('display', 'none', 'important');
        });
    }
    
    // BOTÃO APLICAR CUPOM (Lógica dentro do Modal)
    const btnAplicarModal = document.getElementById('btn-aplicar-cupom-modal');
    if (btnAplicarModal) {
        btnAplicarModal.addEventListener('click', async (e) => {
            e.preventDefault();
            const cupomVal = document.getElementById('modal-cupom-input').value;
            if(!cupomVal || !currentPlanAttempt) return;

            // Feedback visual
            btnAplicarModal.textContent = "...";
            
            // Reinicia o pagamento com o cupom aplicado
            try {
                // Fechamos o modal visualmente por 1s ou apenas recarregamos o elemento
                await window.iniciarPagamento(currentPlanAttempt, { textContent: '' }, cupomVal);
                // Nota: iniciarPagamento já cuida de remontar o Stripe Element
            } catch (err) {
                console.error(err);
            } finally {
                btnAplicarModal.textContent = "Aplicar";
            }
        });
    }

    // --- CONFIGURAÇÃO STRIPE ---
    let stripe;
    let elements;
    try {
        stripe = Stripe('pk_test_51SWdGOR73Pott0IUw2asi2NZg0DpjAOdziPGvVr8SAmys1VASh2i3EAEpErccZLYHMEWfI9hIq68xL3piRCjsvIa00MkUDANOA');
    } catch (e) { console.error("Erro Stripe:", e); }

    // --- HELPERS E FETCH ---
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

    async function fetchPsychologistData() {
        const token = localStorage.getItem('girassol_token');
        if (!token) { window.location.href = '../login.html'; return false; }
        try {
            const response = await fetch(`${API_BASE_URL}/api/psychologists/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                psychologistData = await response.json();
                atualizarInterfaceLateral(); 
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
        const nameEl = document.getElementById('psi-sidebar-name');
        const imgEl = document.getElementById('psi-sidebar-photo');
        if(nameEl) nameEl.textContent = psychologistData.nome;
        if(imgEl) imgEl.src = formatImageUrl(psychologistData.fotoUrl);
        const btnLink = document.getElementById('btn-view-public-profile');
        if(btnLink && psychologistData.slug) btnLink.href = `/${psychologistData.slug}`;
    }

    function loadPage(url) {
        if (!url) return;
        mainContent.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">Carregando...</div>';
        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        const activeLink = document.querySelector(`.sidebar-nav a[data-page="${url}"]`);
        if (activeLink) activeLink.closest('li').classList.add('active');

        fetch(url).then(r => r.ok ? r.text() : Promise.reject(url))
            .then(html => {
                mainContent.innerHTML = html;
                if (url.includes('meu_perfil')) inicializarLogicaDoPerfil();
                else if (url.includes('visao_geral')) inicializarVisaoGeral();
                else if (url.includes('assinatura')) inicializarAssinatura();
                else if (url.includes('comunidade')) inicializarComunidade(); 
            })
            .catch(e => mainContent.innerHTML = `<p>Erro ao carregar: ${e}</p>`);
    }

    // --- LÓGICA DE PAGAMENTO ---

    window.iniciarPagamento = async function(planType, btnElement, cupomForce = null) {
        // Guarda qual plano está sendo tentado para caso use o cupom
        currentPlanAttempt = planType;
        
        // Se btnElement não for um elemento DOM real (chamada via código), simulamos um obj
        const btn = btnElement.tagName ? btnElement : { textContent: '', disabled: false };
        
        const originalText = btn.textContent;
        if(btn.tagName) {
            btn.textContent = "Carregando...";
            btn.disabled = true;
        }

        try {
            // Pega cupom ou do modal ou nulo
            const cupomCodigo = cupomForce || '';

            const res = await apiFetch(`${API_BASE_URL}/api/payments/create-preference`, {
                method: 'POST', body: JSON.stringify({ planType, cupom: cupomCodigo })
            });
            const data = await res.json();

            // Se for cupom 100% que ativa direto (Backend decide)
            if (data.couponSuccess) {
                showToast(data.message, 'success');
                // Fecha modal se estiver aberto
                document.getElementById('payment-modal').style.setProperty('display', 'none', 'important');
                await fetchPsychologistData();
                loadPage('psi_assinatura.html'); // Recarrega para mostrar plano ativo
                return;
            }

            if (data.clientSecret) {
                abrirModalStripe(data.clientSecret);
                if(cupomForce) showToast('Cupom aplicado!', 'success');
            } else {
                throw new Error("Falha ao iniciar pagamento.");
            }
        } catch (error) {
            console.error(error);
            showToast('Erro: ' + error.message, 'error');
        } finally {
            if(btn.tagName) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }
    };

    function abrirModalStripe(clientSecret) {
        const modal = document.getElementById('payment-modal');
        const container = document.getElementById('payment-element');
        const form = document.getElementById('payment-form');
        const btnSubmit = document.getElementById('btn-confirmar-stripe');

        if (!modal || !container) return;

        modal.style.display = 'flex';
        modal.style.opacity = 1;
        modal.style.visibility = 'visible';
        container.innerHTML = '';

        const appearance = { theme: 'stripe', labels: 'floating' };
        elements = stripe.elements({ appearance, clientSecret });

        const paymentElement = elements.create('payment', { layout: 'tabs' });
        paymentElement.mount('#payment-element');

        // Impede duplo submit
        form.onsubmit = async (e) => {
            e.preventDefault();
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Processando...";

            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.href.split('?')[0] + '?status=approved',
                },
            });

            if (error) {
                const messageDiv = document.getElementById('payment-message');
                messageDiv.classList.remove('hidden');
                messageDiv.textContent = error.message;
                messageDiv.style.color = "red";
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Pagar Agora";
            }
        };
    }

    // --- PÁGINA ASSINATURA (CORREÇÕES VISUAIS) ---
    // Substitua toda a função 'inicializarAssinatura' por esta versão:

 function inicializarAssinatura() {
    const cardResumo = document.getElementById('card-resumo-assinatura');
    const areaCancelamento = document.getElementById('area-cancelamento');
    const temPlano = psychologistData && psychologistData.plano;

    // Tabela de preços
    const precos = { 'semente': 'R$ 99,00', 'luz': 'R$ 149,00', 'sol': 'R$ 199,00' };

    if (temPlano && cardResumo) {
        cardResumo.style.display = 'flex';
        
        // Verifica status
        const isCancelado = psychologistData.cancel_at_period_end || psychologistData.status === 'canceled' || psychologistData.cancelado_localmente;

        // Se estiver cancelado, esconde a opção de cancelar novamente
        if (areaCancelamento) {
            areaCancelamento.style.display = isCancelado ? 'none' : 'block';
        }

        // --- BANNER SUPERIOR ---
        const elNome = document.getElementById('banner-nome-plano');
        if(elNome) elNome.textContent = `Plano ${psychologistData.plano}`;
        
        const planoKey = psychologistData.plano.toLowerCase();
        const elPreco = document.getElementById('banner-preco');
        if(elPreco) elPreco.textContent = `${precos[planoKey] || 'R$ --'} / mês`;

        const elData = document.getElementById('banner-renovacao');
        const elBadge = cardResumo.querySelector('.status-badge');

        let dataDisplay;
        if (psychologistData.subscription_expires_at) {
            dataDisplay = new Date(psychologistData.subscription_expires_at);
        } else {
            const hoje = new Date();
            dataDisplay = new Date(hoje.setMonth(hoje.getMonth() + 1));
        }
        const dataFormatada = dataDisplay.toLocaleDateString('pt-BR');

        if (isCancelado) {
            // BANNER: Amarelo
            if (elData) elData.textContent = `Finaliza em: ${dataFormatada}`;
            if (elBadge) elBadge.innerHTML = `<span style="width: 8px; height: 8px; background: #FFC107; border-radius: 50%;"></span> Cancelado`;
        } else {
            // BANNER: Verde
            if (elData) elData.textContent = `Renova em: ${dataFormatada}`;
            if (elBadge) elBadge.innerHTML = `<span style="width: 8px; height: 8px; background: #4ade80; border-radius: 50%;"></span> Ativo`;
        }

        // Lógica Modal Cancelamento
        const btnCancelar = document.getElementById('btn-cancelar-assinatura');
        const modalCancel = document.getElementById('modal-cancelamento');
        
        if(btnCancelar && modalCancel && !isCancelado) {
            const novoBtn = btnCancelar.cloneNode(true);
            btnCancelar.parentNode.replaceChild(novoBtn, btnCancelar);
            
            novoBtn.onclick = (e) => { e.preventDefault(); modalCancel.style.display = 'flex'; };
            document.getElementById('btn-fechar-modal-cancel').onclick = () => modalCancel.style.display = 'none';
            
            const btnConfirmar = document.getElementById('btn-confirmar-cancelamento');
            const novoConfirmar = btnConfirmar.cloneNode(true);
            btnConfirmar.parentNode.replaceChild(novoConfirmar, btnConfirmar);

            novoConfirmar.onclick = async function() {
                this.textContent = "Processando...";
                try {
                    await apiFetch(`${API_BASE_URL}/api/psychologists/me/cancel-subscription`, { method: 'POST' });
                    psychologistData.cancel_at_period_end = true; 
                    psychologistData.cancelado_localmente = true; 
                    modalCancel.style.display = 'none';
                    showToast('Renovação cancelada.', 'info');
                    inicializarAssinatura(); 
                } catch(e) {
                    showToast('Erro: ' + e.message, 'error');
                } finally {
                    this.textContent = "Sim, Cancelar";
                }
            };
        }
    } else {
        if(cardResumo) cardResumo.style.display = 'none';
        if(areaCancelamento) areaCancelamento.style.display = 'none';
    }

    // --- CARDS E BOTÕES ---
    document.querySelectorAll('.plano-card').forEach(card => {
        const btn = card.querySelector('.btn-mudar-plano');
        if (!btn) return;
        
        let planoCard = btn.getAttribute('data-plano');
        if(!planoCard) {
            const text = card.textContent.toLowerCase();
            if(text.includes('semente')) planoCard = 'semente';
            else if(text.includes('luz')) planoCard = 'luz';
            else planoCard = 'sol';
        }

        // Limpa classes antigas
        card.classList.remove('plano-card--ativo');
        btn.classList.remove('btn-reativar'); // Limpa a classe amarela caso exista
        
        const selo = card.querySelector('.selo-plano-atual');
        if(selo) selo.remove();

        const isCurrent = temPlano && psychologistData.plano.toLowerCase() === planoCard.toLowerCase();
        const isCancelado = psychologistData.cancel_at_period_end || psychologistData.status === 'canceled' || psychologistData.cancelado_localmente;

        if(isCurrent) {
            const novoSelo = document.createElement('div');
            novoSelo.className = 'selo-plano-atual';
            novoSelo.textContent = 'Seu Plano Atual';
            novoSelo.style.cssText = "background:#1B4332; color:#fff; padding:5px 10px; border-radius:4px; margin-bottom:10px; font-size:0.8rem; display:inline-block; font-weight:bold;";
            card.insertBefore(novoSelo, card.firstChild);

            if (isCancelado) {
                // ESTADO: REATIVAR (Amarelo)
                btn.textContent = "Reativar Assinatura";
                btn.disabled = false;
                btn.classList.add('btn-reativar'); // Adiciona a classe CSS amarela
                
                // AÇÃO: Chama a função direta de reativação (SEM COBRANÇA IMEDIATA)
                btn.onclick = (e) => {
                    e.preventDefault();
                    reativarAssinatura(btn);
                };
            } else {
                // ESTADO: ATIVO (Disabled)
                btn.textContent = "Plano Atual";
                btn.disabled = true;
            }
        } else {
            // ESTADO: TROCAR (Verde)
            btn.textContent = temPlano ? "Trocar de Plano" : "Assinar Agora";
            btn.disabled = false;
            btn.onclick = (e) => {
                e.preventDefault();
                window.iniciarPagamento(planoCard.toLowerCase(), btn);
            };
        }
    });
}
function reativarAssinatura(btnElement) {
    // 1. Abre o Modal Personalizado
    const modal = document.getElementById('modal-reativacao');
    const btnFechar = document.getElementById('btn-fechar-modal-reativacao');
    const btnConfirmar = document.getElementById('btn-confirmar-reativacao');
    
    // Guarda referência do botão para mudar texto depois
    btnReativacaoAtual = btnElement;

    if (modal) {
        modal.style.display = 'flex'; // Mostra o modal
        
        // Configura o botão "Cancelar/Fechar"
        btnFechar.onclick = () => {
            modal.style.display = 'none';
        };

        // Configura o botão "Sim, Reativar"
        // (Usamos onclick direto para evitar acúmulo de listeners se a função for chamada várias vezes)
        btnConfirmar.onclick = async function() {
            // Feedback visual no botão do modal
            const textoOriginalModal = this.textContent;
            this.textContent = "Processando...";
            this.disabled = true;

            try {
                // Chama a API (Backend precisa existir!)
                const response = await apiFetch(`${API_BASE_URL}/api/psychologists/me/reactivate-subscription`, {
                    method: 'POST'
                });

                if (response.ok) {
                    showToast('Assinatura reativada com sucesso! 🌻', 'success');
                    
                    // Atualiza dados locais
                    psychologistData.cancel_at_period_end = false;
                    psychologistData.cancelado_localmente = false;
                    
                    modal.style.display = 'none';
                    
                    // Recarrega a tela para voltar ao verde
                    inicializarAssinatura();
                } else {
                    throw new Error("Falha na comunicação com o servidor.");
                }
            } catch (error) {
                console.error(error);
                // Fecha o modal para mostrar o erro na tela principal
                modal.style.display = 'none'; 
                showToast('Erro: Ainda não foi possível conectar ao servidor de pagamentos.', 'error');
            } finally {
                // Restaura botão do modal
                this.textContent = textoOriginalModal;
                this.disabled = false;
            }
        };
    }
}           
      
    // --- RESTANTE DAS FUNÇÕES (PERFIL, EXCLUIR CONTA, ETC) ---
    function inicializarVisaoGeral() {
        if(document.getElementById('psi-welcome-name') && psychologistData) {
            document.getElementById('psi-welcome-name').textContent = `Olá, ${psychologistData.nome.split(' ')[0]}`;
        }
    }
    
    function inicializarLogicaDoPerfil() {
        const form = document.getElementById('perfil-form');
        if (!form) return;
        
        if (psychologistData) {
            ['nome','cpf','email','crp','telefone','bio','valor_sessao_numero','slug'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = psychologistData[id] || '';
            });
            setupMasks();
            
            ['linkedin_url','instagram_url','facebook_url','tiktok_url','x_url'].forEach(key => {
                const el = document.getElementById(key);
                if(el && psychologistData[key]) {
                    let val = psychologistData[key].replace(/https?:\/\/(www\.)?/,'').replace(/linkedin\.com\/in\//,'').replace(/instagram\.com\//,'');
                    el.value = val;
                }
            });

            const btnAlterar = document.getElementById('btn-alterar');
            const btnSalvar = document.getElementById('btn-salvar');
            const fieldset = document.getElementById('form-fieldset');

            btnAlterar.onclick = (e) => { e.preventDefault(); fieldset.disabled = false; btnAlterar.classList.add('hidden'); btnSalvar.classList.remove('hidden'); };
            
            form.onsubmit = async (e) => {
                e.preventDefault();
                btnSalvar.textContent = "Salvando...";
                const fd = new FormData(form);
                const data = Object.fromEntries(fd.entries());
                if (data.cpf) data.cpf = data.cpf.replace(/\D/g, '');
                try {
                    await apiFetch(`${API_BASE_URL}/api/psychologists/me`, { method: 'PUT', body: JSON.stringify(data) });
                    showToast('Perfil salvo!', 'success');
                    psychologistData = { ...psychologistData, ...data };
                    atualizarInterfaceLateral();
                    fieldset.disabled = true; btnSalvar.classList.add('hidden'); btnAlterar.classList.remove('hidden');
                } catch (err) { showToast(err.message, 'error'); }
                finally { btnSalvar.textContent = "Salvar Alterações"; }
            };
        }

        const uploadInput = document.getElementById('profile-photo-upload');
        if (uploadInput) {
            uploadInput.onchange = async (e) => {
                if(e.target.files[0]) {
                    const fd = new FormData(); fd.append('foto', e.target.files[0]);
                    try {
                        const res = await apiFetch(`${API_BASE_URL}/api/psychologists/me/foto`, { method: 'POST', body: fd });
                        if(res.ok) {
                            const d = await res.json();
                            psychologistData.fotoUrl = d.fotoUrl;
                            atualizarInterfaceLateral(); showToast('Foto atualizada!');
                        }
                    } catch (err) { showToast('Erro na foto', 'error'); }
                }
            };
        }

        // --- EXCLUIR CONTA ---
        const btnExcluir = document.getElementById('btn-excluir-conta') || document.querySelector('a[href*="excluir_conta"]');
        if (btnExcluir) {
            btnExcluir.onclick = (e) => { e.preventDefault(); window.location.href = 'psi_excluir_conta.html'; };
        }
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

    // --- LÓGICA DA COMUNIDADE (Q&A) ---
    function inicializarComunidade() {
        const container = document.getElementById('qna-list-container');
        const modal = document.getElementById('qna-answer-modal');
        const form = document.getElementById('qna-answer-form');
        const textarea = document.getElementById('qna-answer-textarea');
        const charCounter = document.getElementById('qna-char-counter');
        const btnSubmit = document.getElementById('qna-submit-answer');
        let currentQuestionId = null;

        if (!container) return;

        // 1. Buscar Perguntas
        apiFetch(`${API_BASE_URL}/api/qna`) // Assume rota GET /api/qna retorna lista
            .then(async (res) => {
                if (!res.ok) throw new Error('Erro ao carregar');
                const questions = await res.json();
                renderQuestions(questions);
            })
            .catch(err => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center; padding:40px;">Erro ao carregar perguntas. Tente recarregar.</div>`;
            });

        function renderQuestions(questions) {
            container.innerHTML = ''; // Remove o spinner
            
            if (!questions || questions.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:40px; color:#666;">Nenhuma pergunta em aberto no momento.</div>`;
                return;
            }

            const template = document.getElementById('qna-card-template-psi');
            
            questions.forEach(q => {
                const clone = template.content.cloneNode(true);
                
                // Preenche dados
                clone.querySelector('.qna-question-title').textContent = q.titulo || 'Dúvida da Comunidade';
                clone.querySelector('.qna-question-content').textContent = q.conteudo;
                clone.querySelector('.qna-question-author').textContent = `Perguntado por ${q.Patient ? q.Patient.nome.split(' ')[0] : 'Anônimo'}`;

                // Botão Responder
                const btnResponder = clone.querySelector('.btn-responder');
                btnResponder.onclick = () => abrirModalResposta(q.id, q.titulo);

                // Se já respondeu (lógica visual opcional)
                if (q.respondedByMe) {
                    clone.querySelector('.badge-respondido').classList.remove('hidden');
                    btnResponder.textContent = "Responder Novamente";
                }

                container.appendChild(clone);
            });
        }

        // 2. Lógica do Modal
        function abrirModalResposta(id, titulo) {
            currentQuestionId = id;
            modal.querySelector('.modal-title').textContent = `Respondendo: ${titulo}`;
            textarea.value = '';
            charCounter.textContent = "0/50 caracteres";
            btnSubmit.disabled = true;
            // Força display flex com !important por causa do CSS global
            modal.style.setProperty('display', 'flex', 'important');
        }

        // Fechar Modal
        const fecharModal = () => modal.style.setProperty('display', 'none', 'important');
        if(modal.querySelector('.modal-close')) modal.querySelector('.modal-close').onclick = fecharModal;
        if(modal.querySelector('.modal-cancel')) modal.querySelector('.modal-cancel').onclick = fecharModal;

        // Validação de Caracteres
        textarea.oninput = () => {
            const len = textarea.value.length;
            charCounter.textContent = `${len}/50 caracteres`;
            if (len >= 50) {
                charCounter.style.color = "green";
                btnSubmit.disabled = false;
            } else {
                charCounter.style.color = "red";
                btnSubmit.disabled = true;
            }
        };

        // 3. Enviar Resposta
        form.onsubmit = async (e) => {
            e.preventDefault();
            btnSubmit.textContent = "Enviando...";
            
            try {
                await apiFetch(`${API_BASE_URL}/api/qna/${currentQuestionId}/answer`, {
                    method: 'POST',
                    body: JSON.stringify({ conteudo: textarea.value })
                });
                
                showToast('Resposta enviada com sucesso!', 'success');
                fecharModal();
                inicializarComunidade(); // Recarrega a lista
            } catch (error) {
                showToast('Erro ao enviar: ' + error.message, 'error');
            } finally {
                btnSubmit.textContent = "Enviar Resposta";
            }
        };
    }

    // INIT
    fetchPsychologistData().then(ok => {
        if (ok) {
            document.getElementById('dashboard-container').style.display = 'flex';
            document.querySelectorAll('.sidebar-nav a').forEach(l => {
                l.onclick = (e) => { e.preventDefault(); loadPage(l.getAttribute('data-page')); };
            });
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('status')) {
                loadPage('psi_assinatura.html');
                if (urlParams.get('status') === 'approved') {
                    showToast('Pagamento Aprovado!', 'success');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } else {
                loadPage('psi_visao_geral.html');
            }
        }
    });
});