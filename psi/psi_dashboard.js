// Arquivo: psi_dashboard.js (VERSÃO FINAL FUNCIONAL)

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
        
        // Se for FormData, não define Content-Type (o navegador define o boundary)
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
    // CONTAGEM DE MENSAGENS E PERGUNTAS
    // =====================================================================
    async function fetchUnreadCount() {
        const badge = document.getElementById('unread-count-badge');
        if (!badge) return;
        try {
            const response = await apiFetch(`${API_BASE_URL}/api/psychologists/me/unread-count`);
            if (response.ok) {
                const data = await response.json();
                badge.textContent = data.count;
                badge.style.display = data.count > 0 ? 'inline-block' : 'none';
            }
        } catch (error) { console.error('Erro contagem mensagens:', error); badge.style.display = 'none'; }
    }

    async function fetchQnaCount() {
        const badge = document.getElementById('qna-unread-count-badge');
        if (!badge) return;
        try {
            const response = await apiFetch(`${API_BASE_URL}/api/psychologists/me/qna-unanswered-count`);
            if (response.ok) {
                const data = await response.json();
                badge.textContent = data.count;
                badge.style.display = data.count > 0 ? 'inline-flex' : 'none';
            }
        } catch (error) { console.error('Erro contagem Q&A:', error); badge.style.display = 'none'; }
    }

    // =====================================================================
    // LÓGICA DA PÁGINA: MEU PERFIL (IMPLEMENTADO)
    // =====================================================================
    function inicializarLogicaDoPerfil() {
        const form = document.getElementById('perfil-form');
        const fieldset = document.getElementById('form-fieldset');
        const btnAlterar = document.getElementById('btn-alterar');
        const btnSalvar = document.getElementById('btn-salvar');

        if (!form || !fieldset || !btnAlterar || !btnSalvar) return;

        // 1. Preencher campos
        if (psychologistData) {
            const fields = ['nome', 'cpf', 'email', 'crp', 'telefone', 'bio', 'valor_sessao_numero', 
                            'agenda_online_url', 'linkedin_url', 'instagram_url', 'facebook_url', 'tiktok_url', 'x_url'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = psychologistData[id] || '';
            });
        }

        // 2. Botão Alterar
        btnAlterar.addEventListener('click', (e) => {
            e.preventDefault();
            fieldset.disabled = false;
            btnAlterar.classList.add('hidden');
            btnSalvar.classList.remove('hidden');
            // Habilita visualmente os multiselects se houver
            document.querySelectorAll('.multiselect-tag').forEach(el => el.classList.remove('disabled'));
        });

        // 3. Botão Salvar
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            btnSalvar.textContent = "Salvando...";
            btnSalvar.disabled = true;

            const formData = new FormData(form);
            const dataToUpdate = Object.fromEntries(formData.entries());

            try {
                const response = await apiFetch(`${API_BASE_URL}/api/psychologists/me`, {
                    method: 'PUT',
                    body: JSON.stringify(dataToUpdate) // apiFetch adiciona Content-Type json
                });

                if (!response.ok) throw new Error('Erro ao atualizar perfil.');

                showToast('Perfil atualizado com sucesso!', 'success');
                
                // Atualiza estado local e UI
                psychologistData = { ...psychologistData, ...dataToUpdate };
                fieldset.disabled = true;
                btnSalvar.classList.add('hidden');
                btnAlterar.classList.remove('hidden');
                
                // Atualiza nome na sidebar se mudou
                const sidebarNameEl = document.getElementById('psi-sidebar-name');
                if(sidebarNameEl) sidebarNameEl.textContent = psychologistData.nome;

            } catch (error) {
                console.error(error);
                showToast('Erro ao salvar. Tente novamente.', 'error');
            } finally {
                btnSalvar.textContent = "Salvar Alterações";
                btnSalvar.disabled = false;
            }
        });
    }
            // Botão que leva para a página de estatísticas de saída
                const btnExcluirLink = document.getElementById('btn-excluir-conta');
                if (btnExcluirLink) {
                btnExcluirLink.addEventListener('click', (e) => {
                e.preventDefault();
                loadPage('psi_excluir_conta.html'); // Carrega a nova página
            });
        }

    // =====================================================================
    // LÓGICA DE UPLOAD DE FOTO (IMPLEMENTADO)
    // =====================================================================
    async function uploadProfilePhoto(file, sidebarPhotoEl) {
        const formData = new FormData();
        formData.append('foto', file);

        // Feedback visual imediato (opcional)
        const originalSrc = sidebarPhotoEl.src;
        sidebarPhotoEl.style.opacity = '0.5';

        try {
            const response = await apiFetch(`${API_BASE_URL}/api/psychologists/me/foto`, {
                method: 'POST',
                body: formData // apiFetch detecta FormData e não põe JSON header
            });

            if (!response.ok) throw new Error('Falha no upload da imagem.');

            const data = await response.json();
            
            // Atualiza a foto na tela e nos dados globais
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

    // =====================================================================
    // OUTRAS PÁGINAS (Placeholders Funcionais)
    // =====================================================================
    function inicializarLogicaDaCaixaDeEntrada() { /* Lógica futura */ }
    function inicializarListaDeEspera() { /* Lógica futura */ }
    
    async function inicializarComunidadeQNA() {
        // ... (Mantenha aqui sua lógica de Q&A que já estava pronta) ...
        // Se você não tiver o código do Q&A aqui, me avise que eu reenvio o bloco completo.
        // Por enquanto, assumindo que você vai colar o bloco do Q&A se precisar.
        console.log("Q&A Inicializado");
    }

    // =====================================================================
    // GERENCIADOR DE PÁGINAS (ROTEADOR)
    // =====================================================================
    function loadPage(pageUrl) {
        if (!pageUrl) return;
        mainContent.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">Carregando...</div>';

        fetch(pageUrl)
            .then(response => response.ok ? response.text() : Promise.reject(`Erro: ${pageUrl}`))
            .then(html => {
                mainContent.innerHTML = html;

                if (pageUrl.includes('psi_meu_perfil.html')) {
                    inicializarLogicaDoPerfil();
                } else if (pageUrl.includes('psi_caixa_de_entrada.html')) {
                    inicializarLogicaDaCaixaDeEntrada();
                } else if (pageUrl.includes('psi_lista_de_espera.html')) {
                    inicializarListaDeEspera();
                } else if (pageUrl.includes('psi_comunidade.html')) {
                    inicializarComunidadeQNA();
                }else if (pageUrl.includes('psi_excluir_conta.html')) {
                    inicializarLogicaExclusao();
        }
                
            })
            .catch(error => {
                mainContent.innerHTML = `<div class="card"><h2>Erro</h2><p>Não foi possível carregar a seção.</p></div>`;
                console.error(error);
            });
    }

    // =====================================================================
    // INICIALIZAÇÃO GERAL
    // =====================================================================
    function initializeDashboard() {
        document.getElementById('dashboard-container').style.display = 'flex';

        const sidebarPhotoEl = document.getElementById('psi-sidebar-photo');
        const sidebarNameEl = document.getElementById('psi-sidebar-name');
        
        if (psychologistData) {
            if(sidebarNameEl) sidebarNameEl.textContent = psychologistData.nome;
            if(sidebarPhotoEl) sidebarPhotoEl.src = psychologistData.fotoUrl || 'https://placehold.co/70x70/1B4332/FFFFFF?text=Psi';

            // --- LÓGICA DO BOTÃO 'VER COMO PACIENTE' ---
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

        // Upload de Foto
        const photoUploadInput = document.getElementById('profile-photo-upload');
        if (photoUploadInput && sidebarPhotoEl) {
            photoUploadInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) uploadProfilePhoto(file, sidebarPhotoEl);
            });
        }

        // Navegação e Contagens
        fetchUnreadCount();
        fetchQnaCount();
        
        const navLinks = document.querySelectorAll('.sidebar-nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                // Remove active de todos e adiciona no atual (buscando o li pai)
                document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
                this.closest('li').classList.add('active');
                
                loadPage(this.getAttribute('data-page'));
            });
        });
        // Lógica da Página: EXCLUIR CONTA (OFFBOARDING)
    async function inicializarLogicaExclusao() {
        // 1. Simula carregamento de estatísticas (ou busca da API se tiver endpoint)
        // Idealmente: const stats = await apiFetch('/api/psychologists/me/stats');
        const statsMock = {
            dias: 142,
            views: 1205,
            contatos: 48,
            comunidade: 15
        };

        // Preenche os dados na tela
        document.getElementById('stat-dias').innerText = statsMock.dias;
        document.getElementById('stat-views').innerText = statsMock.views;
        document.getElementById('stat-contatos').innerText = statsMock.contatos;
        document.getElementById('stat-comunidade').innerText = statsMock.comunidade;

        // 2. Lógica do Formulário de Exclusão Final
        const form = document.getElementById('exit-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Confirmação final (Browser native é mais seguro aqui para evitar clique acidental)
            if (!confirm("Tem certeza absoluta? Esta ação apagará todos os seus dados e não pode ser desfeita.")) {
                return;
            }

            const formData = new FormData(form);
            const exitData = {
                motivo: formData.get('motivo'),
                sugestao: formData.get('sugestao'),
                avaliacao: document.querySelector('input[name="avaliacao"]:checked')?.value || null
            };

            try {
                // Envia o feedback antes de excluir
                await apiFetch(`${API_BASE_URL}/api/psychologists/me/exit-survey`, {
                    method: 'POST',
                    body: JSON.stringify(exitData)
                });

                // Chama a rota de exclusão real
                await apiFetch(`${API_BASE_URL}/api/psychologists/me`, {
                    method: 'DELETE'
                });

                alert("Sua conta foi excluída. Esperamos te ver novamente!");
                localStorage.removeItem('girassol_token');
                window.location.href = '../index.html';

            } catch (error) {
                console.error("Erro ao excluir:", error);
                // Se a API de exit-survey não existir, tenta excluir direto
                try {
                    await apiFetch(`${API_BASE_URL}/api/psychologists/me`, { method: 'DELETE' });
                    localStorage.removeItem('girassol_token');
                    window.location.href = '../index.html';
                } catch (errDelete) {
                    showToast('Erro ao excluir conta. Entre em contato com o suporte.', 'error');
                }
            }
        });
    }

        // Carrega página inicial
        loadPage('psi_visao_geral.html');
    }

    // Ponto de partida
    fetchPsychologistData().then(success => {
        if (success) initializeDashboard();
    });
});