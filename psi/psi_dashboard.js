// Arquivo: psi_dashboard.js (VERSÃO FINAL COM SLUG E FOTO CORRIGIDA)

document.addEventListener('DOMContentLoaded', function() {
    
    let psychologistData = null; 
    const mainContent = document.getElementById('main-content');
    const toastContainer = document.getElementById('toast-container');

    // --- HELPER: CORREÇÃO DE URL DE IMAGEM ---
    function formatImageUrl(path) {
        if (!path) return 'https://placehold.co/70x70/1B4332/FFFFFF?text=Psi';
        if (path.startsWith('http')) return path; 
        
        // Normaliza barras do Windows
        let cleanPath = path.replace(/\\/g, '/');
        
        // Remove tudo antes de 'uploads/' se existir
        if (cleanPath.includes('uploads/')) {
            cleanPath = cleanPath.substring(cleanPath.lastIndexOf('uploads/'));
        }
        
        // Garante a barra inicial
        if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
        
        return `${API_BASE_URL}${cleanPath}`;
    }
    // --- HELPER: VALIDAÇÃO DE CPF ---
function isValidCPF(cpf) {
    if (typeof cpf !== "string") return false;
    cpf = cpf.replace(/[^\d]+/g, ''); // Remove tudo que não é dígito
    
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false; // Elimina 111.111.111-11 etc

    let soma = 0;
    let resto;

    for (let i = 1; i <= 9; i++) 
        soma = soma + parseInt(cpf.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;

    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) 
        soma = soma + parseInt(cpf.substring(i-1, i)) * (12 - i);
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

    async function fetchPsychologistData() {
        await new Promise(resolve => setTimeout(resolve, 100));
        const token = localStorage.getItem('girassol_token');
        
        return new Promise(async (resolvePromise) => {
            if (!token) {
                window.location.href = '../login.html';
                resolvePromise(false); return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/api/psychologists/me`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: AbortSignal.timeout(8000) 
                });
                if (response.ok) {
                    psychologistData = await response.json();
                    resolvePromise(true);
                } else {
                    throw new Error("Sessão inválida.");
                }
            } catch (error) {
                console.error('Auth Error:', error.message);
                localStorage.removeItem('girassol_token');
                window.location.href = '../login.html';
                resolvePromise(false);
            }
        });
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

    function setupMasks() {
        if (typeof IMask === 'undefined') return;
        const cpf = document.getElementById('cpf');
        const tel = document.getElementById('telefone');
        const crp = document.getElementById('crp');
        if (cpf) IMask(cpf, { mask: '000.000.000-00' });
        if (tel) IMask(tel, { mask: '(00) 00000-0000' });
        if (crp) IMask(crp, { mask: '00/000000' }); 
    }

    function setupMultiselects(dataInicial) {
        document.querySelectorAll('.multiselect-tag').forEach(dropdown => {
            const display = dropdown.querySelector('.multiselect-display');
            const options = dropdown.querySelectorAll('.option');
            const dataKey = dropdown.id.replace('_multiselect', '');
            dropdown._selectedValues = [];

            if (dataInicial && dataInicial[dataKey]) {
                let savedData = dataInicial[dataKey];
                if (!Array.isArray(savedData)) {
                    savedData = typeof savedData === 'string' ? savedData.split(',') : [savedData];
                }
                dropdown._selectedValues = savedData.map(s => s && s.trim()).filter(s => s);
                renderTags();
            }

            function renderTags() {
                if (!display) return;
                display.innerHTML = '';
                dropdown._selectedValues.forEach(val => {
                    const tag = document.createElement('span');
                    tag.className = 'tag';
                    tag.innerHTML = `${val} <button type="button" class="remove-tag" data-val="${val}">&times;</button>`;
                    display.appendChild(tag);
                });
                options.forEach(opt => opt.classList.toggle('selected', dropdown._selectedValues.includes(opt.dataset.value)));
            }

            if (display) {
                display.addEventListener('click', (e) => {
                    if (e.target.classList.contains('remove-tag')) {
                        if (dropdown.closest('fieldset').disabled) return;
                        const val = e.target.dataset.val;
                        dropdown._selectedValues = dropdown._selectedValues.filter(v => v !== val);
                        renderTags();
                        return;
                    }
                    if (!dropdown.closest('fieldset').disabled) dropdown.classList.toggle('open');
                });
            }

            options.forEach(opt => {
                opt.addEventListener('click', () => {
                    const val = opt.dataset.value;
                    const isSingle = dropdown.dataset.singleSelect === "true";
                    if (isSingle) {
                        dropdown._selectedValues = [val]; 
                        dropdown.classList.remove('open');
                    } else {
                        if (dropdown._selectedValues.includes(val)) dropdown._selectedValues = dropdown._selectedValues.filter(v => v !== val);
                        else dropdown._selectedValues.push(val);
                    }
                    renderTags();
                });
            });
            document.addEventListener('click', (e) => { if (!dropdown.contains(e.target)) dropdown.classList.remove('open'); });
            dropdown.getValues = () => dropdown._selectedValues || [];
        });
    }

    // =====================================================================
    // LÓGICA DA PÁGINA: MEU PERFIL (ATUALIZADA)
    // =====================================================================
    function inicializarLogicaDoPerfil() {
        const form = document.getElementById('perfil-form');
        const fieldset = document.getElementById('form-fieldset');
        const btnAlterar = document.getElementById('btn-alterar');
        const btnSalvar = document.getElementById('btn-salvar');

        if (!form) return;

        setupMasks();

        // 1. Preencher campos
        if (psychologistData) {
            
            // DEBUG: Vamos ver no console o que diabo o banco está devolvendo
            console.log("DADOS RECEBIDOS DO BANCO:", psychologistData); 

            const fields = ['nome', 'cpf', 'email', 'crp', 'telefone', 'bio', 'valor_sessao_numero', 'slug'];
            
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    let valor = psychologistData[id] || '';
                    
                    // TRUQUE: Se for o CPF e vier só números, vamos tentar formatar "na marra" 
                    // para a máscara não se perder, ou pelo menos garantir que é string.
                    if (id === 'cpf' && valor) {
                        valor = String(valor); 
                    }

                    el.value = valor;
                    
                    // O PULO DO GATO: Dispara um evento para avisar a máscara que o valor mudou
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            const setSocial = (id, prefix) => {
                let val = psychologistData[id] || '';
                val = val.replace('https://', '').replace('http://', '').replace('www.', '').replace(prefix, '');
                if(document.getElementById(id)) document.getElementById(id).value = val;
            };
            
            // Removido setSocial para agenda_online
            setSocial('linkedin_url', 'linkedin.com/in/');
            setSocial('instagram_url', 'instagram.com/');
            setSocial('facebook_url', 'facebook.com/');
            setSocial('tiktok_url', 'tiktok.com/@');
            setSocial('x_url', 'x.com/');

            setupMultiselects(psychologistData);
        }

        // ... (Resto do código de botões e submit permanece igual)
        btnAlterar.addEventListener('click', (e) => {
            e.preventDefault();
            fieldset.disabled = false;
            btnAlterar.classList.add('hidden');
            btnSalvar.classList.remove('hidden');
            document.querySelectorAll('.multiselect-tag').forEach(el => el.classList.remove('disabled'));
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // --- NOVO CÓDIGO: VALIDAÇÃO DE CPF ---
            const cpfInput = document.getElementById('cpf');
            const cpfValue = cpfInput.value;
            
            if (!isValidCPF(cpfValue)) {
                showToast('CPF inválido! Verifique os números.', 'error');
                cpfInput.style.borderColor = '#e63946'; // Borda vermelha
                cpfInput.focus();
                
                // Se quiser mostrar a mensagem pequena embaixo do input:
                const feedback = document.getElementById('cpf-feedback');
                if(feedback) feedback.style.display = 'block';
                
                return; // <--- ISSO IMPEDE O SALVAMENTO
            }
            
            // Reseta o estilo se estiver certo
            cpfInput.style.borderColor = ''; 
            const feedback = document.getElementById('cpf-feedback');
            if(feedback) feedback.style.display = 'none';
            // -------------------------------------

            btnSalvar.textContent = "Salvando...";
            btnSalvar.disabled = true;

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // --- LINHA NOVA: Limpa o CPF antes de enviar ---
            if (data.cpf) data.cpf = data.cpf.replace(/\D/g, ''); 
            // ------------------------------------------------

            data.valor_sessao_numero = data.valor_sessao_numero ? parseFloat(data.valor_sessao_numero) : null;

            if(data.linkedin_url) data.linkedin_url = `https://linkedin.com/in/${data.linkedin_url}`;
            if(data.instagram_url) data.instagram_url = `https://instagram.com/${data.instagram_url}`;
            if(data.facebook_url) data.facebook_url = `https://facebook.com/${data.facebook_url}`;
            if(data.tiktok_url) data.tiktok_url = `https://tiktok.com/@${data.tiktok_url}`;
            if(data.x_url) data.x_url = `https://x.com/${data.x_url}`;

            document.querySelectorAll('.multiselect-tag').forEach(dropdown => {
                const key = dropdown.id.replace('_multiselect', '');
                const valores = dropdown.getValues(); 
                const singleFields = ['genero_identidade', 'disponibilidade_periodo']; 
                if (singleFields.includes(key)) data[key] = valores.length > 0 ? valores[0] : ''; 
                else data[key] = valores;
            });

            try {
                const response = await apiFetch(`${API_BASE_URL}/api/psychologists/me`, {
                    method: 'PUT', body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Erro ao atualizar.');
                }
                showToast('Perfil atualizado com sucesso!', 'success');
                psychologistData = { ...psychologistData, ...data };
                fieldset.disabled = true;
                btnSalvar.classList.add('hidden');
                btnAlterar.classList.remove('hidden');
                
                const sidebarName = document.getElementById('psi-sidebar-name');
                if(sidebarName) sidebarName.textContent = psychologistData.nome;

                // Atualiza link do botão "Ver como Paciente"
                const btnView = document.getElementById('btn-view-public-profile');
                if (btnView && psychologistData.slug) {
                    btnView.href = `/${psychologistData.slug}`;
                }

            } catch (error) {
                console.error(error);
                showToast(`Erro: ${error.message}`, 'error');
            } finally {
                btnSalvar.textContent = "Salvar Alterações";
                btnSalvar.disabled = false;
            }
        });

        const btnDel = document.getElementById('btn-excluir-conta');
        if (btnDel) btnDel.onclick = (e) => { e.preventDefault(); loadPage('psi_excluir_conta.html'); };
    }

    async function inicializarLogicaExclusao() {
        if (psychologistData && psychologistData.nome) {
            const el = document.getElementById('nome-profissional-saida');
            if (el) el.textContent = psychologistData.nome.split(' ')[0];
        }
        document.getElementById('stat-dias').textContent = 142;
        document.getElementById('stat-views').textContent = 1205;
        document.getElementById('stat-contatos').textContent = 48;
        document.getElementById('stat-comunidade').textContent = 15;

        const form = document.getElementById('exit-form');
        if(form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                
                // 1. Captura a senha
                const senhaInput = document.getElementById('senha-exclusao');
                const senha = senhaInput ? senhaInput.value : null;

                if (!senha) {
                    showToast('Por favor, digite sua senha para confirmar.', 'error');
                    return;
                }

                if (!confirm("Tem certeza absoluta? Essa ação não pode ser desfeita.")) return;
                
                const btnSubmit = form.querySelector('button[type="submit"]');
                const textoOriginal = btnSubmit.textContent;
                btnSubmit.textContent = "Excluindo...";
                btnSubmit.disabled = true;

                const fd = new FormData(form);
                const exitData = {
                    motivo: fd.get('motivo'),
                    sugestao: fd.get('sugestao'),
                    avaliacao: document.querySelector('input[name="avaliacao"]:checked')?.value
                };

                try {
                    // Envia o feedback (opcional)
                    await apiFetch(`${API_BASE_URL}/api/psychologists/me/exit-survey`, {
                        method: 'POST', body: JSON.stringify(exitData)
                    }).catch(e => console.warn("Erro ao salvar feedback:", e));

                    // 2. Envia o DELETE
                    const response = await apiFetch(`${API_BASE_URL}/api/psychologists/me`, { 
                        method: 'DELETE',
                        body: JSON.stringify({ senha: senha }) 
                    });

                    // --- CORREÇÃO AQUI: Verifica se o Backend recusou a senha ---
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || "Erro ao excluir conta.");
                    }
                    // ------------------------------------------------------------

                    showToast('Conta excluída com sucesso. Adeus!', 'success');
                    
                    setTimeout(() => {
                        localStorage.removeItem('girassol_token');
                        window.location.href = '../index.html';
                    }, 2000);

                } catch (err) { 
                    console.error(err);
                    // Agora ele vai cair aqui se a senha estiver errada (403), sem deslogar
                    showToast(err.message, 'error'); 
                    
                    btnSubmit.textContent = textoOriginal;
                    btnSubmit.disabled = false;
                }
            };
        }
    }

    // =====================================================================
    // LÓGICA DA PÁGINA: VISÃO GERAL (NOVA)
    // =====================================================================
    function inicializarVisaoGeral() {
        if (!psychologistData) return;

        // 1. Atualiza o nome de boas-vindas
        const welcomeEl = document.getElementById('psi-welcome-name');
        if (welcomeEl) {
            const primeiroNome = psychologistData.nome.split(' ')[0];
            welcomeEl.textContent = `Bem-vindo(a), ${primeiroNome}!`;
        }

        // 2. Verifica se o perfil está completo (Telefone, Bio ou Status Pendente)
        const alertEl = document.getElementById('alert-complete-profile');
        if (alertEl) {
            // Se faltar telefone, bio OU se o status ainda for 'pending' (recém criado)
            if (!psychologistData.telefone || !psychologistData.bio || psychologistData.status === 'pending') {
                alertEl.style.display = 'flex';
            } else {
                alertEl.style.display = 'none';
            }
        }
        
        // 3. (Opcional) Aqui você pode atualizar os números dos KPIs se tiver os dados
        // Por enquanto, eles ficam zerados como placeholder.
    }

    // --- LÓGICA DE PAGAMENTO (MERCADO PAGO) ---
    async function iniciarPagamento(planType, btnElement) {
        const originalText = btnElement.textContent;
        
        // Trava o botão para evitar clique duplo
        btnElement.textContent = "Gerando cobrança...";
        btnElement.disabled = true;
        btnElement.style.opacity = "0.7";
        btnElement.style.cursor = "not-allowed";

        try {
            // Envia 'semente', 'luz' ou 'sol' para o backend
            const res = await apiFetch(`${API_BASE_URL}/api/payments/create-preference`, {
                method: 'POST',
                body: JSON.stringify({ planType: planType })
            });

            if (!res.ok) throw new Error('Erro ao criar pagamento');

            const data = await res.json();
            
            // Redireciona para o Mercado Pago se tiver link
            if (data.init_point) {
                window.location.href = data.init_point;
            }

        } catch (error) {
            console.error(error);
            showToast('Erro ao iniciar pagamento. Tente novamente.', 'error');
            
            // Restaura o botão em caso de erro
            btnElement.textContent = originalText;
            btnElement.disabled = false;
            btnElement.style.opacity = "1";
            btnElement.style.cursor = "pointer";
        }
    }

    function inicializarAssinatura() {
        console.log("Inicializando tela de assinatura...");
    
        // 1. Conecta os botões de mudança de plano
        const botoes = document.querySelectorAll('.btn-mudar-plano');
        
        botoes.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                // Pega o valor do HTML (Ex: "Sol") e converte para minúsculo ("sol")
                const plano = btn.getAttribute('data-plano').toLowerCase(); 
                iniciarPagamento(plano, btn);
            };
        });
    
        // 2. (Opcional) Atualiza visualmente qual é o plano atual baseado no Banco de Dados
        if (psychologistData && psychologistData.plano) {
            const planoAtualDB = psychologistData.plano.toLowerCase(); // ex: 'luz'
            
            // Atualiza o texto do topo
            const nomePlanoEl = document.querySelector('.plano-nome');
            if (nomePlanoEl) nomePlanoEl.textContent = `Plano ${psychologistData.plano}`;
    
            // Atualiza os cards (Remove o destaque do HTML estático e põe no real)
            document.querySelectorAll('.plano-card').forEach(card => {
                card.classList.remove('plano-card--ativo');
                const btn = card.querySelector('.btn-mudar-plano');
                const selo = card.querySelector('.selo-plano-atual');
                if(selo) selo.remove();
    
                // Se for o plano ativo
                if (card.querySelector('h2').textContent.toLowerCase().includes(planoAtualDB)) {
                    card.classList.add('plano-card--ativo');
                    
                    // Adiciona selo visual
                    const novoSelo = document.createElement('div');
                    novoSelo.className = 'selo-plano-atual';
                    novoSelo.textContent = 'Seu Plano Atual';
                    card.insertBefore(novoSelo, card.firstChild);
    
                    // Desabilita o botão
                    if(btn) {
                        btn.textContent = "Plano Atual";
                        btn.disabled = true;
                    }
                } else {
                    // Reabilita botões dos outros planos
                    if(btn) {
                        btn.textContent = btn.classList.contains('btn-upgrade') ? "Fazer Upgrade" : "Mudar para este plano";
                        btn.disabled = false;
                    }
                }
            });
        }
    }

    async function uploadProfilePhoto(file, imgEl) {
        const fd = new FormData();
        fd.append('foto', file); // O backend espera 'foto' na rota POST
        const oldSrc = imgEl.src;
        imgEl.style.opacity = '0.5';
        try {
            // CORREÇÃO AQUI: Mudamos de .../me/photo para .../me/foto
            // Isso alinha com router.post('/me/foto', ...) no seu backend
            const res = await apiFetch(`${API_BASE_URL}/api/psychologists/me/foto`, {
                method: 'POST', 
                body: fd 
            });
            if (!res.ok) throw new Error('Falha upload');
            const data = await res.json();
            
            const finalUrl = formatImageUrl(data.fotoUrl);
            
            imgEl.src = finalUrl;
            imgEl.style.opacity = '1';
            
            // Atualiza o objeto local para refletir a mudança sem refresh
            if(psychologistData) psychologistData.fotoUrl = data.fotoUrl;
            
            showToast('Foto atualizada!');
        } catch (e) {
            console.error(e); // Adicionado para debug
            imgEl.src = oldSrc;
            imgEl.style.opacity = '1';
            showToast('Erro no upload.', 'error');
        }
    }

    function loadPage(url) {
        if (!url) return;
        mainContent.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">Carregando...</div>';
        
        // Use o './' para forçar o caminho relativo correto
        fetch('./' + url).then(r => r.ok ? r.text() : Promise.reject(url))
            .then(html => {
                mainContent.innerHTML = html;
                
                // --- ROTEADOR DE LÓGICA ---
                if (url.includes('meu_perfil')) inicializarLogicaDoPerfil();
                else if (url.includes('excluir_conta')) inicializarLogicaExclusao();
                else if (url.includes('visao_geral')) inicializarVisaoGeral();
                else if (url.includes('assinatura')) inicializarAssinatura();
            })
            .catch(e => mainContent.innerHTML = '<p>Erro ao carregar.</p>');
    }

    function initializeDashboard() {
        document.getElementById('dashboard-container').style.display = 'flex';
        const imgEl = document.getElementById('psi-sidebar-photo');
        const nameEl = document.getElementById('psi-sidebar-name');
        
        if (psychologistData) {
            if(nameEl) nameEl.textContent = psychologistData.nome;
            // CORREÇÃO: Usa o formatador ao carregar a página
            if(imgEl) imgEl.src = formatImageUrl(psychologistData.fotoUrl);
            
            const btnLink = document.getElementById('btn-view-public-profile');
            if(btnLink && psychologistData.slug) {
                btnLink.href = `/${psychologistData.slug}`;
                btnLink.style.opacity = '1';
                btnLink.style.pointerEvents = 'auto';
            }
        }

        const uploadInput = document.getElementById('profile-photo-upload');
        if (uploadInput && imgEl) {
            uploadInput.onchange = (e) => {
                if(e.target.files[0]) uploadProfilePhoto(e.target.files[0], imgEl);
            };
        }

        document.querySelectorAll('.sidebar-nav a').forEach(l => {
            l.onclick = (e) => {
                e.preventDefault();
                document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
                l.closest('li').classList.add('active');
                loadPage(l.getAttribute('data-page'));
            };
        });
        loadPage('psi_visao_geral.html');
    }

    // ATENÇÃO: Adicione esta verificação no seu "loadPage" ou na inicialização
    // Se a URL tiver ?status=approved, mostre festa!
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'approved') {
        showToast('Pagamento Aprovado! Seu perfil está ativo.', 'success');
        // Limpa a URL para não ficar mostrando o toast toda hora
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchPsychologistData().then(ok => { if (ok) initializeDashboard(); });
});