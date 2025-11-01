window.initializePage = function() {
    // --- CORREÇÃO DE LAYOUT ---
    // Adiciona a classe 'inbox-active' imediatamente para corrigir o layout full-height,
    // antes de qualquer chamada de API que possa falhar.
    document.querySelector('.dashboard-main').classList.add('inbox-active');

    const token = localStorage.getItem('girassol_token');

    if (!token) {
        // Idealmente, o admin.js já faz o logout, mas é uma boa prática ter um fallback.
        window.location.href = 'login.html';
        return;
    }

    // Elementos da UI
    const conversationsListWrapper = document.getElementById('conversations-list-wrapper');
    const conversationView = document.getElementById('conversation-view');
    const searchInput = document.getElementById('search-conversations');
    const newBroadcastBtn = document.getElementById('new-broadcast-btn');
    const paginationContainer = document.getElementById('pagination-container');
    const adminAvatar = document.getElementById('admin-avatar');
    const placeholderView = document.querySelector('.placeholder-view');
    const broadcastModal = document.getElementById('broadcast-modal');
    const confirmationModal = document.getElementById('confirmation-modal');
    const navListContainer = document.querySelector('.inbox-nav-list');

    // Templates
    const convoPreviewTemplate = document.getElementById('convo-preview-template');
    const convoViewTemplate = document.getElementById('convo-view-template');
    const messageBubbleTemplate = document.getElementById('message-bubble-template');

    let allConversations = new Map();
    let adminId;
    let currentView = 'inbox'; // 'inbox' ou 'sent'
    let currentPage = 1;
    const CONVERSATIONS_PER_PAGE = 15; // Define o limite de conversas por página
    let debounceTimer;

    // Função para renderizar a lista de conversas (agora recebe a lista da página atual)
    function renderConversationsList(conversations) {
        conversationsListWrapper.innerHTML = '';

        if (conversations.length === 0) {
            conversationsListWrapper.innerHTML = `<p class="empty-row">Nenhuma conversa encontrada.</p>`;
            return;
        }

        conversations.forEach(convo => {
            const lastMessage = convo.lastMessage;
            const previewNode = convoPreviewTemplate.content.cloneNode(true);
            const previewEl = previewNode.querySelector('.conversa-preview');
 
            // --- NOVA LÓGICA DE FOTO ---
            const avatarImg = previewEl.querySelector('.preview-avatar');
            if (convo.otherParticipant.fotoUrl) {
                avatarImg.src = convo.otherParticipant.fotoUrl;
            } else {
                avatarImg.src = '../assets/images/avatar_placeholder.png'; // Fallback
            }
 
            // --- LÓGICA DE 'NÃO LIDO' ---
            const unreadBadge = previewEl.querySelector('.unread-badge');
            if (convo.unreadCount > 0) {
                previewEl.classList.add('nao-lida');
                unreadBadge.textContent = convo.unreadCount;
            } else {
                unreadBadge.style.display = 'none';
            }
 
            // --- (Restante da lógica: nome, mensagem, data, delete btn) ---
            previewEl.dataset.conversationKey = `${convo.otherParticipant.id}-${convo.otherParticipant.nome}`;
            previewEl.querySelector('.nome-preview').textContent = convo.otherParticipant.nome; 
            previewEl.querySelector('.mensagem-preview').innerHTML = lastMessage.content; // Usa innerHTML para renderizar HTML se houver
            previewEl.querySelector('.data-preview').textContent = new Date(lastMessage.createdAt).toLocaleDateString('pt-BR');

            // Adiciona o listener para o botão de deletar
            const deleteBtn = previewEl.querySelector('.delete-convo-btn'); 
            if (convo.isNew) {
                // Se for um contato novo, esconde o botão de deletar e a data
                if (deleteBtn) deleteBtn.style.display = 'none';
                previewEl.querySelector('.data-preview').style.display = 'none';
                previewEl.querySelector('.mensagem-preview').style.fontStyle = 'italic';
            } else {
                // Se for uma conversa existente, configura o botão de deletar
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Impede que o clique abra a conversa
                        handleDeleteConversation(previewEl.dataset.conversationKey, convo.id);
                    });
                }
            }

            conversationsListWrapper.appendChild(previewNode);
        });
    }

    // Função para renderizar os controles de paginação
    function renderPagination(totalPages, currentPage) {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        // Botão "Anterior"
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.textContent = '‹';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => fetchConversations(currentPage - 1));
        paginationContainer.appendChild(prevBtn);

        // Botões de página (simplificado para mostrar apenas a página atual)
        const pageIndicator = document.createElement('span');
        pageIndicator.className = 'pagination-btn active';
        pageIndicator.textContent = currentPage;
        paginationContainer.appendChild(pageIndicator);

        // Botão "Próximo"
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.textContent = '›';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => fetchConversations(currentPage + 1));
        paginationContainer.appendChild(nextBtn);
    }


    // Função para renderizar a visualização de uma conversa
    function renderConversationView(conversationKey, adminId) {
        const conversation = allConversations.get(conversationKey);
        if (!conversation) return;

        document.querySelector('.whatsapp-layout')?.classList.add('mobile-chat-active'); // Ativa a visualização mobile
        // Esconde o placeholder e mostra o chat
        if (placeholderView) placeholderView.style.display = 'none';
        conversationView.innerHTML = ''; // Limpa o placeholder

        const viewNode = convoViewTemplate.content.cloneNode(true);
        const threadContainer = viewNode.querySelector('.mensagens-thread');

        // --- NOVO: Preenche o Cabeçalho do Chat (Coluna da Direita) ---
        const headerAvatar = viewNode.getElementById('chat-header-avatar');
        const headerNome = viewNode.getElementById('chat-header-nome');
        
        if (conversation.otherParticipant.fotoUrl) {
            headerAvatar.src = conversation.otherParticipant.fotoUrl;
        } else {
            headerAvatar.src = '../assets/images/avatar_placeholder.png'; // Fallback
        }
        headerNome.textContent = conversation.otherParticipant.nome;

        // --- (Lógica de renderização das bolhas - sem alteração, mas innerHTML é crucial) ---
        conversation.messages.forEach(msg => {
            const bubbleNode = messageBubbleTemplate.content.cloneNode(true);
            const bubbleEl = bubbleNode.querySelector('.mensagem');
            
            const isAdminSender = msg.senderType === 'admin' || msg.senderPsychologist?.id === adminId;
            bubbleEl.classList.add(isAdminSender ? 'mensagem-enviada' : 'mensagem-recebida');
            
            bubbleEl.querySelector('p').innerHTML = msg.content; // Usa innerHTML para renderizar HTML se houver
            const timestampEl = bubbleEl.querySelector('.mensagem-timestamp');
            timestampEl.textContent = new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Adiciona o indicador de "lido" para mensagens enviadas pelo admin
            if (isAdminSender && msg.isRead) {
                timestampEl.innerHTML += ' <span class="read-receipt">✓✓</span>';
            }
            
            threadContainer.appendChild(bubbleNode);
        });

        conversationView.appendChild(viewNode);

        // Adiciona listener para o botão de voltar no mobile
        const backBtn = conversationView.querySelector('.back-to-list-btn');
        if (backBtn) backBtn.addEventListener('click', () => {
            document.querySelector('.whatsapp-layout')?.classList.remove('mobile-chat-active');
        });

        threadContainer.scrollTop = threadContainer.scrollHeight; // Rola para a última mensagem

        // Adiciona o listener para o formulário de resposta
        const replyForm = document.getElementById('reply-form');
        if (replyForm) {
            replyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const textArea = document.getElementById('resposta-mensagem');
                const content = textArea?.value.trim();
                const submitBtn = replyForm.querySelector('button[type="submit"]');
                if (!content || !submitBtn) return;

                submitBtn.disabled = true;
                submitBtn.textContent = 'Enviando...';

                try {
                    const response = await fetch('http://localhost:3001/api/admin/reply', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            recipientId: conversation.otherParticipant.id,
                            recipientType: conversation.otherParticipant.type,
                            content: content
                        })
                    });

                    const newMessage = await response.json();
                    if (!response.ok) {
                        // Usa a mensagem de erro da API, ou um fallback genérico.
                        throw new Error(newMessage.error || 'Não foi possível enviar a mensagem.');
                    }
                    // Adiciona a nova mensagem à UI e limpa o campo
                    conversation.messages.push(newMessage);
                    renderConversationView(conversationKey, adminId); // Re-renderiza a conversa para mostrar a nova mensagem
                    if (textArea) textArea.value = '';

                    // Auto-ajusta a altura do textarea de volta ao mínimo
                    if (textArea) textArea.style.height = 'auto';
                    if (textArea) textArea.style.height = `${textArea.scrollHeight}px`;

                    // Re-renderiza a lista para atualizar a última mensagem
                    fetchConversations(currentPage);
                } catch (error) {
                    console.error('Erro ao enviar resposta:', error);
                    showToast(error.message, 'error');
                }
            });
        }
    }

    // Função para lidar com a exclusão de uma conversa
    function handleDeleteConversation(conversationKey, conversationId) {
        if (!confirmationModal) {
            console.error('Modal de confirmação não encontrado!');
            // Fallback para um confirm simples se o modal falhar
            if (confirm('Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.')) {
                confirmDelete(conversationId);
            }
            return;
        }

        // Configura e exibe o modal de confirmação
        const modalTitle = confirmationModal.querySelector('.modal-title');
        const modalBody = confirmationModal.querySelector('.modal-body');
        const confirmBtn = confirmationModal.querySelector('.modal-confirm-btn');
        const cancelBtn = confirmationModal.querySelector('.modal-cancel-btn');
        const closeBtn = confirmationModal.querySelector('.modal-close-btn');

        if (!modalTitle || !modalBody || !confirmBtn || !cancelBtn || !closeBtn) {
            console.error("Estrutura do modal de confirmação está incompleta.");
            return;
        }

        modalTitle.textContent = 'Excluir Conversa';
        modalBody.innerHTML = '<p>Tem certeza que deseja excluir esta conversa permanentemente? Esta ação não pode ser desfeita.</p>';
        confirmBtn.textContent = 'Sim, Excluir';

        confirmationModal.classList.add('is-visible');

        // Usa .cloneNode para remover listeners antigos e evitar chamadas múltiplas
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.onclick = () => confirmDelete(conversationId);
        cancelBtn.onclick = () => confirmationModal.classList.remove('is-visible');
        closeBtn.onclick = () => confirmationModal.classList.remove('is-visible');
    }

    // Função que executa a exclusão após a confirmação
    async function confirmDelete(conversationId) {
        // Se não houver ID de conversa (ex: um contato novo), não faz nada.
        if (!conversationId) return;

        try {
            const response = await fetch(`http://localhost:3001/api/admin/conversations/${conversationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao excluir conversa.');
            
            showToast('Conversa excluída com sucesso.', 'success');
            fetchConversations(currentPage); // Recarrega a página atual
            conversationView.innerHTML = ''; // Limpa a visão da conversa
            if (placeholderView) placeholderView.style.display = 'flex'; // Mostra o placeholder
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            if (confirmationModal) confirmationModal.classList.remove('is-visible');
        }
    }

    // Função para marcar a conversa como lida
    async function markAsRead(conversationKey) {
        const conversation = allConversations.get(conversationKey);
        if (!conversation || !conversation.messages.length) return;

        // A API precisa do ID da conversa, não da chave da UI
        const conversationId = conversation.messages[0].conversationId;

        try {
            await fetch(`http://localhost:3001/api/messaging/conversations/${conversationId}/read`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
            // Atualiza o estado local para remover o indicador de "não lido"
            conversation.unreadCount = 0;
            fetchConversations(currentPage);
        } catch (error) {
            console.error('Falha ao marcar conversa como lida:', error);
        }
    }

    // Função principal para buscar os dados (agora paginada)
    async function fetchConversations(page = 1) {
        currentPage = page;
        conversationsListWrapper.innerHTML = `<p class="loading-row">Carregando conversas...</p>`;

        const params = new URLSearchParams({
            page: currentPage,
            limit: CONVERSATIONS_PER_PAGE,
            view: currentView,
            search: searchInput.value
        });

        // Assumindo um novo endpoint no backend que retorna conversas paginadas
        const url = `http://localhost:3001/api/admin/conversations?${params.toString()}`;

        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao buscar conversas.');
            
            const data = await response.json();
            
            // Limpa o mapa de conversas e preenche com a página atual para a função de visualização
            allConversations.clear();
            data.conversations.forEach(convo => {
                const key = `${convo.otherParticipant.id}-${convo.otherParticipant.nome}`;
                allConversations.set(key, convo);
            });

            renderConversationsList(data.conversations);
            renderPagination(data.totalPages, data.currentPage);

            // Adiciona o listener de clique na lista de conversas
            // É importante re-adicionar o listener a cada renderização da lista
            conversationsListWrapper.addEventListener('click', (e) => {
                const preview = e.target.closest('.conversa-preview'); 
                if (preview) {
                    conversationsListWrapper.querySelectorAll('.conversa-preview').forEach(p => p.classList.remove('ativa'));
                    preview.classList.add('ativa');
                    const conversationKey = preview.dataset.conversationKey;
                    renderConversationView(conversationKey, adminId);
                    markAsRead(conversationKey); // Marca como lida ao abrir
                }
            });

        } catch (error) {
            console.error("Erro ao carregar a caixa de entrada:", error);
            conversationsListWrapper.innerHTML = `<p class="error-row">${error.message}</p>`;
        }
    }

    // Função inicial que busca o ID do admin e depois as conversas
    async function initializeInbox() {
        try {
            const adminResponse = await fetch('http://localhost:3001/api/admin/me', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!adminResponse.ok) throw new Error('Falha ao identificar administrador.');
            const adminData = await adminResponse.json();
            adminId = adminData.id;
            
            // --- NOVO: Define o avatar do admin no header da lista ---
            if (adminAvatar && adminData.fotoUrl) {
                adminAvatar.src = adminData.fotoUrl;
            }
            // --- NOVO: Define o nome do admin no header da lista ---
            const adminHeaderNome = document.getElementById('admin-header-nome');
            if (adminHeaderNome && adminData.nome) {
                adminHeaderNome.textContent = "Admin Girassol";
            }
            fetchConversations(1); // Carrega a primeira página de conversas
        } catch (error) {
            console.error("Erro na inicialização:", error);
            conversationsListWrapper.innerHTML = `<p class="error-row">Sessão inválida. Por favor, faça login novamente.</p>`;
        }
    }

    // Listener para o campo de busca
    if (searchInput) searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchConversations(1), 300); // Busca na página 1 com o novo filtro
    });

    // --- NOVO: Adiciona auto-resize no textarea de resposta ---
    // (O seu JS já tem isso, mas vamos garantir que o seletor está correto)
    // Auto-ajuste de altura para o textarea da resposta
    if (conversationView) conversationView.addEventListener('input', (e) => {
        if (e.target.id === 'resposta-mensagem') {
            const textarea = e.target;
            // Reseta a altura para recalcular o scrollHeight corretamente
            textarea.style.height = 'auto';
            // Define a nova altura baseada no conteúdo, com um limite
            textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`; // Cresce até 150px
        }
    });

    // Listener para as abas
    if (navListContainer) navListContainer.addEventListener('click', (e) => {
        const navItem = e.target.closest('.inbox-nav-item');
        if (navItem) {
            navListContainer.querySelectorAll('.inbox-nav-item').forEach(item => item.classList.remove('active'));
            navItem.classList.add('active');
            currentView = navItem.dataset.view;
            fetchConversations(1); // Busca na página 1 com a nova visão
        }
    });

    // --- LÓGICA DO MODAL DE MENSAGEM EM MASSA ---

    if (newBroadcastBtn) newBroadcastBtn.addEventListener('click', () => {
        if (broadcastModal) {
            broadcastModal.classList.add('is-visible');
        } else {
            alert('Funcionalidade de Mensagem em Massa em desenvolvimento.');
        }
    });

    // A lógica interna do modal (submit, close) será adicionada quando o HTML do modal for implementado.
    // Adicionar verificações 'if (broadcastModal)' para evitar erros.
    if (broadcastModal) {
        const closeModalBtn = broadcastModal.querySelector('.modal-close-btn');
        const cancelModalBtn = broadcastModal.querySelector('.modal-cancel-btn');
        const broadcastForm = document.getElementById('broadcast-form');

        if(closeModalBtn) closeModalBtn.addEventListener('click', () => broadcastModal.classList.remove('is-visible', 'hidden'));
        if(cancelModalBtn) cancelModalBtn.addEventListener('click', () => broadcastModal.classList.remove('is-visible', 'hidden'));

        if (broadcastForm) {
            broadcastForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = broadcastForm.querySelector('button[type="submit"]');
                const target = document.getElementById('broadcast-target')?.value;
                const content = document.getElementById('broadcast-content')?.value.trim();

                if (!target || !content) {
                    showToast('Por favor, selecione um público e digite uma mensagem.', 'error');
                    return;
                }

                // submitBtn.disabled = true;
                // submitBtn.textContent = 'Enviando...';

                try {
                    // const response = await fetch('http://localhost:3001/api/admin/broadcast', {
                    //     method: 'POST',
                    //     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    //     body: JSON.stringify({ target, content })
                    // });

                    // const result = await response.json();
                    // if (!response.ok) throw new Error(result.error || 'Falha ao enviar mensagem em massa.');

                    // showToast(result.message, 'success');
                    // broadcastModal.classList.remove('is-visible');
                    // broadcastForm.reset();
                    // fetchConversations(1); // Atualiza a lista de conversas
                } catch (error) {
                    // showToast(error.message, 'error');
                } finally {
                    // submitBtn.disabled = false;
                    // submitBtn.textContent = 'Enviar Mensagem';
                }
            });
        }
    }

    // --- LÓGICA PARA UPLOAD DE FOTO DO ADMIN ---
    const avatarUploadInput = document.getElementById('admin-avatar-upload');
    if (avatarUploadInput && adminAvatar) {
        avatarUploadInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // 1. Mostra a preview instantaneamente
            const newPhotoURL = URL.createObjectURL(file);
            adminAvatar.src = newPhotoURL;

            // 2. Envia o arquivo para o backend
            const formData = new FormData();
            formData.append('profilePhoto', file);

            try {
                // Assumindo que a rota para upload de foto do admin seja similar à do psicólogo
                const response = await fetch('http://localhost:3001/api/admin/me/photo', {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }, // Content-Type é definido automaticamente pelo browser para FormData
                    body: formData
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Falha ao fazer upload da foto.');
                }

                showToast('Foto de perfil atualizada com sucesso!', 'success');
                // A foto já foi atualizada na preview, a URL final virá do backend
                adminAvatar.src = result.fotoUrl; 
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }

    // Inicia o carregamento
    initializeInbox();
};