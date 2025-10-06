// --- FUNÇÕES PRINCIPAIS ---

/**
 * Carrega um componente HTML de uma URL e o insere em um elemento da página.
 * @param {string} url - O caminho para o arquivo HTML a ser carregado (ex: 'header.html').
 * @param {string} elementoId - O ID do elemento onde o HTML será inserido (ex: 'header-placeholder').
 */
function carregarComponente(url, elementoId) {
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Não foi possível carregar o componente: ' + url);
            }
            return response.text();
        })
        .then(data => {
            const elemento = document.getElementById(elementoId);
            if (elemento) {
                elemento.innerHTML = data;
            }
        })
        .catch(error => console.error('Erro ao carregar componente:', error));
}

/**
 * Inicializa todos os scripts interativos da página.
 * Esta função é chamada DEPOIS que o header e o footer são carregados.
 */
function inicializarScripts() {
    
    // --- LÓGICA PARA O MENU HAMBÚRGUER ---
    const menuHamburguer = document.querySelector('.menu-hamburguer');
    const containerNavegacao = document.querySelector('.container-navegacao');
    if (menuHamburguer && containerNavegacao) {
        menuHamburguer.addEventListener('click', () => {
            containerNavegacao.classList.toggle('ativo');
        });
    }

    // --- LÓGICA PARA MUDAR COR DO HEADER AO ROLAR ---
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('header-rolagem');
            } else {
                header.classList.remove('header-rolagem');
            }
        });
    }

    // --- LÓGICA PARA ANIMAÇÃO DE SCROLL DAS SEÇÕES ---
    const elementosOcultos = document.querySelectorAll('.hidden');
    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                entrada.target.classList.remove('hidden');
                observador.unobserve(entrada.target); // Opcional: faz a animação rodar só uma vez por elemento
            }
        });
    });
    elementosOcultos.forEach((el) => observador.observe(el));

    // --- LÓGICA PARA O ACORDEÃO (FAQ) ---
    const titulosAcordeao = document.querySelectorAll('.acordeao-titulo');
    titulosAcordeao.forEach(titulo => {
        titulo.addEventListener('click', () => {
            titulo.classList.toggle('ativo');
            const conteudo = titulo.nextElementSibling;
            if (conteudo.style.maxHeight) {
                conteudo.style.maxHeight = null;
            } else {
                conteudo.style.maxHeight = conteudo.scrollHeight + "px";
            } 
        });
    });
}

// --- PONTO DE ENTRADA PRINCIPAL ---
// Espera a estrutura inicial da página (DOM) ser carregada
document.addEventListener("DOMContentLoaded", () => {
    // Tenta carregar o header e o footer ao mesmo tempo
    Promise.all([
        carregarComponente('header.html', 'header-placeholder'),
        carregarComponente('footer.html', 'footer-placeholder')
    ]).then(() => {
        // SOMENTE DEPOIS que ambos forem carregados com sucesso,
        // a função para inicializar os scripts (menus, animações, etc.) é chamada.
        inicializarScripts();
    });
});