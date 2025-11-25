console.log("Script carregado!"); // Para confirmar no F12

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Lógica do Menu Hambúrguer
    const menuBtn = document.querySelector('.menu-hamburguer');
    const navContainer = document.querySelector('.container-navegacao');

    if (menuBtn && navContainer) {
        menuBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Evita comportamentos padrão
            navContainer.classList.toggle('ativo');
            console.log("Menu clicado! Classe 'ativo':", navContainer.classList.contains('ativo'));
        });
    } else {
        console.warn("Menu ou Container de navegação não encontrados no HTML.");
    }

    // 2. Lógica do Header Rolagem (Muda cor ao descer)
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('header-rolagem');
        } else {
            header.classList.remove('header-rolagem');
        }
    });
});

// Função global de fallback (caso o HTML chame via onclick)
function toggleMenu() {
    const nav = document.querySelector('.container-navegacao');
    if (nav) nav.classList.toggle('ativo');
}
/* Adicione ao final do public/script.js */

// Lógica do Acordeão (FAQ)
const acordeoes = document.querySelectorAll('.acordeao-titulo');

if (acordeoes.length > 0) {
    acordeoes.forEach(acc => {
        acc.addEventListener('click', function() {
            // 1. Alterna a classe 'ativo' no título (para girar a setinha se tiver CSS pra isso)
            this.classList.toggle('ativo');

            // 2. Pega o painel de conteúdo logo abaixo do botão
            const painel = this.nextElementSibling;

            // 3. Se já estiver aberto (maxHeight definido), fecha. Se não, abre calculando a altura.
            if (painel.style.maxHeight) {
                painel.style.maxHeight = null;
            } else {
                painel.style.maxHeight = painel.scrollHeight + "px";
            }
        });
    });
}