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
    function inicializarLogicaDoPerfil() {
        // ... (Esta função permanece 100% igual, exceto que showToast foi movida) ...
        
        // (Todo o código de inicializarLogicaDoPerfil() vai aqui, exatamente como estava antes)
        // ...
        // ...
        
        // (A função showToast() FOI REMOVIDA DAQUI)
    }
    // Em: psi_dashboard.js, dentro de inicializarLogicaDoPerfil()
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
        // ... (todo o seu código existente de 'inicializarLogicaDoPerfil' aqui) ...
    
        // --- 3. LÓGICA DE VERIFICAÇÃO (Problema 3) ---
        const widget = document.getElementById('verification-widget');
        const statusText = document.getElementById('verification-status-text');
        const description = document.getElementById('verification-description');
    
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
                    <button class="btn btn-secundario" id="btn-upload-crp-perfil">Enviar CRP</button>`;
                
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
                if (pageUrl.includes('psi_visao_geral.html')) {
                    const welcomeEl = document.getElementById('psi-welcome-subtitle');
                    if (welcomeEl && psychologistData) {
                        welcomeEl.textContent = `Bem-vindo(a), ${psychologistData.nome.split(' ')[0]}!`;
                    }
                } else if (pageUrl.includes('psi_meu_perfil.html')) {
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
        const navLinks = document.querySelectorAll('aside.dashboard-sidebar nav.sidebar-nav ul li');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                navLinks.forEach(item => item.classList.remove('active'));
                this.classList.add('active');
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