// Arquivo: psi_dashboard.js (VERSÃO FINAL CORRIGIDA: ARRAY PURO PARA O BANCO)

document.addEventListener('DOMContentLoaded', function() {
    
    // --- SELETORES GLOBAIS ---
    let psychologistData = null; 
    const mainContent = document.getElementById('main-content');
    const toastContainer = document.getElementById('toast-container');

    // =====================================================================
    // FUNÇÃO AUXILIAR: SHOW TOAST
    // =====================================================================
    function showToast(message, type = 'success') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // =====================================================================
    // FUNÇÃO DE SEGURANÇA E BUSCA DE DADOS INICIAL
    // =====================================================================
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
                    throw new Error("Sessão inválida ou expirada.");
                }
            } catch (error) {
                console.error('Falha na autenticação:', error.message);
                localStorage.removeItem('girassol_token');
                window.location.href = '../login.html';
                resolvePromise(false);
            }
        });
    }

    // =====================================================================
    // FUNÇÃO AUXILIAR PARA CHAMADAS DE API (API FETCHER)
    // =====================================================================
    async function apiFetch(url, options = {}) {
        const token = localStorage.getItem('girassol_token');
        if (!token) {
            window.location.href = '../login.html';
            throw new Error("Token não encontrado.");
        }
        
        const isFormData = options.body instanceof FormData;
        const headers = {
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };
        
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        const config = {
            ...options,
            headers: headers,
        };

        const response = await fetch(url, config);
        if (response.status === 401) {
            localStorage.removeItem('girassol_token');
            window.location.href = '../login.html';
            throw new Error("Sessão inválida.");
        }
        return response;
    }

    // =====================================================================
    // HELPERS: MÁSCARAS E MULTISELECTS
    // =====================================================================
    
    function setupMasks() {
        const cpfInput = document.getElementById('cpf');
        const telInput = document.getElementById('telefone');
        const crpInput = document.getElementById('crp');

        if (typeof IMask !== 'undefined') {
            if (cpfInput) IMask(cpfInput, { mask: '000.000.000-00' });
            if (telInput) IMask(telInput, { mask: '(00) 00000-0000' });
            if (crpInput) IMask(crpInput, { mask: '00/000000' }); 
        }
    }

    function setupMultiselects(dataInicial) {
        const dropdowns = document.querySelectorAll('.multiselect-tag');

        dropdowns.forEach(dropdown => {
            const display = dropdown.querySelector('.multiselect-display');
            const optionsContainer = dropdown.querySelector('.multiselect-options');
            const options = dropdown.querySelectorAll('.option');
            const fieldId = dropdown.id; 
            const dataKey = fieldId.replace('_multiselect', '');
            
            // Armazena no elemento para persistência
            dropdown._selectedValues = [];

            // 1. Carregar dados iniciais
            if (dataInicial && dataInicial[dataKey]) {
                const savedData = Array.isArray(dataInicial[dataKey]) 
                    ? dataInicial[dataKey] 
                    : (typeof dataInicial[dataKey] === 'string' ? dataInicial[dataKey].split(',') : []);
                
                dropdown._selectedValues = savedData.map(s => s.trim()).filter(s => s);
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
                    if (dropdown._selectedValues.includes(opt.dataset.value)) {
                        opt.classList.add('selected');
                    } else {
                        opt.classList.remove('selected');
                    }
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
                    if (dropdown.closest('fieldset').disabled) return; 
                    dropdown.classList.toggle('open');
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
                        if (dropdown._selectedValues.includes(val)) {
                            dropdown._selectedValues = dropdown._selectedValues.filter(v => v !== val);
                        } else {
                            dropdown._selectedValues.push(val);
                        }
                    }
                    renderTags();
                });
            });

            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
            });
            
            // Método para extrair dados no final
            dropdown.getValues = () => dropdown._selectedValues || [];
        });
    }

    // =====================================================================
    // LÓGICA DA PÁGINA: MEU PERFIL (CORRIGIDA)
    // =====================================================================
    function inicializarLogicaDoPerfil() {
        const form = document.getElementById('perfil-form');
        const fieldset = document.getElementById('form-fieldset');
        const btnAlterar = document.getElementById('btn-alterar');
        const btnSalvar = document.getElementById('btn-salvar');

        if (!form || !fieldset || !btnAlterar || !btnSalvar) return;

        setupMasks();

        // Preencher campos
        if (psychologistData) {
            const fields = ['nome', 'cpf', 'email', 'crp', 'telefone', 'bio', 'valor_sessao_numero', 'agenda_online_url'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = psychologistData[id] || '';
            });

            const setSocial = (id, prefix) => {
                let val = psychologistData[id] || '';
                if(val) {
                    val = val.replace('https://', '').replace('http://', '').replace('www.', '');
                    val = val.replace(prefix, '');
                }
                if(document.getElementById(id)) document.getElementById(id).value = val;
            };
            
            setSocial('linkedin_url', 'linkedin.com/in/');
            setSocial('instagram_url', 'instagram.com/');
            setSocial('facebook_url', 'facebook.com/');
            setSocial('tiktok_url', 'tiktok.com/@');
            setSocial('x_url', 'x.com/');

            setupMultiselects(psychologistData);
        }

        // Botão Alterar
        btnAlterar.addEventListener('click', (e) => {
            e.preventDefault();
            fieldset.disabled = false;
            btnAlterar.classList.add('hidden');
            btnSalvar.classList.remove('hidden');
            document.querySelectorAll('.multiselect-tag').forEach(el => el.classList.remove('disabled'));
        });

        // Botão Salvar (Submit)
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            btnSalvar.textContent = "Salvando...";
            btnSalvar.disabled = true;

            const formData = new FormData(form);
            const dataToUpdate = Object.fromEntries(formData.entries());

            // Tratamento de Número
            if (dataToUpdate.valor_sessao_numero) {
                dataToUpdate.valor_sessao_numero = parseFloat(dataToUpdate.valor_sessao_numero);
            } else {
                dataToUpdate.valor_sessao_numero = null;
            }

            // Reconstrói URLs
            if(dataToUpdate.linkedin_url) dataToUpdate.linkedin_url = `https://linkedin.com/in/${dataToUpdate.linkedin_url}`;
            if(dataToUpdate.instagram_url) dataToUpdate.instagram_url = `https://instagram.com/${dataToUpdate.instagram_url}`;
            if(dataToUpdate.facebook_url) dataToUpdate.facebook_url = `https://facebook.com/${dataToUpdate.facebook_url}`;
            if(dataToUpdate.tiktok_url) dataToUpdate.tiktok_url = `https://tiktok.com/@${dataToUpdate.tiktok_url}`;
            if(dataToUpdate.x_url) dataToUpdate.x_url = `https://x.com/${dataToUpdate.x_url}`;

            // --- CORREÇÃO FINAL: ENVIA ARRAY PURO PARA O POSTGRES ---
            document.querySelectorAll('.multiselect-tag').forEach(dropdown => {
                const key = dropdown.id.replace('_multiselect', '');
                // NÃO USA .join(',') - O banco quer ['A', 'B']
                dataToUpdate[key] = dropdown.getValues(); 
            });

            try {
                console.log("Enviando:", dataToUpdate); // Debug

                const response = await apiFetch(`${API_BASE_URL}/api/psychologists/me`, {
                    method: 'PUT',
                    body: JSON.stringify(dataToUpdate)
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Erro ao atualizar.');
                }

                showToast('Perfil atualizado com sucesso!', 'success');
                
                psychologistData = { ...psychologistData, ...dataToUpdate };
                
                fieldset.disabled = true;
                btnSalvar.classList.add('hidden');
                btnAlterar.classList.remove('hidden');
                
                const sidebarNameEl = document.getElementById('psi-sidebar-name');
                if(sidebarNameEl) sidebarNameEl.textContent = psychologistData.nome;

            } catch (error) {
                console.error(error);
                showToast(`Erro: ${error.message}`, 'error');
            } finally {
                btnSalvar.textContent = "Salvar Alterações";
                btnSalvar.disabled = false;
            }
        });

        // Botão Excluir
        const btnExcluirLink = document.getElementById('btn-excluir-conta');
        if (btnExcluirLink) {
            btnExcluirLink.addEventListener('click', (e) => {
                e.preventDefault();
                loadPage('psi_excluir_conta.html');
            });
        }
    }

    // =====================================================================
    // LÓGICA DA PÁGINA: EXCLUIR CONTA
    // =====================================================================
    async function inicializarLogicaExclusao() {
        if (psychologistData && psychologistData.nome) {
            const primeiroNome = psychologistData.nome.split(' ')[0];
            const elNome = document.getElementById('nome-profissional-saida');
            if (elNome) elNome.textContent = primeiroNome;
        }

        const statsMock = { dias: 142, views: 1205, contatos: 48, comunidade: 15 };
        const elDias = document.getElementById('stat-dias');
        if(elDias) {
            document.getElementById('stat-dias').innerText = statsMock.dias;
            document.getElementById('stat-views').innerText = statsMock.views;
            document.getElementById('stat-contatos').innerText = statsMock.contatos;
            document.getElementById('stat-comunidade').innerText = statsMock.comunidade;
        }

        const form = document.getElementById('exit-form');
        if(form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!confirm("Tem certeza absoluta? Esta ação apagará todos os seus dados e não pode ser desfeita.")) return;

                const formData = new FormData(form);
                const exitData = {
                    motivo: formData.get('motivo'),
                    sugestao: formData.get('sugestao'),
                    avaliacao: document.querySelector('input[name="avaliacao"]:checked')?.value || null
                };

                try {
                    await apiFetch(`${API_BASE_URL}/api/psychologists/me/exit-survey`, {
                        method: 'POST', body: JSON.stringify(exitData)
                    }).catch(err => console.warn("Feedback fail:", err));

                    await apiFetch(`${API_BASE_URL}/api/psychologists/me`, { method: 'DELETE' });

                    alert("Sua conta foi excluída. Esperamos te ver novamente!");
                    localStorage.removeItem('girassol_token');
                    window.location.href = '../index.html';
                } catch (error) {
                    console.error("Erro ao excluir:", error);
                    showToast('Erro ao excluir conta.', 'error');
                }
            });
        }
    }

    // =====================================================================
    // UPLOAD DE FOTO E NAVEGAÇÃO
    // =====================================================================
    async function uploadProfilePhoto(file, sidebarPhotoEl) {
        const formData = new FormData();
        formData.append('foto', file);
        const originalSrc = sidebarPhotoEl.src;
        sidebarPhotoEl.style.opacity = '0.5';

        try {
            const response = await apiFetch(`${API_BASE_URL}/api/psychologists/me/foto`, {
                method: 'POST', body: formData 
            });
            if (!response.ok) throw new Error('Falha no upload.');
            const data = await response.json();
            
            sidebarPhotoEl.src = data.fotoUrl;
            sidebarPhotoEl.style.opacity = '1';
            psychologistData.fotoUrl = data.fotoUrl;
            showToast('Foto de perfil atualizada!', 'success');
        } catch (error) {
            console.error(error);
            sidebarPhotoEl.src = originalSrc;
            sidebarPhotoEl.style.opacity = '1';
            showToast('Erro ao enviar foto.', 'error');
        }
    }

    function fetchUnreadCount() { /* ... */ }
    function fetchQnaCount() { /* ... */ }
    function inicializarLogicaDaCaixaDeEntrada() { }
    function inicializarListaDeEspera() { }
    async function inicializarComunidadeQNA() { console.log("Q&A OK"); }

    function loadPage(pageUrl) {
        if (!pageUrl) return;
        mainContent.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">Carregando...</div>';

        fetch(pageUrl)
            .then(response => response.ok ? response.text() : Promise.reject(`Erro: ${pageUrl}`))
            .then(html => {
                mainContent.innerHTML = html;
                if (pageUrl.includes('psi_meu_perfil.html')) inicializarLogicaDoPerfil();
                else if (pageUrl.includes('psi_caixa_de_entrada.html')) inicializarLogicaDaCaixaDeEntrada();
                else if (pageUrl.includes('psi_lista_de_espera.html')) inicializarListaDeEspera();
                else if (pageUrl.includes('psi_comunidade.html')) inicializarComunidadeQNA();
                else if (pageUrl.includes('psi_excluir_conta.html')) inicializarLogicaExclusao();
            })
            .catch(error => {
                mainContent.innerHTML = `<div class="card"><h2>Erro</h2><p>Não foi possível carregar a seção.</p></div>`;
                console.error(error);
            });
    }

    function initializeDashboard() {
        document.getElementById('dashboard-container').style.display = 'flex';
        const sidebarPhotoEl = document.getElementById('psi-sidebar-photo');
        const sidebarNameEl = document.getElementById('psi-sidebar-name');
        
        if (psychologistData) {
            if(sidebarNameEl) sidebarNameEl.textContent = psychologistData.nome;
            if(sidebarPhotoEl) sidebarPhotoEl.src = psychologistData.fotoUrl || 'https://placehold.co/70x70/1B4332/FFFFFF?text=Psi';

            const btnPublicProfile = document.getElementById('btn-view-public-profile');
            if (btnPublicProfile) {
                if (psychologistData.slug) {
                    btnPublicProfile.href = `/${psychologistData.slug}`;
                    btnPublicProfile.style.opacity = '1';
                    btnPublicProfile.style.pointerEvents = 'auto';
                } else {
                    btnPublicProfile.href = '#';
                    btnPublicProfile.style.opacity = '0.5';
                    btnPublicProfile.style.cursor = 'not-allowed';
                }
            }
        }

        const photoUploadInput = document.getElementById('profile-photo-upload');
        if (photoUploadInput && sidebarPhotoEl) {
            photoUploadInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) uploadProfilePhoto(file, sidebarPhotoEl);
            });
        }

        const navLinks = document.querySelectorAll('.sidebar-nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
                this.closest('li').classList.add('active');
                loadPage(this.getAttribute('data-page'));
            });
        });

        loadPage('psi_visao_geral.html');
    }

    fetchPsychologistData().then(success => {
        if (success) initializeDashboard();
    });
});