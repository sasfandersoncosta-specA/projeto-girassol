// Arquivo: psi_dashboard.js (CORRIGIDO)

document.addEventListener('DOMContentLoaded', function() {
    
    // --- SELETORES GLOBAIS ---
    let psychologistData = null; // Armazena os dados do psicólogo logado
    const mainContent = document.getElementById('main-content');
    const toastContainer = document.getElementById('toast-container'); // << 1. MOVIDO PARA CIMA

    // =====================================================================
    // FUNÇÃO AUXILIAR: SHOW TOAST (AGORA GLOBAL)
    // =====================================================================
    function showToast(message, type = 'success') {
        if (!toastContainer) {
            console.error("Elemento #toast-container não encontrado!");
            return;
        }
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
        // Adiciona um pequeno delay para dar tempo ao navegador de estabilizar o localStorage
        await new Promise(resolve => setTimeout(resolve, 100));

        const token = localStorage.getItem('girassol_token');
        console.log('Token Lido:', token); // Log para depuração

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
                    resolvePromise(true); // Sucesso
                } else {
                    throw new Error("Sessão inválida ou expirada.");
                }
            } catch (error) {
                console.error('Falha na autenticação:', error.message);
                localStorage.removeItem('girassol_token');
                window.location.href = '../login.html';
                resolvePromise(false); // Falha
            }
        });
    }

    // =====================================================================
    // FUNÇÃO AUXILIAR PARA CHAMADAS DE API (API FETCHER)
    // =====================================================================
    async function apiFetch(url, options = {}) {
        // ... (Esta função permanece 100% igual) ...
        const token = localStorage.getItem('girassol_token');
        if (!token) {
            window.location.href = '../login.html';
            throw new Error("Token não encontrado. Redirecionando para login.");
        }
        const defaultHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }
        const response = await fetch(url, config);
        if (response.status === 401) {
            localStorage.removeItem('girassol_token');
            window.location.href = '../login.html';
            throw new Error("Sessão inválida. Redirecionando para login.");
        }
        return response;
    }

    // =====================================================================
    // FUNÇÃO PARA BUSCAR CONTAGEM DE MENSAGENS
    // =====================================================================
    async function fetchUnreadCount() {
        // ... (Esta função permanece 100% igual) ...
        const badge = document.getElementById('unread-count-badge');
        if (!badge) return;
        try {
            const response = await apiFetch(`${API_BASE_URL}/api/psychologists/me/unread-count`);
            if (response.ok) {
                const data = await response.json();
                badge.textContent = data.count;
                badge.style.display = data.count > 0 ? 'inline-block' : 'none';
            }
        } catch (error) {
            console.error('Erro ao buscar contagem de mensagens:', error);
            badge.style.display = 'none';
        }
    }

    // =====================================================================
    // LÓGICA DA CAIXA DE ENTRADA (INTERAÇÃO MOBILE)
    // =====================================================================
    if (mainContent) {
        // ... (Esta função permanece 100% igual) ...
        mainContent.addEventListener('click', function(event) {
            const inboxContainer = event.target.closest('.inbox-container');
            if (!inboxContainer) return;
            if (event.target.closest('.message-item')) {
                inboxContainer.classList.add('mostrando-conteudo');
                const clickedItem = event.target.closest('.message-item');
                inboxContainer.querySelectorAll('.message-item').forEach(item => item.classList.remove('active'));
                clickedItem.classList.add('active');
            }
            if (event.target.closest('.btn-voltar-inbox')) {
                inboxContainer.classList.remove('mostrando-conteudo');
            }
        });
    }

    // =====================================================================
    // FUNÇÕES DE VALIDAÇÃO (Reutilizáveis)
    // =====================================================================
    function validarCPF(cpf) {
        // ... (Esta função permanece 100% igual) ...
        cpf = String(cpf).replace(/[^\d]/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        return true;
    }

    // ... (A função validarEmail() também permanece a mesma) ...

    // =====================================================================
    // LÓGICA MODULAR POR PÁGINA (Funções de Inicialização)
    // =====================================================================
    
    // Lógica da Página: MEU PERFIL
    async function uploadCrpDocument(file) {
        const token = localStorage.getItem('girassol_token');
        if (!file || !token) {
            showToast('Falha na autenticação ou nenhum arquivo selecionado.', 'error');
            return;
        }

        const formData = new FormData();
        // O nome 'crpDocument' deve ser o mesmo esperado pelo middleware `uploadCrpDocument.single()` no backend.
        formData.append('crpDocument', file);

        try {
            const response = await fetch(`${API_BASE_URL}/api/psychologists/me/crp-document`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Não defina 'Content-Type', o navegador faz isso por você com FormData
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showToast(result.message, 'success');
                // Opcional: Recarregar a página ou apenas atualizar o widget de status
                loadPage('psi_meu_perfil.html'); // Recarrega a seção do perfil
            } else {
                throw new Error(result.error || 'Falha no upload do documento.');
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
    function inicializarLogicaDoPerfil() {
        const form = document.getElementById('perfil-form');
        const fieldset = document.getElementById('form-fieldset');
        const btnAlterar = document.getElementById('btn-alterar');
        const btnSalvar = document.getElementById('btn-salvar');
        const viewPublicProfileLink = document.getElementById('view-public-profile-link');

        // Aplica a máscara de telefone
        const telefoneInput = document.getElementById('telefone');
        if (telefoneInput && window.IMask) {
            IMask(telefoneInput, { mask: '(00) 00000-0000' });
        }
    
        // Função para popular os campos do formulário
        function populateForm(data) {
            if (!data) return;
    
            // Popula inputs simples
            form.elements['nome'].value = data.nome || '';
            form.elements['cpf'].value = data.cpf || '';
            form.elements['email'].value = data.email || '';
            form.elements['crp'].value = data.crp || '';
            form.elements['telefone'].value = data.telefone || '';
            form.elements['agenda_online_url'].value = data.agenda_online_url || '';
            form.elements['bio'].value = data.bio || '';
            form.elements['valor_sessao_numero'].value = data.valor_sessao_numero || '';
    
            // Lógica para o link do perfil público
            if (data.slug && viewPublicProfileLink) {
                viewPublicProfileLink.href = `/psi/${data.slug}`;
                viewPublicProfileLink.style.display = 'inline-block';
            }

            // CORREÇÃO: A inicialização dos multiselects deve ocorrer DEPOIS que o formulário foi populado.
            // Esta função agora é chamada aqui.
            if (form.elements['nome']) { // Garante que o formulário do perfil está presente
                initializeMultiselect('temas_atuacao_multiselect', data.temas_atuacao);
                initializeMultiselect('abordagens_tecnicas_multiselect', Array.isArray(data.abordagens_tecnicas) ? data.abordagens_tecnicas : [data.abordagens_tecnicas].filter(Boolean));
                initializeMultiselect('genero_identidade_multiselect', [data.genero_identidade].filter(Boolean));
                initializeMultiselect('praticas_vivencias_multiselect', data.praticas_vivencias);
                initializeMultiselect('disponibilidade_periodo_multiselect', data.disponibilidade_periodo);
            }
        }
    
        // Função para coletar dados do formulário, incluindo os multiselects
        function getFormData() {
            const getMultiselectValues = (id) => {
                const container = document.getElementById(id);
                if (!container) return [];
                return Array.from(container.querySelectorAll('.tag')).map(tag => tag.dataset.value);
            };
    
            const data = {
                nome: form.elements['nome'].value,
                email: form.elements['email'].value,
                cpf: form.elements['cpf'].value,
                crp: form.elements['crp'].value,
                telefone: form.elements['telefone'].value,
                agenda_online_url: form.elements['agenda_online_url'].value,
                bio: form.elements['bio'].value,
                valor_sessao_numero: parseFloat(form.elements['valor_sessao_numero'].value) || null,
                temas_atuacao: getMultiselectValues('temas_atuacao_multiselect'),
                abordagens_tecnicas: getMultiselectValues('abordagens_tecnicas_multiselect'),
                genero_identidade: getMultiselectValues('genero_identidade_multiselect')[0] || null,
                praticas_vivencias: getMultiselectValues('praticas_vivencias_multiselect'),
                disponibilidade_periodo: getMultiselectValues('disponibilidade_periodo_multiselect'),
            };
            return data;
        }
    
        // Popula o formulário com os dados já existentes
        populateForm(psychologistData);
    
        // --- LÓGICA DE HABILITAÇÃO DO FORMULÁRIO ---
        if (btnAlterar && btnSalvar && fieldset) {
            btnAlterar.addEventListener('click', () => {
                fieldset.disabled = false;
                btnAlterar.classList.add('hidden');
                btnSalvar.classList.remove('hidden');
                showToast('Modo de edição ativado.', 'info');
            });
    
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const updatedData = getFormData();
    
                try {
                    const response = await apiFetch(`${API_BASE_URL}/api/psychologists/me`, {
                        method: 'PUT',
                        body: updatedData
                    });
    
                    const result = await response.json();
    
                    if (response.ok) {
                        fieldset.disabled = true;
                        btnSalvar.classList.add('hidden');
                        btnAlterar.classList.remove('hidden');
                        showToast(result.message || 'Perfil atualizado com sucesso!', 'success');
                        // Atualiza os dados locais para refletir a mudança na UI e no nome da sidebar
                        psychologistData = result.psychologist;
                        document.getElementById('psi-sidebar-name').textContent = psychologistData.nome;
                    } else {
                        throw new Error(result.error || 'Falha ao atualizar o perfil.');
                    }
                } catch (error) {
                    showToast(error.message, 'error');
                }
            });
        }
    
        // --- 3. LÓGICA DE VERIFICAÇÃO (Problema 3) ---
        const widget = document.getElementById('verification-widget');
        const statusText = document.getElementById('verification-status-text');
        const description = document.getElementById('verification-description');
        
        // --- NOVA FUNÇÃO PARA INICIALIZAR MULTISELECTS ---
        function initializeMultiselect(containerId, selectedValues = []) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const display = container.querySelector('.multiselect-display');
            const optionsContainer = container.querySelector('.multiselect-options');
            const isSingleSelect = container.dataset.singleSelect === 'true';

            // Limpa o estado anterior
            display.innerHTML = '';
            optionsContainer.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));

            // Popula com os valores salvos
            selectedValues.forEach(value => {
                const option = optionsContainer.querySelector(`.option[data-value="${value}"]`);
                if (option) {
                    addTag(option.textContent, value);
                    option.classList.add('selected');
                }
            });

            function addTag(text, value) {
                if (isSingleSelect) {
                    display.innerHTML = ''; // Limpa antes de adicionar
                }
                const tag = document.createElement('span');
                tag.className = 'tag';
                tag.textContent = text;
                tag.dataset.value = value;
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-tag';
                removeBtn.innerHTML = '&times;';
                removeBtn.onclick = () => {
                    const option = optionsContainer.querySelector(`.option[data-value="${value}"]`);
                    if (option) option.classList.remove('selected');
                    tag.remove();
                };
                tag.appendChild(removeBtn);
                display.appendChild(tag);
            }

            // Adiciona o listener de clique nas opções
            optionsContainer.addEventListener('click', (e) => {
                if (container.classList.contains('disabled')) return; // Não faz nada se estiver desabilitado

                const option = e.target.closest('.option');
                if (!option) return;

                option.classList.toggle('selected');
                display.innerHTML = ''; // Recria as tags
                optionsContainer.querySelectorAll('.option.selected').forEach(opt => {
                    addTag(opt.textContent, opt.dataset.value);
                });
            });
        }

        if (widget && psychologistData) {
            widget.style.display = 'block';
            if (psychologistData.status === 'active') {
                widget.classList.add('status-verified');
                statusText.textContent = 'Verificado';
                description.textContent = 'Sua conta foi verificada por nossa equipe. Você tem o selo de verificado!';
            } else if (psychologistData.status === 'pending') {
                widget.classList.add('status-pending');
                statusText.textContent = 'Verificação Pendente';
                description.innerHTML = `Envie seu CRP para análise e ganhe o selo de verificado. 
                    <button class="btn btn-secundario" id="btn-upload-crp-perfil">Enviar CRP</button>`; // CORREÇÃO: Fechamento do template literal
                
                // --- LÓGICA DE CLIQUE E UPLOAD DO CRP ---
                const btnUploadCrp = document.getElementById('btn-upload-crp-perfil');
                const crpModal = document.getElementById('crp-upload-modal');

                if (btnUploadCrp && crpModal) {
                    btnUploadCrp.addEventListener('click', () => {
                        crpModal.classList.add('is-visible');
                    });

                    // Lógica para fechar o modal
                    crpModal.addEventListener('click', (e) => {
                        if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close') || e.target.classList.contains('modal-cancel')) {
                            crpModal.classList.remove('is-visible');
                        }
                    });

                    // Lógica para o input de arquivo
                    const fileInput = document.getElementById('crp-file-input');
                    const uploadText = document.getElementById('crp-upload-text');
                    fileInput.addEventListener('change', () => {
                        if (fileInput.files.length > 0) {
                            uploadText.textContent = `Arquivo: ${fileInput.files[0].name}`;
                        } else {
                            uploadText.textContent = 'Clique para selecionar um arquivo';
                        }
                    });

                    // Lógica para o botão de envio do modal
                    const confirmUploadBtn = document.getElementById('crp-upload-confirm');
                    confirmUploadBtn.addEventListener('click', async () => {
                        const file = fileInput.files[0];
                        if (!file) {
                            showToast('Por favor, selecione um arquivo.', 'error');
                            return;
                        }

                        // Chama a função de upload real
                        await uploadCrpDocument(file);
                        crpModal.classList.remove('is-visible');
                    });
                }
            }
        }
    }

    // Lógica da Página: CAIXA DE ENTRADA (Modal)
    async function inicializarLogicaDaCaixaDeEntrada() {
        // ... (Esta função permanece 100% igual) ...
    }

    // Lógica da Página: LISTA DE ESPERA
    async function inicializarListaDeEspera() {
        // ... (Esta função permanece 100% igual) ...
    }

    // =====================================================================
    // GERENCIADOR DE CARREGAMENTO DE PÁGINAS (Fetch e Roteador)
    // =====================================================================
    function loadPage(pageUrl) {
        if (!pageUrl) return;
        mainContent.innerHTML = '<p style="text-align:center; padding: 40px;">Carregando...</p>';
        
        fetch(pageUrl)
            .then(response => response.ok ? response.text() : Promise.reject(`Arquivo não encontrado: ${pageUrl}`))
            .then(html => {
                mainContent.innerHTML = html;
                
                // Roteador de Lógica: (Agora com o Header de Boas-vindas)
                if (pageUrl.endsWith('psi_visao_geral.html')) {
                    const welcomeEl = document.getElementById('psi-welcome-subtitle');
                    if (welcomeEl && psychologistData) {
                        welcomeEl.textContent = `Bem-vindo(a), ${psychologistData.nome.split(' ')[0]}!`;
                    }
                } else if (pageUrl.endsWith('psi_meu_perfil.html')) {
                    inicializarLogicaDoPerfil();
                } else if (pageUrl.includes('psi_caixa_de_entrada.html')) {
                    inicializarLogicaDaCaixaDeEntrada();
                } else if (pageUrl.includes('psi_lista_espera.html')) {
                    inicializarListaDeEspera();
                }

                // Dispara um evento customizado para que outros scripts (como o de toggle de senha) possam reagir
                document.dispatchEvent(new CustomEvent('page-loaded'));
            })
            .catch(error => {
                mainContent.innerHTML = `<div style="padding: 40px; text-align:center;"><h2>Página em Construção</h2><p>O conteúdo para esta seção estará disponível em breve.</p></div>`;
                console.error(error);
            });
    }


    // << 2. LÓGICA DE UPLOAD DE FOTO (MOVIDA E IMPLEMENTADA) >>
    async function uploadProfilePhoto(file, sidebarPhotoEl) {
        const token = localStorage.getItem('girassol_token');
        if (!file || !token) return;

        // Mostra um feedback de "carregando" (ex: escurecendo a foto)
        sidebarPhotoEl.style.opacity = '0.5';

        const formData = new FormData();
        formData.append('profilePhoto', file); // O 'name' deve bater com o esperado pelo Multer no backend

        try {
            const response = await fetch(`${API_BASE_URL}/api/psychologists/me/photo`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // NÃO defina 'Content-Type', o navegador faz isso por você com FormData
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                const newPhotoURL = result.fotoUrl; // A URL permanente do Cloudinary
                sidebarPhotoEl.src = newPhotoURL; // Atualiza a foto na tela
                psychologistData.fotoUrl = newPhotoURL; // Atualiza os dados locais
                showToast(result.message || 'Foto atualizada!', 'success');
            } else {
                throw new Error(result.error || 'Falha no upload.');
            }

        } catch (error) {
            console.error('Erro ao fazer upload da foto:', error);
            showToast(error.message, 'error');
            // Reverte para a foto antiga se o upload falhar
            sidebarPhotoEl.src = psychologistData.fotoUrl || 'https://placehold.co/40x40/1B4332/FFFFFF?text=Psi';
        } finally {
            // Restaura a opacidade
            sidebarPhotoEl.style.opacity = '1';
        }
    }

    // =====================================================================
    // FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO DO DASHBOARD
    // =====================================================================
    function initializeDashboard() {
        const dashboardContainer = document.getElementById('dashboard-container');
        if (dashboardContainer) {
            dashboardContainer.style.display = 'flex';
        }

        const sidebarPhotoEl = document.getElementById('psi-sidebar-photo');
        const sidebarNameEl = document.getElementById('psi-sidebar-name');
        if (sidebarNameEl && sidebarPhotoEl && psychologistData) {
            sidebarNameEl.textContent = psychologistData.nome; 
            sidebarPhotoEl.src = psychologistData.fotoUrl || 'https://placehold.co/40x40/1B4332/FFFFFF?text=Psi';
        }

        // --- LÓGICA PARA TROCA DE FOTO DE PERFIL (AGORA IMPLEMENTADA) ---
        const photoUploadInput = document.getElementById('profile-photo-upload');
        if (photoUploadInput && sidebarPhotoEl) {
            photoUploadInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    // Chama a nova função de upload
                    uploadProfilePhoto(file, sidebarPhotoEl);
                }
            });
        }

        // ... (O restante da sua função initializeDashboard permanece 100% igual) ...
        fetchUnreadCount();
        // CORREÇÃO 1: O seletor agora mira nos 'a' tags
        const navLinks = document.querySelectorAll('aside.dashboard-sidebar nav.sidebar-nav ul li a');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault(); // Impede o 'href'
                
                // CORREÇÃO 2: Remove 'active' de todos os 'li' pais
                navLinks.forEach(item => item.parentElement.classList.remove('active'));
                
                // CORREÇÃO 3: Adiciona 'active' ao 'li' pai do link clicado
                this.parentElement.classList.add('active');
                
                // A lógica de carregar a página permanece a mesma
                loadPage(this.getAttribute('data-page'));
            });
        });
        const logoutLink = document.querySelector('.sidebar-logout');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('girassol_token');
                window.location.href = '../login.html';
            });
        }
        const initialLink = document.querySelector('.sidebar-nav li[data-page="psi_visao_geral.html"]');
        if (initialLink) {
            navLinks.forEach(item => item.classList.remove('active'));
            initialLink.classList.add('active');
            loadPage(initialLink.getAttribute('data-page'));
        } else {
            loadPage('psi_visao_geral.html');
        }
    }

    // --- PONTO DE ENTRADA ---
    fetchPsychologistData().then(success => {
        if (success) {
            initializeDashboard();
        }
    });
});