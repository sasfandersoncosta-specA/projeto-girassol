document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('.sidebar-nav li');
    const sidebar = document.querySelector('.dashboard-sidebar');
    const toggleButton = document.getElementById('toggleSidebar');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');

    // Função para carregar conteúdo de uma página
    function loadPage(pageUrl, title, subtitle) {
        if (!pageUrl) return;

        fetch(pageUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Página não encontrada: ${pageUrl}`);
                return response.text();
            })
            .then(html => {
                mainContent.innerHTML = html;
                if (title) pageTitle.textContent = title;
                if (subtitle) pageSubtitle.textContent = subtitle;
            })
            .catch(error => {
                mainContent.innerHTML = `<div style="padding: 20px;"><h2>Página em Construção</h2><p>O arquivo <strong>${pageUrl}</strong> não foi encontrado.</p></div>`;
                console.error('Erro:', error);
            });
    }

    // Carrega a página inicial
    const initialLink = document.querySelector('.sidebar-nav li.active');
    if (initialLink) {
        const initialPage = initialLink.getAttribute('data-page');
        const initialTitle = initialLink.querySelector('a').textContent;
        // Você pode adicionar um data-subtitle no HTML para o subtítulo
        loadPage(initialPage, initialTitle, "Resumo vital da saúde da plataforma."); 
    }

    // Evento de clique para os links da navegação
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            
            const pageToLoad = this.getAttribute('data-page');
            const newTitle = this.querySelector('a').textContent;
            // Adapte o subtítulo conforme necessário
            loadPage(pageToLoad, newTitle, "Gerencie os dados desta seção.");

            // Esconde a sidebar no mobile após clicar em um link
            if (window.innerWidth <= 992) {
                sidebar.classList.remove('ativo');
            }
        });
    });

    // Evento de clique para o botão de menu mobile
    if (toggleButton) {
        toggleButton.addEventListener('click', function() {
            sidebar.classList.toggle('ativo');
        });
    }
});