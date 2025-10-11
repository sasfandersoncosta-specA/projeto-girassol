// --- FUNÇÕES PRINCIPAIS ---

function carregarComponente(url, elementoId) {
    // ... (esta função está perfeita, não muda)
    return fetch(url).then(response => { if (!response.ok) { throw new Error('Não foi possível carregar o componente: ' + url); } return response.text(); }).then(data => { const elemento = document.getElementById(elementoId); if (elemento) { elemento.innerHTML = data; } }).catch(error => console.error('Erro ao carregar componente:', error));
}

function inicializarScripts() {
    
    // --- LÓGICA PARA O MENU HAMBÚRGUER ---
    // ... (esta parte está perfeita, não muda)
    const menuHamburguer = document.querySelector('.menu-hamburguer'); const containerNavegacao = document.querySelector('.container-navegacao'); if (menuHamburguer && containerNavegacao) { menuHamburguer.addEventListener('click', () => { containerNavegacao.classList.toggle('ativo'); }); }

    // --- LÓGICA PARA MUDAR COR DO HEADER AO ROLAR ---
    // ... (esta parte está perfeita, não muda)
    const header = document.querySelector('header'); if (header) { window.addEventListener('scroll', () => { if (window.scrollY > 50) { header.classList.add('header-rolagem'); } else { header.classList.remove('header-rolagem'); } }); }


// --- LÓGICA PARA ANIMAÇÃO DE SCROLL DAS SEÇÕES ---

// Não precisa do setTimeout, a causa era o CSS.
const elementosOcultos = document.querySelectorAll('.hidden');

if (elementosOcultos.length > 0) {
    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                // A MÁGICA ACONTECE AQUI:
                entrada.target.classList.add('visivel'); // Adiciona a classe para animar a aparição
                observador.unobserve(entrada.target); // Para de observar o elemento que já apareceu
            }
        });
    }, {
        rootMargin: '0px 0px -50px 0px' // A animação começa um pouco depois do elemento entrar na tela
    });

    elementosOcultos.forEach((el) => observador.observe(el));
}

    // --- LÓGICA PARA O ACORDEÃO 'INTELIGENTE' ---
    // ... (esta parte está perfeita, não muda)
    const titulosAcordeao = document.querySelectorAll('.acordeao-titulo'); titulosAcordeao.forEach(tituloClicado => { tituloClicado.addEventListener('click', () => { titulosAcordeao.forEach(outroTitulo => { if (outroTitulo !== tituloClicado) { outroTitulo.classList.remove('ativo'); outroTitulo.nextElementSibling.style.maxHeight = null; } }); tituloClicado.classList.toggle('ativo'); const conteudo = tituloClicado.nextElementSibling; if (conteudo.style.maxHeight) { conteudo.style.maxHeight = null; } else { conteudo.style.maxHeight = conteudo.scrollHeight + "px"; } }); });

    // ... (O restante das suas lógicas de FAQ, senha, modal, etc. estão perfeitas e não mudam)

} // Fim da função inicializarScripts()


// --- PONTO DE ENTRADA PRINCIPAL (NÃO MUDA) ---
document.addEventListener("DOMContentLoaded", () => {
    Promise.all([
        carregarComponente('header.html', 'header-placeholder'),
        carregarComponente('footer.html', 'footer-placeholder')
    ]).then(() => {
        inicializarScripts();
    });
});