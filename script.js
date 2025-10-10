// --- FUNÇÕES PRINCIPAIS ---

/**
 * Carrega um componente HTML de uma URL e o insere em um elemento da página.
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
                observador.unobserve(entrada.target);
            }
        });
    });
    elementosOcultos.forEach((el) => observador.observe(el));

    // --- LÓGICA PARA O ACORDEÃO 'INTELIGENTE' (SÓ UM ABERTO POR VEZ) ---
const titulosAcordeao = document.querySelectorAll('.acordeao-titulo');
titulosAcordeao.forEach(tituloClicado => {
    tituloClicado.addEventListener('click', () => {
        // Fecha todos os outros itens antes de abrir o novo
        titulosAcordeao.forEach(outroTitulo => {
            if (outroTitulo !== tituloClicado) {
                outroTitulo.classList.remove('ativo');
                outroTitulo.nextElementSibling.style.maxHeight = null;
            }
        });

        // Abre ou fecha o item que foi clicado
        tituloClicado.classList.toggle('ativo');
        const conteudo = tituloClicado.nextElementSibling;
        if (conteudo.style.maxHeight) {
            conteudo.style.maxHeight = null;
        } else {
            conteudo.style.maxHeight = conteudo.scrollHeight + "px";
        } 
    });
});

    // --- LÓGICA PARA A BUSCA 'LIMPA' NA PÁGINA FAQ ---
const campoBusca = document.getElementById('faq-busca');
if (campoBusca) {
    const todosItens = document.querySelectorAll('.faq-categoria .acordeao-item');
    const todosTitulosCategoria = document.querySelectorAll('.faq-categoria .titulo-secao-menor');

    campoBusca.addEventListener('input', () => {
        const termoBusca = campoBusca.value.toLowerCase().trim();

        // Esconde ou mostra os títulos das categorias
        todosTitulosCategoria.forEach(titulo => {
            titulo.style.display = termoBusca.length > 0 ? 'none' : 'block';
        });

        // Filtra as perguntas e respostas
        todosItens.forEach(item => {
            const textoPergunta = item.querySelector('.acordeao-titulo').textContent.toLowerCase();
            const textoResposta = item.querySelector('.acordeao-conteudo p').textContent.toLowerCase();

            if (textoPergunta.includes(termoBusca) || textoResposta.includes(termoBusca)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

} // Fim da função inicializarScripts()


// --- PONTO DE ENTRADA PRINCIPAL ---
document.addEventListener("DOMContentLoaded", () => {
    Promise.all([
        carregarComponente('header.html', 'header-placeholder'),
        carregarComponente('footer.html', 'footer-placeholder')
    ]).then(() => {
        inicializarScripts();
    });
});

// (o código da busca do FAQ termina aqui)

    // --- LÓGICA PARA VALIDAR SENHA NA PÁGINA DE REGISTRO ---
    const campoSenha = document.getElementById('senha');
    const campoConfirmarSenha = document.getElementById('confirmar-senha');

    if (campoSenha && campoConfirmarSenha) {
        const form = document.querySelector('.login-form');
        
        form.addEventListener('submit', (evento) => {
            if (campoSenha.value !== campoConfirmarSenha.value) {
                // Impede o formulário de ser enviado
                evento.preventDefault(); 
                
                // Avisa o usuário
                alert('As senhas não conferem. Por favor, digite novamente.');

                // Limpa os campos de senha
                campoSenha.value = '';
                campoConfirmarSenha.value = '';
                campoSenha.focus(); // Coloca o cursor no primeiro campo de senha
            }
        });
    }

} // Esta é a chave de fechamento da função inicializarScripts()
