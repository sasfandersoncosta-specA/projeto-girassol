document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.getElementById('main-content');

    function logout() {
        localStorage.removeItem('girassol_token');
        window.location.replace('login.html');
    }

    async function initializeAndProtect() {
        const token = localStorage.getItem('girassol_token');
        if (!token) { logout(); return; }

        try {
            const response = await fetch('/api/admin/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Token inválido');

            const admin = await response.json();
            window.adminId = admin.id;
            
            const adminNameEl = document.querySelector('.nome-admin');
            if (adminNameEl) adminNameEl.textContent = admin.nome;

            setupPageNavigation();
            updateWelcomeMessage();

        } catch (error) {
            console.error("Auth Error:", error);
            logout();
        }
    }

    function updateWelcomeMessage() {
        const pageTitle = document.querySelector('.titulo-pagina h1');
        const adminName = document.querySelector('.nome-admin')?.textContent.split(' ')[0] || 'Admin';
        if (pageTitle && mainContent && mainContent.innerHTML.includes('kpi-grid')) {
            pageTitle.textContent = `Bem-vindo, ${adminName}!`;
        }
    }

    function setupPageNavigation() {
        const navLinks = document.querySelectorAll('.sidebar-nav li');
        
        function loadPage(pageUrl) {
            const absolutePageUrl = `/admin/${pageUrl}`;
            mainContent.innerHTML = '<p style="text-align:center; padding: 40px;">Carregando...</p>';
    
            fetch(absolutePageUrl)
                .then(r => r.ok ? r.text() : Promise.reject(pageUrl))
                .then(html => {
                    mainContent.innerHTML = html;
                    
                    // Remove script antigo e insere o novo
                    const oldScript = document.getElementById('dynamic-page-script');
                    if (oldScript) oldScript.remove();

                    const script = document.createElement('script');
                    script.src = absolutePageUrl.replace('.html', '.js');
                    script.id = 'dynamic-page-script';
                    
                    script.onload = () => {
                        if (typeof window.initializePage === 'function') window.initializePage();
                    };
                    document.body.appendChild(script);
                    updateWelcomeMessage();
                })
                .catch(e => mainContent.innerHTML = '<p>Erro ao carregar conteúdo.</p>');
        }
            
        const initialLink = document.querySelector('.sidebar-nav li.active');
        if (initialLink) loadPage(initialLink.getAttribute('data-page'));

        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                navLinks.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                loadPage(this.getAttribute('data-page'));
            });
        });
    }

    // --- AQUI ESTÁ A CORREÇÃO DO MODAL ---
    function setupConfirmationModal() {
        const modal = document.getElementById('confirmation-modal');
        
        // Se não achar o modal no HTML, avisa no console
        if (!modal) {
            console.warn("Modal HTML não encontrado em admin.html");
            return;
        }

        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        let confirmCallback = null;

        // Função para FECHAR (Esconde na marra)
        const closeModal = () => {
            modal.style.display = 'none'; // <--- Força display none
            confirmCallback = null;
        };

        // Função Global para ABRIR (Mostra na marra)
        window.openConfirmationModal = (title, body, onConfirm) => {
            const titleEl = document.getElementById('modal-title');
            const bodyEl = document.getElementById('modal-body');
            
            if(titleEl) titleEl.textContent = title;
            if(bodyEl) bodyEl.innerHTML = body;
            
            confirmCallback = onConfirm;
            modal.style.display = 'flex'; // <--- Força display flex (visível)
        };

        if(confirmBtn) confirmBtn.onclick = () => {
            if (typeof confirmCallback === 'function') confirmCallback();
            closeModal();
        };

        if(cancelBtn) cancelBtn.onclick = closeModal;
        
        // Fecha se clicar fora
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }

    function setupGlobalEvents() {
        const logoutButton = document.querySelector('.btn-sair');
        if (logoutButton) logoutButton.onclick = (e) => { e.preventDefault(); logout(); };
    }

    initializeAndProtect();
    setupConfirmationModal();
    setupGlobalEvents();
});