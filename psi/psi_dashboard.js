// Arquivo: psi_dashboard.js (VERSÃO FINAL E DEFINITIVA)

document.addEventListener('DOMContentLoaded', function() {
    
    let psychologistData = null; 
    const mainContent = document.getElementById('main-content');
    const toastContainer = document.getElementById('toast-container');

    // --- TOAST ---
    function showToast(message, type = 'success') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // --- AUTH ---
    async function fetchPsychologistData() {
        await new Promise(resolve => setTimeout(resolve, 100));
        const token = localStorage.getItem('girassol_token');
        
        return new Promise(async (resolvePromise) => {
            if (!token) {
                window.location.href = '../login.html';
                resolvePromise(false); 
                return;
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
        const headers = {
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };
        if (!isFormData) headers['Content-Type'] = 'application/json';

        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            localStorage.removeItem('girassol_token');
            window.location.href = '../login.html';
            throw new Error("Sessão inválida.");
        }
        return response;
    }

    // --- HELPERS ---
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

            // Carregar dados
            if (dataInicial && dataInicial[dataKey]) {
                // Se for string única (ex: 'Feminino'), converte pra array pra exibir a tag
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
                options.forEach(opt => {
                    opt.classList.toggle('selected', dropdown._selectedValues.includes(opt.dataset.value));
                });
            }

            // Eventos
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

            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
            });
            
            dropdown.getValues = () => dropdown._selectedValues || [];
        });
    }

    // --- PÁGINA: MEU PERFIL ---
    function inicializarLogicaDoPerfil() {
        const form = document.getElementById('perfil-form');
        const fieldset = document.getElementById('form-fieldset');
        const btnAlterar = document.getElementById('btn-alterar');
        const btnSalvar = document.getElementById('btn-salvar');

        if (!form) return;

        setupMasks();

        // Preencher campos
        if (psychologistData) {
            ['nome', 'cpf', 'email', 'crp', 'telefone', 'bio', 'valor_sessao_numero', 'agenda_online_url'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = psychologistData[id] || '';
            });

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

            setupMultiselects(psychologistData);
        }

        btnAlterar.addEventListener('click', (e) => {
            e.preventDefault();
            fieldset.disabled = false;
            btnAlterar.classList.add('hidden');
            btnSalvar.classList.remove('hidden');
            document.querySelectorAll('.multiselect-tag').forEach(el => el.classList.remove('disabled'));
        });

        // SUBMIT DO FORMULÁRIO (AQUI ESTÁ A CORREÇÃO)
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            btnSalvar.textContent = "Salvando...";
            btnSalvar.disabled = true;

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Conversão de Número
            data.valor_sessao_numero = data.valor_sessao_numero ? parseFloat(data.valor_sessao_numero) : null;

            // Redes Sociais
            if(data.linkedin_url) data.linkedin_url = `https://linkedin.com/in/${data.linkedin_url}`;
            if(data.instagram_url) data.instagram_url = `https://instagram.com/${data.instagram_url}`;
            if(data.facebook_url) data.facebook_url = `https://facebook.com/${data.facebook_url}`;
            if(data.tiktok_url) data.tiktok_url = `https://tiktok.com/@${data.tiktok_url}`;
            if(data.x_url) data.x_url = `https://x.com/${data.x_url}`;

            // --- CORREÇÃO DOS MULTISELECTS ---
            document.querySelectorAll('.multiselect-tag').forEach(dropdown => {
                const key = dropdown.id.replace('_multiselect', '');
                const valores = dropdown.getValues(); 
                
                // Campos que o banco exige String Única
                const singleFields = ['genero_identidade', 'disponibilidade_periodo']; 

                if (singleFields.includes(key)) {
                    data[key] = valores.length > 0 ? valores[0] : ''; 
                } else {
                    data[key] = valores; // Array para os outros
                }
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

            } catch (error) {
                console.error(error);
                showToast(`Erro: ${error.message}`, 'error');
            } finally {
                btnSalvar.textContent = "Salvar Alterações";
                btnSalvar.disabled = false;
            }
        });

        // Excluir Conta
        const btnDel = document.getElementById('btn-excluir-conta');
        if (btnDel) btnDel.onclick = (e) => { e.preventDefault(); loadPage('psi_excluir_conta.html'); };
    }

    // --- PÁGINA: EXCLUIR ---
    async function inicializarLogicaExclusao() {
        if (psychologistData && psychologistData.nome) {
            const el = document.getElementById('nome-profissional-saida');
            if (el) el.textContent = psychologistData.nome.split(' ')[0];
        }
        
        // Mock Stats
        document.getElementById('stat-dias').textContent = 142;
        document.getElementById('stat-views').textContent = 1205;
        document.getElementById('stat-contatos').textContent = 48;
        document.getElementById('stat-comunidade').textContent = 15;

        const form = document.getElementById('exit-form');
        if(form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                if (!confirm("Tem certeza absoluta?")) return;

                const fd = new FormData(form);
                const exitData = {
                    motivo: fd.get('motivo'),
                    sugestao: fd.get('sugestao'),
                    avaliacao: document.querySelector('input[name="avaliacao"]:checked')?.value
                };

                try {
                    await apiFetch(`${API_BASE_URL}/api/psychologists/me/exit-survey`, {
                        method: 'POST', body: JSON.stringify(exitData)
                    }).catch(e => console.warn(e));

                    await apiFetch(`${API_BASE_URL}/api/psychologists/me`, { method: 'DELETE' });
                    alert("Conta excluída.");
                    localStorage.removeItem('girassol_token');
                    window.location.href = '../index.html';
                } catch (err) {
                    showToast('Erro ao excluir.', 'error');
                }
            };
        }
    }

    // --- UPLOAD ---
    async function uploadProfilePhoto(file, imgEl) {
        const fd = new FormData();
        fd.append('foto', file);
        const oldSrc = imgEl.src;
        imgEl.style.opacity = '0.5';

        try {
            const res = await apiFetch(`${API_BASE_URL}/api/psychologists/me/foto`, {
                method: 'POST', body: fd 
            });
            if (!res.ok) throw new Error('Falha upload');
            const data = await res.json();
            imgEl.src = data.fotoUrl;
            imgEl.style.opacity = '1';
            psychologistData.fotoUrl = data.fotoUrl;
            showToast('Foto atualizada!');
        } catch (e) {
            imgEl.src = oldSrc;
            imgEl.style.opacity = '1';
            showToast('Erro no upload.', 'error');
        }
    }

    // --- ROTEADOR ---
    function loadPage(url) {
        if (!url) return;
        mainContent.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">Carregando...</div>';
        fetch(url).then(r => r.ok ? r.text() : Promise.reject(url))
            .then(html => {
                mainContent.innerHTML = html;
                if (url.includes('meu_perfil')) inicializarLogicaDoPerfil();
                else if (url.includes('excluir_conta')) inicializarLogicaExclusao();
                // Adicione outros inits se precisar
            })
            .catch(e => mainContent.innerHTML = '<p>Erro ao carregar.</p>');
    }

    // --- INIT ---
    function initializeDashboard() {
        document.getElementById('dashboard-container').style.display = 'flex';
        const imgEl = document.getElementById('psi-sidebar-photo');
        const nameEl = document.getElementById('psi-sidebar-name');
        
        if (psychologistData) {
            if(nameEl) nameEl.textContent = psychologistData.nome;
            if(imgEl) imgEl.src = psychologistData.fotoUrl || 'https://placehold.co/70x70/1B4332/FFFFFF?text=Psi';
            
            const btnLink = document.getElementById('btn-view-public-profile');
            if(btnLink && psychologistData.slug) {
                btnLink.href = `/${psychologistData.slug}`;
                btnLink.style.opacity = '1';
                btnLink.style.pointerEvents = 'auto';
            }
        }

        // (CÓDIGO NOVO - COLE ISTO NO LUGAR)
        const uploadInput = document.getElementById('profile-photo-upload');
        if (uploadInput && imgEl) {
            // Usamos addEventListener que é mais seguro que .onchange
            uploadInput.addEventListener('change', (e) => {
                // 1. IMPEDE que o evento se propague e cause o envio do formulário principal
                e.preventDefault(); 
                e.stopPropagation();

                console.log("Tentando upload de foto..."); // Log para debug

                // 2. Verifica se o arquivo existe antes de tentar enviar
                if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];
                    
                    // Opcional: verificação rápida de tipo/tamanho no front
                    if (!file.type.startsWith('image/')) {
                        showToast('Por favor, selecione apenas arquivos de imagem.', 'error');
                        return;
                    }

                    uploadProfilePhoto(file, imgEl);
                }
            });
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

    fetchPsychologistData().then(ok => { if (ok) initializeDashboard(); });
});