document.addEventListener('DOMContentLoaded', function() {

    // Declaração de mainContent no escopo superior para acesso global dentro do módulo.
    const mainContent = document.getElementById('main-content');

    /**
     * Função de Logout: Limpa o token e redireciona para a página de login.
     */
    function logout() {
        localStorage.removeItem('girassol_token');
        window.location.replace('login.html');
    }

    /**
     * Função de Segurança: Verifica se o token é válido antes de carregar a página.
     * Se o token for inválido, força o logout.
     */
    async function initializeAndProtect() {
        const token = localStorage.getItem('girassol_token');
        if (!token) {
            logout();
            return; // Interrompe a execução
        }

        try {
            // Faz uma chamada à API para validar o token e buscar os dados do admin
            const response = await fetch('http://localhost:3001/api/admin/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                // Se o token for inválido (expirado, etc.), a API retornará um erro (401, 403)
                throw new Error('Token inválido ou expirado.');
            }

            const admin = await response.json();
            
            // Se a validação passou, atualiza a UI e configura a página
            window.adminId = admin.id; // Armazena o ID do admin globalmente
            const adminNameEl = document.querySelector('.nome-admin');
            if (adminNameEl) adminNameEl.textContent = admin.nome;

            // Somente após a validação bem-sucedida, configuramos a navegação
            setupPageNavigation();

        } catch (error) {
            console.error("Falha na validação do token:", error.message);
            logout(); // Força o logout se o token for inválido
        }
    }

    /**
     * Atualiza o título da página de boas-vindas.
     */
    function updateWelcomeMessage() {
        const pageTitle = document.querySelector('.titulo-pagina h1');
        const adminName = document.querySelector('.nome-admin')?.textContent.split(' ')[0] || 'Admin';
        if (pageTitle && mainContent && mainContent.innerHTML.includes('kpi-grid')) { // Verifica se a visão geral está carregada
            pageTitle.textContent = `Bem-vindo, ${adminName}!`;
        }
    }
    /**
     * Configura toda a navegação e eventos da página DEPOIS que a autenticação for validada.
     */
    function setupPageNavigation() {
        const navLinks = document.querySelectorAll('.sidebar-nav li');
        const sidebar = document.querySelector('.dashboard-sidebar');
        const toggleButton = document.getElementById('toggleSidebar');
        const logoutButton = document.querySelector('.btn-sair');

        // Adiciona o evento de clique ao botão de sair
        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }

        /**
         * Função principal: busca o conteúdo de um arquivo HTML e o insere na página.
         */
        function loadPage(pageUrl) {
            if (!pageUrl) return;
    
            // Mostra um feedback de carregamento
            mainContent.innerHTML = '<p style="text-align:center; padding: 40px;">Carregando...</p>';
    
            fetch(pageUrl) // O caminho já está correto, ex: "admin_visao_geral.html"
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Arquivo não encontrado: ${pageUrl}`);
                    }
                    return response.text();
                })
                .then(html => {
                    mainContent.innerHTML = html;
    
                    // --- LÓGICA DE CARREGAMENTO DE SCRIPT APRIMORADA ---
                    // Remove qualquer script de página carregado anteriormente para evitar duplicação.
                    const oldScript = document.getElementById('dynamic-page-script');
                    if (oldScript) {
                        oldScript.remove();
                    }

                    const scriptName = pageUrl.replace('.html', '.js');
                    const script = document.createElement('script');
                    script.src = scriptName;
                    script.id = 'dynamic-page-script'; // Adiciona um ID para fácil remoção no futuro
                    document.body.appendChild(script);

                    // Tenta chamar a função de inicialização da página recém-carregada
                    // O nome da função deve ser padronizado, ex: initializeVisaoGeralPage()
                    script.onload = () => {
                        if (typeof window.initializePage === 'function') {
                            window.initializePage();
                        }
                    };

                    // Atualiza a mensagem de boas-vindas se a página for a visão geral
                    updateWelcomeMessage();
    
                })
                .catch(error => {
                    mainContent.innerHTML = `<div style="padding: 20px;"><h2>Página em Construção</h2><p>O conteúdo para esta seção estará disponível em breve.</p></div>`;
                    console.error('Erro ao carregar a página:', error);
                });
        }
            
        // Carrega a página inicial ao entrar no dashboard
        const initialLink = document.querySelector('.sidebar-nav li.active');
        if (initialLink) {
            const initialPage = initialLink.getAttribute('data-page');
            loadPage(initialPage); 
        }

         // Adiciona o evento de clique para cada link da navegação
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();

                navLinks.forEach(item => item.classList.remove('active'));
                this.classList.add('active');
                
                const pageToLoad = this.getAttribute('data-page');
                loadPage(pageToLoad);

                if (window.innerWidth <= 992 && sidebar && sidebar.classList.contains('ativo')) {
                    sidebar.classList.remove('ativo');
                }
            });
        });

         // Adiciona o evento para o botão de menu mobile
        if (toggleButton && sidebar) {
            toggleButton.addEventListener('click', () => sidebar.classList.toggle('ativo'));
        }

        // Ouve o evento de atualização de dados para atualizar a UI
        window.addEventListener('adminDataUpdated', updateWelcomeMessage);
    }

    /**
     * Controla o modal de confirmação genérico.
     */
    function setupConfirmationModal() {
        const modal = document.getElementById('confirmation-modal');
        if (!modal) return;

        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        const closeBtn = document.getElementById('modal-close-btn');
        let confirmCallback = null;

        const closeModal = () => {
            modal.setAttribute('aria-hidden', 'true');
            confirmCallback = null; // Limpa o callback para evitar execuções acidentais
        };

        // Função global para abrir o modal
        window.openConfirmationModal = (title, body, onConfirm) => {
            document.getElementById('modal-title').textContent = title;
            document.getElementById('modal-body').innerHTML = body;
            confirmCallback = onConfirm;
            modal.setAttribute('aria-hidden', 'false');
        };

        confirmBtn.addEventListener('click', () => {
            if (typeof confirmCallback === 'function') {
                confirmCallback();
            }
            closeModal();
        });

        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Ponto de entrada: Inicia a verificação de segurança.
    initializeAndProtect();
    setupConfirmationModal(); // Inicializa o modal
});
