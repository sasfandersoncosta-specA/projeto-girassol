document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('.sidebar-nav li');

    // Função para carregar o conteúdo de uma página via Fetch API
    function loadPage(pageUrl) {
        // Não faz nada se o link clicado não tiver um 'data-page'
        if (!pageUrl) {
            console.warn('Link clicado não possui o atributo data-page.');
            return;
        }

        fetch(pageUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Página não encontrada: ${pageUrl}`);
                }
                return response.text();
            })
            .then(html => {
                mainContent.innerHTML = html;
            })
            .catch(error => {
                // Exibe uma mensagem de erro amigável se a página não existir
                mainContent.innerHTML = `<div style="padding: 40px;">
                                            <h1>Página em Construção</h1>
                                            <p>O conteúdo para esta seção ainda não foi criado. O arquivo <strong>${pageUrl}</strong> não foi encontrado.</p>
                                        </div>`;
                console.error('Erro ao carregar página:', error);
            });
    }

    // Carrega a página inicial do dashboard (a que tiver a classe 'active' no menu)
    const initialPage = document.querySelector('.sidebar-nav li.active')?.getAttribute('data-page');
    if (initialPage) {
        loadPage(initialPage);
    }

    // Adiciona o evento de clique para cada item do menu
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // Impede que o link '#' recarregue a página

            // Remove a classe 'active' de todos os outros links
            navLinks.forEach(item => item.classList.remove('active'));
            
            // Adiciona a classe 'active' apenas ao link que foi clicado
            this.classList.add('active');

            // Pega o nome do arquivo do atributo 'data-page' e carrega o conteúdo
            const pageToLoad = this.getAttribute('data-page');
            loadPage(pageToLoad);
        });
    });
});
document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('.sidebar-nav li');

    // Função para carregar o conteúdo de uma página (que já tínhamos)
    function loadPage(pageUrl) {
        if (!pageUrl) return;

        fetch(pageUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Página não encontrada: ${pageUrl}`);
                return response.text();
            })
            .then(html => {
                mainContent.innerHTML = html;
            })
            .catch(error => {
                mainContent.innerHTML = `<div style="padding: 40px;"><h1>Erro</h1><p>O conteúdo para esta seção não foi encontrado. Verifique se o arquivo <strong>${pageUrl}</strong> existe.</p></div>`;
                console.error('Erro:', error);
            });
    }

    // Carrega a página inicial
    const initialPage = document.querySelector('.sidebar-nav li.active')?.getAttribute('data-page');
    if (initialPage) {
        loadPage(initialPage);
    }

    // SUA LÓGICA DE NAVEGAÇÃO, AGORA INTEGRADA:
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove a classe 'active' de todos
            navLinks.forEach(item => item.classList.remove('active'));

            // Adiciona 'active' ao clicado
            this.classList.add('active');

            // Pega o nome do arquivo do atributo e carrega o conteúdo
            const pageToLoad = this.getAttribute('data-page');
            loadPage(pageToLoad);
        });
    });
});