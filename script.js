// --- FUNÇÕES PRINCIPAIS ---

function carregarComponente(url, elementoId) {
    // ... (esta função está perfeita, não muda)
    return fetch(url).then(response => { if (!response.ok) { throw new Error('Não foi possível carregar o componente: ' + url); } return response.text(); }).then(data => { const elemento = document.getElementById(elementoId); if (elemento) { elemento.innerHTML = data; } }).catch(error => console.error('Erro ao carregar componente:', error));
}

async function carregarVitrineTerapeutas() {
    const container = document.getElementById('vitrine-terapeutas');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/psychologists/showcase`);
        if (!response.ok) throw new Error('Falha ao buscar dados da vitrine');
        
        const psicologos = await response.json();

        // Mapeia os psicólogos para os elementos de imagem existentes
        const imagens = container.querySelectorAll('.foto-terapeuta');
        psicologos.forEach((psi, index) => {
            if (imagens[index]) {
                imagens[index].src = psi.fotoUrl;
                imagens[index].alt = `Foto de ${psi.nome}`;
            }
        });
    } catch (error) {
        console.error("Erro ao carregar vitrine de terapeutas:", error);
        // Em caso de erro, as imagens de placeholder do HTML serão mantidas.
    }
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

    // --- LÓGICA DO BANNER DE INSTALAÇÃO PWA ---
    let deferredPrompt;
    const installBanner = document.getElementById('pwa-install-banner');
    const installButton = document.getElementById('pwa-install-button');
    const dismissButton = document.getElementById('pwa-dismiss-button');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Previne o mini-infobar de aparecer no Chrome
        e.preventDefault();
        // Guarda o evento para que possa ser acionado mais tarde.
        deferredPrompt = e;
        // Mostra nosso banner de instalação customizado
        if (installBanner) {
            installBanner.classList.add('visible');
        }
    });

    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            // Mostra o prompt de instalação nativo
            deferredPrompt.prompt();
            // Espera o usuário responder ao prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA prompt outcome: ${outcome}`);
            // Limpa o prompt, pois ele só pode ser usado uma vez.
            deferredPrompt = null;
            // Esconde o banner
            if (installBanner) {
                installBanner.classList.remove('visible');
            }
        });
    }

    if (dismissButton) {
        dismissButton.addEventListener('click', () => {
            if (installBanner) {
                installBanner.classList.remove('visible');
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        // Limpa o prompt e esconde o banner se o app for instalado
        deferredPrompt = null;
        if (installBanner) {
            installBanner.classList.remove('visible');
        }
        console.log('PWA foi instalado com sucesso!');
    });

    // ... (O restante das suas lógicas de FAQ, senha, modal, etc. estão perfeitas e não mudam)

} // Fim da função inicializarScripts()

// --- PONTO DE ENTRADA PRINCIPAL (NÃO MUDA) ---
document.addEventListener("DOMContentLoaded", () => {
    Promise.all([ 
        carregarComponente('/components/header.html', 'header-placeholder'),
        carregarComponente('/components/footer.html', 'footer-placeholder'),
        carregarComponente('/components/pwa-banner.html', 'pwa-banner-placeholder') 
    ]).then(() => {
        inicializarScripts();
        // Carrega a vitrine DEPOIS de inicializar os scripts principais
        if (document.getElementById('vitrine-terapeutas')) {
            carregarVitrineTerapeutas();
        }
    });
});
// =====================================================================
// CORREÇÃO PARA 100VH NO MOBILE (EXPERIÊNCIA DE APP)
// =====================================================================
function setRealViewportHeight() {
    // Mede a altura interna da janela e calcula 1% dela
    let vh = window.innerHeight * 0.01;
    // Define o valor na variável CSS '--vh' no elemento raiz (<html>)
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Executa a função quando a página carrega e sempre que a tela muda de tamanho
window.addEventListener('resize', setRealViewportHeight);
window.addEventListener('load', setRealViewportHeight);

// No final do script.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // O Service Worker deve estar na raiz do projeto.
    navigator.serviceWorker.register('/sw.js') 
      .then(registration => {
        console.log('Service Worker registrado:', registration);
      })
      .catch(error => {
        console.log('Falha ao registrar Service Worker:', error);
      });
  });
}

window.addEventListener('load', () => {
    // Função para detectar iOS
    function isIOS() {
        return [
            'iPad Simulator',
            'iPhone Simulator',
            'iPod Simulator',
            'iPad',
            'iPhone',
            'iPod'
        ].includes(navigator.platform)
        // Adiciona verificação de userAgent para Safari, caso a plataforma falhe
        || (navigator.userAgent.includes("Mac") && "ontouchend" in document) 
        || navigator.userAgent.includes("iPhone");
    }

    // Função para verificar se está no modo standalone (PWA)
    function isInStandaloneMode() {
        return ('standalone' in window.navigator) && (window.navigator.standalone);
    }

    // Função para verificar se já dispensou o banner
    function hasDismissedBanner() {
        return localStorage.getItem('pwaInstallDismissed') === 'true';
    }

    // Lógica principal
    if (isIOS() && !isInStandaloneMode() && !hasDismissedBanner()) {
        const banner = document.getElementById('pwa-install-banner');
        const closeButton = document.getElementById('pwa-banner-close');

        if (banner && closeButton) {
            // Mostra o banner
            banner.style.display = 'block';

            // Adiciona evento ao botão de fechar
            closeButton.addEventListener('click', () => {
                banner.style.display = 'none';
                localStorage.setItem('pwaInstallDismissed', 'true');
            });
        }
    }
});