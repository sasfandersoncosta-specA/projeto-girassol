document.addEventListener('DOMContentLoaded', function() {
    // Seletores dos elementos principais
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('.sidebar-nav li');
    const sidebar = document.querySelector('.dashboard-sidebar');
    const toggleButton = document.querySelector('.btn-toggle-sidebar'); // Seletor corrigido para o botão

    /**
     * Função principal: busca o conteúdo de um arquivo HTML e o insere na página.
     */
    function loadPage(pageUrl) {
        if (!pageUrl) return;

        // Mostra um feedback de carregamento
        mainContent.innerHTML = '<p style="text-align:center; padding: 40px;">Carregando...</p>';

        fetch(pageUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Arquivo não encontrado: ${pageUrl}`);
                }
                return response.text();
            })
            .then(html => {
                mainContent.innerHTML = html;
            })
            .catch(error => {
                mainContent.innerHTML = `<div style="padding: 20px;"><h2>Página em Construção</h2><p>O conteúdo para esta seção estará disponível em breve.</p></div>`;
                console.error('Erro ao carregar a página:', error);
            });
    }

    // --- INICIALIZAÇÃO E EVENTOS ---

    // 1. Carrega a página inicial ao entrar no dashboard
    const initialLink = document.querySelector('.sidebar-nav li.active');
    if (initialLink) {
        const initialPage = initialLink.getAttribute('data-page');
        loadPage(initialPage); 
    }

    // 2. Adiciona o evento de clique para cada link da navegação
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Atualiza o estado 'ativo' no menu
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            
            // Carrega a página correspondente
            const pageToLoad = this.getAttribute('data-page');
            loadPage(pageToLoad);

            // No mobile, fecha a sidebar após clicar
            if (window.innerWidth <= 992 && sidebar && sidebar.classList.contains('ativo')) {
                sidebar.classList.remove('ativo');
            }
        });
    });

    // 3. Adiciona o evento para o botão de menu mobile
    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', function() {
            sidebar.classList.toggle('ativo');
        });
    }
});