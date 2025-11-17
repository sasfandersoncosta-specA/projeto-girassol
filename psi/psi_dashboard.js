// Arquivo: psi_dashboard.js (CORRIGIDO E COMPLETO)

document.addEventListener('DOMContentLoaded', function() {
    
    // --- SELETORES GLOBAIS ---
    let psychologistData = null; // Armazena os dados do psicólogo logado
    const mainContent = document.getElementById('main-content');
    const toastContainer = document.getElementById('toast-container'); // << 1. MOVIDO PARA CIMA

    // =====================================================================
    // FUNÇÃO AUXILIAR: SHOW TOAST (AGORA GLOBAL)
    // =====================================================================
    function showToast(message, type = 'success') {
        if (!toastContainer) {
            console.error("Elemento #toast-container não encontrado!");
            return;
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // =====================================================================
    // FUNÇÃO DE SEGURANÇA E BUSCA DE DADOS INICIAL
    // =====================================================================
    async function fetchPsychologistData() {
        // Adiciona um pequeno delay para dar tempo ao navegador de estabilizar o localStorage
        await new Promise(resolve => setTimeout(resolve, 100));
 
        // CORREÇÃO AQUI: Garante que o nome da chave é 'girassol_token'
        const token = localStorage.getItem('girassol_token');
        console.log('Token Lido:', token); // Log para depuração
        return new Promise(async (resolvePromise) => {
            // CORREÇÃO AQUI: Garante que o 'if' usa a variável 'token' correta
            if (!token) {
                window.location.href = '../login.html';
                resolvePromise(false); 
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/psychologists/me`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: AbortSignal.timeout(8000) 
                });

                if (response.ok) {
                    psychologistData = await response.json();
                    resolvePromise(true); // Sucesso
                } else {
                    throw new Error("Sessão inválida ou expirada.");
                }
            } catch (error) {
                console.error('Falha na autenticação:', error.message);
                // CORREÇÃO AQUI: Garante que o nome da chave é 'girassol_token'
                localStorage.removeItem('girassol_token');
                window.location.href = '../login.html';
                resolvePromise(false); // Falha
            }
        });
    }

    // =====================================================================
    // FUNÇÃO AUXILIAR PARA CHAMADAS DE API (API FETCHER)
    // =====================================================================
    async function apiFetch(url, options = {}) {
        // ... (Esta função permanece 100% igual) ...
        const token = localStorage.getItem('girassol_token');
        if (!token) {
            window.location.href = '../login.html';
            throw new Error("Token não encontrado. Redirecionando para login.");
        }
        const defaultHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }
        const response = await fetch(url, config);
        if (response.status === 401) {
            localStorage.removeItem('girassol_token');
            window.location.href = '../login.html';
            throw new Error("Sessão inválida. Redirecionando para login.");
        }
        return response;
    }

    // =====================================================================
    // FUNÇÃO PARA BUSCAR CONTAGEM DE MENSAGENS
    // =====================================================================
    async function fetchUnreadCount() {
        // ... (Esta função permanece 100% igual) ...
        const badge = document.getElementById('unread-count-badge');
        if (!badge) return;
        try {
            const response = await apiFetch(`${API_BASE_URL}/api/psychologists/me/unread-count`);
            if (response.ok) {
                const data = await response.json();
                badge.textContent = data.count;
                badge.style.display = data.count > 0 ? 'inline-block' : 'none';
            }
        } catch (error) {
            console.error('Erro ao buscar contagem de mensagens:', error);
            badge.style.display = 'none';
        }
    }

    // =====================================================================
    // *** NOVA FUNÇÃO DE CONTAGEM DE Q&A ***
    // =====================================================================
    async function fetchQnaCount() {
        const badge = document.getElementById('qna-unread-count-badge');
        if (!badge) return; // Se o elemento não existir, não faz nada

        try {
            // 1. Chama a nova rota da API
            const response = await apiFetch(`${API_BASE_URL}/api/psychologists/me/qna-unanswered-count`);
            
            if (response.ok) {
                const data = await response.json();
                // 2. Atualiza o número no badge
                badge.textContent = data.count;
                // 3. Mostra ou esconde o badge
                badge.style.display = data.count > 0 ? 'inline-flex' : 'none';
            }
        } catch (error) {
            console.error('Erro ao buscar contagem de Q&A:', error);
            badge.style.display = 'none';
        }
    }


    // =====================================================================
    // LÓGICA DA CAIXA DE ENTRADA (INTERAÇÃO MOBILE)
    // =====================================================================
    if (mainContent) {
        // ... (Esta função permanece 100% igual) ...
        mainContent.addEventListener('click', function(event) {
            const inboxContainer = event.target.closest('.inbox-container');
            if (!inboxContainer) return;
            if (event.target.closest('.message-item')) {
                inboxContainer.classList.add('mostrando-conteudo');
                const clickedItem = event.target.closest('.message-item');
                inboxContainer.querySelectorAll('.message-item').forEach(item => item.classList.remove('active'));
                clickedItem.classList.add('active');
            }
            if (event.target.closest('.btn-voltar-inbox')) {
                inboxContainer.classList.remove('mostrando-conteudo');
            }
        });
    }

    // =====================================================================
    // FUNÇÕES DE VALIDAÇÃO (Reutilizáveis)
    // =====================================================================
    function validarCPF(cpf) {
        // ... (Esta função permanece 100% igual) ...
        cpf = String(cpf).replace(/[^\d]/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        return true;
    }

    // ... (A função validarEmail() também permanece a mesma) ...

    // =====================================================================
    // LÓGICA MODULAR POR PÁGINA (Funções de Inicialização)
    // =====================================================================
    
    // Lógica da Página: MEU PERFIL
    async function uploadCrpDocument(file) {
        // ... (Esta função permanece 100% igual) ...
    }
    function inicializarLogicaDoPerfil() {
        // ... (Esta função permanece 100% igual) ...
    }

    // Lógica da Página: CAIXA DE ENTRADA (Modal)
    async function inicializarLogicaDaCaixaDeEntrada() {
        // ... (Esta função permanece 100% igual) ...
    }

    // Lógica da Página: LISTA DE ESPERA
    async function inicializarListaDeEspera() {
        // ... (Esta função permanece 100% igual) ...
    }

    // Lógica da Página: COMUNIDADE Q&A
    async function inicializarComunidadeQNA() {
        // ... (Esta função permanece 100% igual) ...
        
        // --- Seletores ---
        const listContainer = document.getElementById('qna-list-container');
        const cardTemplate = document.getElementById('qna-card-template-psi');
        const answerTemplate = document.getElementById('qna-existing-answer-template');
        
        const modal = document.getElementById('qna-answer-modal');
        const modalForm = document.getElementById('qna-answer-form');
        const modalTextarea = document.getElementById('qna-answer-textarea');
        const modalSubmitBtn = document.getElementById('qna-submit-answer');
        const modalCounter = document.getElementById('qna-char-counter');
        const minLength = 50; // Mínimo para respostas
        
        if (!listContainer || !cardTemplate || !answerTemplate || !modal || !modalForm) {
            console.error('Elementos essenciais do Q&A não encontrados.');
            return;
        }
        
        const loggedInPsiId = psychologistData.id; // psychologistData é global no dashboard.js

        // --- 1. Função para Renderizar as Perguntas ---
        function renderQuestions(questions) {
            listContainer.innerHTML = ''; // Limpa o loader

            if (questions.length === 0) {
                listContainer.innerHTML = '<div class="card qna-card-psi"><p style="text-align: center; color: var(--cinza-texto);">Nenhuma pergunta aguardando resposta no momento. Bom trabalho!</p></div>';
                return;
            }

            questions.forEach(question => {
                const card = cardTemplate.content.cloneNode(true);
                
                // Popula dados da pergunta
                card.querySelector('.qna-question-title').textContent = question.title;
                card.querySelector('.qna-question-content').textContent = question.content;
                
                const answersList = card.querySelector('.existing-answers-list');
                const respondButton = card.querySelector('.btn-responder');
                const respondedBadge = card.querySelector('.badge-respondido');
                
                let hasPsiAnswered = false;

                // Popula respostas existentes
                if (question.answers && question.answers.length > 0) {
                    question.answers.forEach(answer => {
                        const answerItem = answerTemplate.content.cloneNode(true);
                        answerItem.querySelector('.answer-psi-name').textContent = answer.psychologist.nome;
                        answerItem.querySelector('.answer-psi-text').textContent = answer.content;
                        answerItem.querySelector('.answer-psi-photo').src = answer.psychologist.fotoUrl || 'https://placehold.co/40x40';
                        answersList.appendChild(answerItem);

                        // Verifica se o 'psi' logado já respondeu
                        if (answer.psychologist.id === loggedInPsiId) {
                            hasPsiAnswered = true;
                        }
                    });
                } else {
                    answersList.remove(); // Remove a área de respostas se não houver nenhuma
                }

                // Controla a visibilidade do botão "Responder"
                if (hasPsiAnswered) {
                    respondButton.classList.add('hidden');
                    respondedBadge.classList.remove('hidden');
                } else {
                    respondButton.classList.remove('hidden');
                    respondedBadge.classList.add('hidden');
                }

                // Adiciona evento ao botão "Responder"
                respondButton.addEventListener('click', () => {
                    modal.dataset.questionId = question.id; // Armazena o ID da pergunta no modal
                    modal.classList.add('is-visible');
                });
                
                listContainer.appendChild(card);
            });
        }

        // --- 2. Função para Carregar Perguntas da API ---
        async function loadQuestions() {
            try {
                const response = await apiFetch(`${API_BASE_URL}/api/qna/questions`);
                if (!response.ok) throw new Error('Falha ao buscar perguntas.');
                const questions = await response.json();
                renderQuestions(questions);
            } catch (error) {
                console.error(error);
                listContainer.innerHTML = '<div class="card qna-card-psi"><p style="text-align: center; color: var(--coral-quente);">Erro ao carregar as perguntas. Tente recarregar a página.</p></div>';
            }
        }

        // --- 3. Lógica do Modal de Resposta ---
        
        // Fechar modal
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close') || e.target.classList.contains('modal-cancel')) {
                modal.classList.remove('is-visible');
                modalTextarea.value = ''; // Limpa o texto
                modalSubmitBtn.disabled = true; // Desabilita o botão
            }
        });

        // Contador de caracteres do modal
        modalTextarea.addEventListener('input', () => {
            const count = modalTextarea.value.length;
            modalCounter.textContent = `${count}/${minLength} caracteres`;
            modalSubmitBtn.disabled = count < minLength;
        });

        // Envio do formulário (submit da resposta)
        modalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const questionId = modal.dataset.questionId;
            const content = modalTextarea.value;

            if (content.length < minLength || !questionId) return;

            modalSubmitBtn.disabled = true;
            modalSubmitBtn.textContent = 'Enviando...';

            try {
                const response = await apiFetch(`${API_BASE_URL}/api/qna/questions/${questionId}/answers`, {
                    method: 'POST',
                    body: JSON.stringify({ content: content })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.message || 'Falha ao enviar resposta.');
                }
                
                showToast('Resposta enviada com sucesso!', 'success');
                modal.classList.remove('is-visible');
                modalTextarea.value = '';
                
                // Recarrega as perguntas para mostrar a nova resposta
                loadQuestions(); 

                // *** NOVO: Atualiza a contagem de Q&A pendentes ***
                fetchQnaCount();

            } catch (error) {
                console.error(error);
                showToast(error.message || 'Erro ao enviar resposta. Tente novamente.', 'error');
            } finally {
                modalSubmitBtn.disabled = false;
                modalSubmitBtn.textContent = 'Enviar Resposta';
            }
        });

        // --- 4. Ponto de Entrada ---
        loadQuestions();
    }


    // =====================================================================
    // GERENCIADOR DE CARREGAMENTO DE PÁGINAS (Fetch e Roteador)
    // =====================================================================
    function loadPage(pageUrl) {
        if (!pageUrl) return;
        mainContent.innerHTML = '<div class="loader-wrapper"><div class="loader-spinner"></div></div>';

        fetch(pageUrl)
            .then(response => response.ok ? response.text() : Promise.reject(`Arquivo não encontrado: ${pageUrl}`))
            .then(html => {
                mainContent.innerHTML = html;

                // --- *** CORREÇÃO PRINCIPAL *** ---
                // Adicionamos a chamada para a nova função de inicialização
                if (pageUrl.includes('psi_meu_perfil.html')) {
                    inicializarLogicaDoPerfil();
                } else if (pageUrl.includes('psi_caixa_de_entrada.html')) {
                    inicializarLogicaDaCaixaDeEntrada();
                } else if (pageUrl.includes('psi_lista_de_espera.html')) {
                    inicializarListaDeEspera();
                }
                else if (pageUrl.includes('psi_comunidade.html')) {
                    inicializarComunidadeQNA();
                }

                // Dispara um evento customizado para que outros scripts (como o de toggle de senha) possam reagir
                document.dispatchEvent(new CustomEvent('page-loaded'));
            })
            .catch(error => {
                mainContent.innerHTML = `<div class="card"><h2 style="color: var(--coral-quente);">Página em Construção</h2><p>O conteúdo para esta seção estará disponível em breve.</p></div>`;
                console.error(error);
            });
    }


    // << 2. LÓGICA DE UPLOAD DE FOTO (MOVIDA E IMPLEMENTADA) >>
    async function uploadProfilePhoto(file, sidebarPhotoEl) {
        // ... (Esta função permanece 100% igual) ...
    }

    // =====================================================================
    // FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO DO DASHBOARD
    // =====================================================================
    function initializeDashboard() {
        const dashboardContainer = document.getElementById('dashboard-container');
        if (dashboardContainer) {
            dashboardContainer.style.display = 'flex';
        }

        const sidebarPhotoEl = document.getElementById('psi-sidebar-photo');
        const sidebarNameEl = document.getElementById('psi-sidebar-name');
        if (sidebarNameEl && sidebarPhotoEl && psychologistData) {
            sidebarNameEl.textContent = psychologistData.nome; 
            sidebarPhotoEl.src = psychologistData.fotoUrl || 'https://placehold.co/40x40/1B4332/FFFFFF?text=Psi';
        }

        // --- LÓGICA PARA TROCA DE FOTO DE PERFIL (AGORA IMPLEMENTADA) ---
        const photoUploadInput = document.getElementById('profile-photo-upload');
        if (photoUploadInput && sidebarPhotoEl) {
            photoUploadInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    // Chama a nova função de upload
                    uploadProfilePhoto(file, sidebarPhotoEl);
                }
            });
        }

        // ... (O restante da sua função initializeDashboard permanece 100% igual) ...
        
        // *** CHAMADAS DE CONTAGEM INICIAL ***
        fetchUnreadCount();
        fetchQnaCount(); // <-- CHAMADA PARA A NOVA FUNÇÃO DE CONTAGEM
        
        const navLinks = document.querySelectorAll('aside.dashboard-sidebar nav.sidebar-nav ul li a');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault(); // Impede o 'href'
                
                navLinks.forEach(item => item.parentElement.classList.remove('active'));
                
                this.parentElement.classList.add('active');
                
                loadPage(this.getAttribute('data-page'));
            });
        });
        const logoutLink = document.querySelector('.sidebar-logout');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('girassol_token');
                window.location.href = '../login.html';
            });
        }
        const initialLink = document.querySelector('.sidebar-nav a[data-page="psi_visao_geral.html"]');
        if (initialLink) {
            navLinks.forEach(item => item.parentElement.classList.remove('active'));
            initialLink.parentElement.classList.add('active');
            loadPage(initialLink.getAttribute('data-page'));
        } else {
            loadPage('psi_visao_geral.html');
        }
    }

    // --- PONTO DE ENTRADA ---
    fetchPsychologistData().then(success => {
        if (success) {
            initializeDashboard();
        }
    });
});