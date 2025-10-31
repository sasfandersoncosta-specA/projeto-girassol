// Arquivo: psi_dashboard.js (Versão Final com Caixa de Entrada e Menu Mobile)

document.addEventListener('DOMContentLoaded', function() {
    
    // --- SELETORES GLOBAIS ---
    let psychologistData = null; // Armazena os dados do psicólogo logado
    const mainContent = document.getElementById('main-content');
    // const menuToggleButton = document.getElementById('menu-toggle');
    // const sidebar = document.querySelector('.dashboard-sidebar');

    // =====================================================================
    // FUNÇÃO DE SEGURANÇA E BUSCA DE DADOS INICIAL
    // =====================================================================
    async function fetchPsychologistData() {
        const token = localStorage.getItem('girassol_token');
        if (!token) {
            window.location.href = '../login.html';
            return false; // CRUCIAL: Retorna 'false' para interromper o fluxo
        }

        try {
            const response = await fetch('http://localhost:3001/api/psychologists/me', {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: AbortSignal.timeout(8000) // Timeout de 8 segundos
            });

            if (response.ok) {
                psychologistData = await response.json();
                return true; // Sucesso
            } else {
                // Se a resposta não for OK (ex: 401 Unauthorized), trata como falha.
                throw new Error("Sessão inválida ou expirada.");
            }
        } catch (error) {
            console.error('Falha na autenticação:', error.message);
            localStorage.removeItem('girassol_token');
            window.location.href = '../login.html';
            return false; // Falha
        }
    }

    // =====================================================================
    // FUNÇÃO AUXILIAR PARA CHAMADAS DE API (API FETCHER)
    // =====================================================================
    async function apiFetch(url, options = {}) {
        const token = localStorage.getItem('girassol_token');
        if (!token) {
            window.location.href = '../login.html';
            // Lança um erro para interromper a execução da função que chamou o fetch
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

        // Se o corpo da requisição for um objeto, converte para JSON
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        const response = await fetch(url, config);

        // Se o token for inválido/expirado (401), limpa e redireciona
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
        const badge = document.getElementById('unread-count-badge');
        if (!badge) return;

        try {
            const response = await apiFetch('http://localhost:3001/api/psychologists/me/unread-count');
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
    // LÓGICA DO MENU MOBILE (HAMBÚRGUER)
    // =====================================================================
    // if (menuToggleButton && sidebar) {
    //     menuToggleButton.addEventListener('click', function() {
    //         sidebar.classList.toggle('is-open');
    //     });
    // }

    // =====================================================================
    // LÓGICA DA CAIXA DE ENTRADA (INTERAÇÃO MOBILE)
    // =====================================================================
    // Usamos "delegação de eventos" no 'mainContent' porque os elementos da
    // caixa de entrada não existem no início, eles são carregados depois.
    if (mainContent) {
        mainContent.addEventListener('click', function(event) {
            const inboxContainer = event.target.closest('.inbox-container');
            if (!inboxContainer) return;

            // Lógica para ABRIR uma mensagem
            if (event.target.closest('.message-item')) {
                inboxContainer.classList.add('mostrando-conteudo');
                const clickedItem = event.target.closest('.message-item');
                inboxContainer.querySelectorAll('.message-item').forEach(item => item.classList.remove('active'));
                clickedItem.classList.add('active');
            }

            // Lógica para VOLTAR para a lista
            if (event.target.closest('.btn-voltar-inbox')) {
                inboxContainer.classList.remove('mostrando-conteudo');
            }
        });
    }

    // =====================================================================
    // FUNÇÕES DE VALIDAÇÃO (Reutilizáveis)
    // =====================================================================
    function validarCPF(cpf) {
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

    function validarEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    // =====================================================================
    // LÓGICA MODULAR POR PÁGINA (Funções de Inicialização)
    // =====================================================================
    
    // Lógica da Página: MEU PERFIL
    function inicializarLogicaDoPerfil() {
        const form = document.getElementById('perfil-form');
        const toastContainer = document.getElementById('toast-container');
        if (!form) return; // Se o formulário de perfil não estiver presente, sai.

        // Seleciona os elementos APENAS quando a função é chamada
        const fieldset = form.querySelector('#form-fieldset');
        const btnAlterar = form.querySelector('#btn-alterar');
        const btnSalvar = form.querySelector('#btn-salvar');
        const passwordForm = document.getElementById('password-form');
        const deleteAccountBtn = document.getElementById('btn-excluir-conta');
        const modal = document.getElementById('confirmation-modal');

        // --- Funções Auxiliares ---
        if (!toastContainer) {
            console.error("Elemento #toast-container não encontrado!");
        }

        // Função auxiliar para mostrar toasts
        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            toastContainer.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
        }

        // Função para carregar os dados do psicólogo
        async function loadPsychologistData() {
            const token = localStorage.getItem('girassol_token');
            if (!token) {
                showToast('Você precisa estar logado para ver seu perfil.', 'error');
                window.location.href = '../psi_login.html'; // Redireciona para o login do psicólogo
                return;
            }

            try {
                const response = await fetch('http://localhost:3001/api/psychologists/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Falha ao carregar dados do perfil.');
                }

                const data = await response.json();
                // Preenche o formulário com os dados recebidos
                document.getElementById('nome').value = data.nome || '';
                document.getElementById('email').value = data.email || '';
                document.getElementById('crp').value = data.crp || '';
                document.getElementById('telefone').value = data.telefone || '';
                document.getElementById('bio').value = data.bio || '';
                document.getElementById('fotoUrl').value = data.fotoUrl || '';
                document.getElementById('valor_sessao_numero').value = data.valor_sessao_numero || '';
                document.getElementById('temas_atuacao').value = (data.temas_atuacao || []).join(', ');
                document.getElementById('abordagens_tecnicas').value = (data.abordagens_tecnicas || []).join(', ');
                document.getElementById('genero_identidade').value = data.genero_identidade || '';
                document.getElementById('praticas_vivencias').value = (data.praticas_vivencias || []).join(', ');
                document.getElementById('disponibilidade_periodo').value = (data.disponibilidade_periodo || []).join(', ');

                // Aplica máscaras
                // IMask(document.getElementById('telefone'), { mask: '(00) 00000-0000' });

            } catch (error) {
                console.error('Erro ao carregar perfil:', error);
                showToast(error.message, 'error');
            }
        }

        // Evento para habilitar a edição do formulário
        btnAlterar.addEventListener('click', () => {
            fieldset.disabled = false;
            btnAlterar.classList.add('hidden');
            btnSalvar.classList.remove('hidden');
        });

        // Evento para salvar as alterações do perfil
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const token = localStorage.getItem('girassol_token');
            if (!token) { showToast('Você precisa estar logado.', 'error'); return; }

            const payload = {
                nome: document.getElementById('nome').value,
                email: document.getElementById('email').value,
                crp: document.getElementById('crp').value,
                telefone: document.getElementById('telefone').value,
                bio: document.getElementById('bio').value,
                fotoUrl: document.getElementById('fotoUrl').value,
                valor_sessao_numero: parseFloat(document.getElementById('valor_sessao_numero').value),
                temas_atuacao: document.getElementById('temas_atuacao').value.split(',').map(s => s.trim()).filter(Boolean),
                abordagens_tecnicas: document.getElementById('abordagens_tecnicas').value.split(',').map(s => s.trim()).filter(Boolean),
                genero_identidade: document.getElementById('genero_identidade').value,
                praticas_vivencias: document.getElementById('praticas_vivencias').value.split(',').map(s => s.trim()).filter(Boolean),
                disponibilidade_periodo: document.getElementById('disponibilidade_periodo').value.split(',').map(s => s.trim()).filter(Boolean),
            };

            try {
                const response = await apiFetch('http://localhost:3001/api/psychologists/me', {
                    method: 'PUT',
                    body: payload
                });

                const result = await response.json();
                if (response.ok) {
                    showToast(result.message, 'success');
                    fieldset.disabled = true;
                    btnSalvar.classList.add('hidden');
                    btnAlterar.classList.remove('hidden');
                } else {
                    showToast(result.error || 'Erro ao atualizar perfil.', 'error');
                }
            } catch (error) {
                console.error('Erro ao salvar perfil:', error);
                showToast('Erro de conexão ao salvar perfil.', 'error');
            }
        });

        // Evento para alterar a senha
        if (passwordForm) {
            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const senhaAtual = document.getElementById('senha_atual').value;
                const novaSenha = document.getElementById('nova_senha').value;
                const confirmarNovaSenha = document.getElementById('confirmar_nova_senha').value;

                if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
                    showToast('Por favor, preencha todos os campos de senha.', 'error');
                    return;
                }

                if (novaSenha !== confirmarNovaSenha) {
                    showToast('A nova senha e a confirmação não coincidem.', 'error');
                    return;
                }
                // TODO: Adicionar validação de força da senha

                const token = localStorage.getItem('girassol_token');
                if (!token) { showToast('Você precisa estar logado.', 'error'); return; }

                try {
                    const response = await apiFetch('http://localhost:3001/api/psychologists/me/password', {
                        method: 'PUT',
                        body: { senha_atual: senhaAtual, nova_senha: novaSenha }
                    });

                    const result = await response.json();
                    if (response.ok) {
                        showToast(result.message, 'success');
                        passwordForm.reset(); // Limpa o formulário de senha
                    } else {
                        showToast(result.error || 'Erro ao alterar senha.', 'error');
                    }
                } catch (error) {
                    console.error('Erro ao alterar senha:', error);
                    showToast('Erro de conexão ao alterar senha.', 'error');
                }
            });
        }

        // Evento para excluir a conta
        if (deleteAccountBtn && modal) {
            const modalTitle = modal.querySelector('.modal-title');
            const modalBody = modal.querySelector('.modal-body');
            const modalConfirmBtn = modal.querySelector('.modal-confirm');
            const modalCancelBtn = modal.querySelector('.modal-cancel');
            const modalCloseBtn = modal.querySelector('.modal-close');

            deleteAccountBtn.addEventListener('click', () => {
                modalTitle.textContent = 'Confirmar Exclusão de Conta';
                modalBody.innerHTML = `
                    <p>Tem certeza que deseja excluir sua conta? Esta ação é irreversível e todos os seus dados serão perdidos.</p>
                    <p>Para confirmar, digite sua senha:</p>
                    <div class="form-group">
                        <input type="password" id="confirm-delete-password" placeholder="Sua senha" required>
                    </div>
                `;
                modalConfirmBtn.textContent = 'Excluir Permanentemente';
                modalConfirmBtn.className = 'modal-confirm btn btn-perigo'; // Reseta e aplica classes
                modal.classList.add('is-visible');

                const newConfirmBtn = modalConfirmBtn.cloneNode(true);
                modalConfirmBtn.parentNode.replaceChild(newConfirmBtn, modalConfirmBtn);
                
                newConfirmBtn.addEventListener('click', async () => {
                    const senhaConfirmacao = document.getElementById('confirm-delete-password').value;
                    if (!senhaConfirmacao) {
                        showToast('Por favor, digite sua senha para confirmar.', 'error');
                        return;
                    }

                    try {
                        const response = await apiFetch('http://localhost:3001/api/psychologists/me', {
                            method: 'DELETE',
                            body: { senha: senhaConfirmacao }
                        });

                        const result = await response.json();
                        if (response.ok) {
                            showToast(result.message, 'success');
                            localStorage.removeItem('girassol_token');
                            modal.classList.remove('is-visible');
                            setTimeout(() => { window.location.href = '../index.html'; }, 1500);
                        } else {
                            showToast(result.error || 'Erro ao excluir conta.', 'error');
                        }
                    } catch (error) {
                        showToast('Erro de conexão ao excluir conta.', 'error');
                    }
                });

                modalCancelBtn.onclick = () => modal.classList.remove('is-visible');
                modalCloseBtn.onclick = () => modal.classList.remove('is-visible');
            });
        }

        // Carrega os dados do psicólogo ao inicializar a página
        loadPsychologistData();

        // Máscaras de input (já existentes)
        const telefoneInput = document.getElementById('telefone');
        // if (telefoneInput) IMask(telefoneInput, { mask: '(00) 00000-0000' });

        // Removido: CPF não é um campo do psicólogo no modelo atual
        // const cpfInput = document.getElementById('cpf');
        // if (cpfInput) IMask(cpfInput, { mask: '000.000.000-00' });

        // Removido: Validação de CPF e Email aqui, pois a validação deve ser feita no backend
        // e o email já é validado pelo navegador.
        // if (!validarEmail(emailInput.value)) { /* ... */ }
        // if (!validarCPF(cpfInput.value)) { /* ... */ }

        // Removido: console.log('Dados validados e salvos!');
        // A mensagem de sucesso agora vem do showToast
    }

    // Lógica da Página: CAIXA DE ENTRADA (Modal)
    async function inicializarLogicaDaCaixaDeEntrada() {
        const conversationListEl = document.querySelector('.message-list');
        const messageContentEl = document.querySelector('.inbox-content');
        if (!conversationListEl || !messageContentEl) return;

        async function loadConversations() {
            conversationListEl.innerHTML = '<li>Carregando conversas...</li>';
            try {
                const response = await apiFetch('http://localhost:3001/api/messaging/conversations');
                const conversations = await response.json();
                
                if (conversations.length === 0) {
                    conversationListEl.innerHTML = '<li>Nenhuma conversa encontrada.</li>';
                    return;
                }

                conversationListEl.innerHTML = conversations.map(conv => {
                    // Mostra o nome do outro participante
                    const otherParticipant = psychologistData.id === conv.patientId ? conv.psychologist : conv.patient;
                    return `
                        <li class="message-item" data-conversation-id="${conv.id}">
                            <div class="message-sender">${otherParticipant.nome}</div>
                            <div class="message-subject">Conversa sobre seu acompanhamento</div>
                            <div class="message-date">${new Date(conv.updatedAt).toLocaleDateString('pt-BR')}</div>
                        </li>
                    `;
                }).join('');

            } catch (error) {
                conversationListEl.innerHTML = '<li>Erro ao carregar conversas.</li>';
            }
        }

        async function loadMessages(conversationId) {
            messageContentEl.innerHTML = '<p>Carregando mensagens...</p>';
            try {
                const response = await apiFetch(`http://localhost:3001/api/messaging/conversations/${conversationId}`);
                const messages = await response.json();

                // Lógica para renderizar o header e o corpo da mensagem
                // (Esta parte precisa ser mais elaborada para mostrar a thread completa)
                messageContentEl.innerHTML = `
                    <button class="btn-voltar-inbox">&larr; Voltar para a lista</button>
                    <div class="message-header">
                        <h2>Conversa</h2>
                    </div>
                    <div class="message-body">
                        ${messages.map(msg => `<p class="${msg.senderId === psychologistData.id ? 'enviada' : 'recebida'}">${msg.content}</p>`).join('')}
                    </div>
                    <div class="area-resposta">
                        <textarea placeholder="Digite sua resposta..."></textarea>
                        <button class="btn-primario">Enviar</button>
                    </div>
                `;

            } catch (error) {
                messageContentEl.innerHTML = '<p>Erro ao carregar mensagens.</p>';
            }
        }

        // Carrega as conversas iniciais
        await loadConversations();

        // Adiciona evento de clique na lista de conversas
        conversationListEl.addEventListener('click', (e) => {
            const conversationItem = e.target.closest('.message-item');
            if (conversationItem) {
                const conversationId = conversationItem.dataset.conversationId;
                loadMessages(conversationId);
                document.querySelector('.inbox-container').classList.add('mostrando-conteudo');
            }
        });
    }

    // Lógica da Página: LISTA DE ESPERA
    async function inicializarListaDeEspera() {
        const tableBody = document.getElementById('waiting-list-body');
        const emptyState = document.getElementById('waiting-list-empty');
        if (!tableBody || !emptyState) return;

        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Carregando lista de espera...</td></tr>';

        try {
            const response = await apiFetch('http://localhost:3001/api/psychologists/waiting-list');

            if (!response.ok) {
                throw new Error('Falha ao buscar a lista de espera.');
            }

            const waitingList = await response.json();

            if (waitingList.length === 0) {
                tableBody.innerHTML = '';
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
                tableBody.innerHTML = waitingList.map(item => `
                    <tr>
                        <td data-label="Nome">${item.nome} (${item.status})</td>
                        <td data-label="E-mail"><a href="mailto:${item.email}">${item.email}</a></td>
                        <td data-label="CRP">${item.crp}</td>
                        <td data-label="Temas">${(item.temas_atuacao || []).join(', ')}</td>
                        <td data-label="Data de Inscrição">${new Date(item.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td data-label="Ações">
                            <button class="btn-tabela btn-aprovar" data-id="${item.id}" ${item.status !== 'pending' ? 'disabled' : ''}>${item.status === 'pending' ? 'Convidar' : 'Convidado'}</button>
                        </td>
                    </tr>
                `).join('');
            }

        } catch (error) {
            console.error("Erro ao carregar lista de espera:", error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: red;">Ocorreu um erro ao carregar a lista.</td></tr>`;
            emptyState.classList.add('hidden');
        }

        // Adiciona o listener de eventos para os botões "Convidar" usando delegação
        tableBody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-aprovar') && !e.target.disabled) {
                const button = e.target;
                const psychologistId = button.dataset.id;

                button.textContent = 'Enviando...';
                button.disabled = true;

                try {
                    // Assumindo que o endpoint para convite manual seja este:
                    const response = await apiFetch(`http://localhost:3001/api/admin/waiting-list/invite`, {
                        method: 'POST',
                        body: { id: psychologistId }
                    });

                    const result = await response.json();

                    if (response.ok) {
                        button.textContent = 'Convidado';
                        // A linha da tabela poderia ser atualizada aqui se necessário
                    } else {
                        throw new Error(result.error || 'Falha ao enviar convite.');
                    }
                } catch (error) {
                    console.error("Erro ao convidar psicólogo:", error);
                    button.textContent = 'Erro!';
                    // Poderia adicionar um toast de erro aqui
                }
            }
        });
    }

    // =====================================================================
    // GERENCIADOR DE CARREGAMENTO DE PÁGINAS (Fetch e Roteador)
    // =====================================================================
    function loadPage(pageUrl) {
        if (!pageUrl) return;
        mainContent.innerHTML = '<p style="text-align:center; padding: 40px;">Carregando...</p>';
        
        fetch(pageUrl)
            .then(response => response.ok ? response.text() : Promise.reject(`Arquivo não encontrado: ${pageUrl}`))
            .then(html => {
                mainContent.innerHTML = html;
                
                // Roteador de Lógica: Chama a função certa para a página carregada
                if (pageUrl.includes('psi_meu_perfil.html')) {
                    inicializarLogicaDoPerfil();
                } else if (pageUrl.includes('psi_caixa_de_entrada.html')) {
                    inicializarLogicaDaCaixaDeEntrada();
                } else if (pageUrl.includes('psi_lista_espera.html')) {
                    inicializarListaDeEspera();
                }
                // Adicione outros 'else if' para as futuras páginas aqui
            })
            .catch(error => {
                mainContent.innerHTML = `<div style="padding: 40px; text-align:center;"><h2>Página em Construção</h2><p>O conteúdo para esta seção estará disponível em breve.</p></div>`;
                console.error(error);
            });
    }

    // =====================================================================
    // FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO DO DASHBOARD
    // =====================================================================
    function initializeDashboard() {
        // Torna o dashboard visível APENAS se a autenticação foi bem-sucedida
        const dashboardContainer = document.getElementById('dashboard-container');
        if (dashboardContainer) {
            dashboardContainer.style.display = 'flex';
        }

        // Atualiza o nome do psicólogo no menu
        const sidebarPhotoEl = document.getElementById('psi-sidebar-photo');
        const sidebarNameEl = document.getElementById('psi-sidebar-name');
        if (sidebarNameEl && sidebarPhotoEl && psychologistData) {
            sidebarNameEl.textContent = `Dr(a). ${psychologistData.nome.split(' ')[0]}`;
            sidebarPhotoEl.src = psychologistData.fotoUrl || 'https://placehold.co/40x40/1B4332/FFFFFF?text=Psi';
        }

        // Busca a contagem de mensagens não lidas
        fetchUnreadCount();

        // Redefine a seleção localmente, garantindo que o DOM da sidebar esteja disponível
        const navLinks = document.querySelectorAll('aside.dashboard-sidebar nav.sidebar-nav ul li');

        // Adiciona evento de clique para os links da navegação
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                navLinks.forEach(item => item.classList.remove('active'));
                this.classList.add('active');
                loadPage(this.getAttribute('data-page'));

                // Fecha a sidebar no mobile após clicar em um link
                // if (window.innerWidth <= 992 && sidebar && sidebar.classList.contains('is-open')) {
                //     sidebar.classList.remove('is-open');
                // }
            });
        });

        // --- LÓGICA DO MENU MOBILE ---
        // if (menuToggleButton && sidebar) {
        //     menuToggleButton.addEventListener('click', function() {
        //         sidebar.classList.toggle('is-open');
        //     });
        // }

        // Lógica de Logout
        const logoutLink = document.querySelector('.sidebar-logout');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('girassol_token');
                window.location.href = '../login.html';
            });
        }

        // Carrega a página inicial após todos os eventos terem sido configurados.
        // Garante que o item de menu 'Visão Geral' esteja ativo e carregue seu conteúdo.
        const initialLink = document.querySelector('.sidebar-nav li[data-page="psi_visao_geral.html"]');
        if (initialLink) {
            navLinks.forEach(item => item.classList.remove('active'));
            initialLink.classList.add('active');
            loadPage(initialLink.getAttribute('data-page'));
        } else {
            loadPage('psi_visao_geral.html'); // Fallback caso o link não seja encontrado
        }

        // A busca de dados não é mais chamada aqui.
    }

    // --- PONTO DE ENTRADA ---
    // 1. Tenta autenticar e buscar os dados do usuário.
    // 2. Se for bem-sucedido, a função initializeDashboard() é chamada para montar a página.
    // 3. Se falhar, o próprio fetchPsychologistData já redireciona para o login.
    fetchPsychologistData().then(success => {
        if (success) {
            initializeDashboard();
        }
    });
    // initializeDashboard(); // Chamada direta para fins de depuração
});
