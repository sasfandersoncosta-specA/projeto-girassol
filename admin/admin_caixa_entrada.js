// admin/admin_caixa_entrada.js

window.initializePage = function() {
    const token = localStorage.getItem('girassol_token');
    if (!token) {
        window.location.replace('login.html');
        return;
    }

    document.querySelector('.dashboard-main').classList.add('inbox-active');
    // --- Elementos do DOM ---
    const conversationListContainer = document.getElementById('conversations-list-container');
    const searchInput = document.getElementById('chat-search');
    
    // Painel de Notas
    const notesPanel = document.getElementById('internal-notes-panel');
    const openNotesButton = document.querySelector('.internal-notes-toggle button'); // Botão no header do chat
    const closeNotesButton = document.getElementById('close-notes-panel');
    const notesThreadContainer = document.getElementById('notes-thread-container');
    const addNoteForm = document.getElementById('add-note-form');
    const noteInput = document.getElementById('note-input');
    const messageInput = document.getElementById('rich-text-input');
    const sendButton = document.querySelector('.btn-send');
    const quickReplyMenu = document.getElementById('quick-reply-menu');
    const messagesThreadContainer = document.getElementById('messages-thread-container');

    // --- Estado da Aplicação ---
    let currentConversations = [];
    let activeConversationId = null;
    let activeParticipant = null;
    let debounceTimer;
    let socket;

    // --- INICIALIZAÇÃO DO SOCKET ---
    initializeSocket();
    /**
     * Formata e renderiza um item de conversa na lista da esquerda.
     * @param {object} convo - Objeto da conversa vindo da API.
     */
    function renderConversationItem(convo) {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        item.dataset.id = convo.id;
        item.dataset.participantId = convo.otherParticipant.id;
        item.dataset.participantType = convo.otherParticipant.type;
 
        const unreadBadge = convo.unreadCount > 0 ? `<span class="unread-badge">${convo.unreadCount}</span>` : '';
        const lastMessagePrefix = convo.lastMessage.senderId === window.adminId ? '<i class="fas fa-check-double read-receipt"></i> Você: ' : '';

        item.innerHTML = `
            <img src="${convo.otherParticipant.fotoUrl || '../assets/images/placeholder-user.png'}" alt="Avatar de ${convo.otherParticipant.nome}" class="avatar">
            <div class="conversation-details">
                <div class="details-header">
                    <span class="contact-name">${convo.otherParticipant.nome}</span>
                    <span class="timestamp">${new Date(convo.lastMessage.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="details-body">
                    <p class="last-message">${lastMessagePrefix}${convo.lastMessage.content}</p>
                    <div class="body-actions">
                        ${unreadBadge}
                        <button class="icon-btn-sm btn-delete-conversation" title="Excluir conversa"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            </div>
        `;
        return item;
    }

    /**
     * Atualiza o preview de uma conversa na lista da esquerda e a move para o topo.
     * @param {object} message - O objeto da nova última mensagem.
     */
    function updateConversationPreview(message) {
        const conversationId = message.conversationId;
        const conversationItem = conversationListContainer.querySelector(`[data-id="${conversationId}"]`);

        if (!conversationItem) {
            // Se a conversa não está na lista (ex: nova conversa), recarrega tudo.
            fetchAndRenderConversations(searchInput.value);
            return;
        }

        // Atualiza a última mensagem
        const lastMessageEl = conversationItem.querySelector('.last-message');
        const isAdminSender = message.senderId === window.adminId;
        lastMessageEl.innerHTML = `${isAdminSender ? '<i class="fas fa-check-double read-receipt"></i> Você: ' : ''}${message.content}`;

        // Atualiza o timestamp
        const timestampEl = conversationItem.querySelector('.timestamp');
        timestampEl.textContent = new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Atualiza o contador de não lidas (se não for o admin que enviou)
        if (!isAdminSender) {
            let unreadBadge = conversationItem.querySelector('.unread-badge');
            const currentCount = unreadBadge ? parseInt(unreadBadge.textContent, 10) : 0;
            if (unreadBadge) {
                unreadBadge.textContent = currentCount + 1;
            } else {
                const actionsContainer = conversationItem.querySelector('.body-actions');
                actionsContainer.insertAdjacentHTML('afterbegin', `<span class="unread-badge">1</span>`);
            }
        }

        // Move o item para o topo da lista
        conversationListContainer.prepend(conversationItem);
    }

    /**
     * Busca as conversas da API e renderiza a lista.
     * @param {string} searchTerm - Termo de busca opcional.
     */
    async function fetchAndRenderConversations(searchTerm = '') {
        try {
            const response = await fetch(`http://localhost:3001/api/admin/conversations?search=${searchTerm}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao buscar conversas.');

            const data = await response.json();
            currentConversations = data.conversations;

            conversationListContainer.innerHTML = ''; // Limpa a lista
            if (currentConversations.length > 0) {
                currentConversations.forEach(convo => {
                    conversationListContainer.appendChild(renderConversationItem(convo));
                });
            } else {
                conversationListContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Nenhuma conversa encontrada.</p>';
            }
        } catch (error) {
            console.error(error);
            conversationListContainer.innerHTML = `<p style="text-align:center; padding: 20px; color: red;">${error.message}</p>`;
        }
    }

    // --- LÓGICA DAS NOTAS INTERNAS ---

    /**
     * Busca e renderiza as notas para a conversa ativa.
     */
    async function fetchAndRenderNotes() {
        if (!activeConversationId) return;

        notesThreadContainer.innerHTML = '<p class="notes-empty-state">Carregando notas...</p>';
        try {
            const response = await fetch(`http://localhost:3001/api/admin/conversations/${activeConversationId}/notes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao buscar notas.');

            const notes = await response.json();
            notesThreadContainer.innerHTML = '';

            if (notes.length === 0) {
                notesThreadContainer.innerHTML = '<p class="notes-empty-state">Nenhuma nota para esta conversa ainda.</p>';
            } else {
                notes.forEach(note => {
                    notesThreadContainer.appendChild(renderNoteItem(note));
                });
            }
        } catch (error) {
            console.error(error);
            notesThreadContainer.innerHTML = `<p class="notes-empty-state" style="color: red;">${error.message}</p>`;
        }
    }

    /**
     * Cria o HTML para um item de nota.
     * @param {object} note - O objeto da nota.
     */
    function renderNoteItem(note) {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.innerHTML = `
            <div class="note-meta">
                <span class="note-author">${note.author?.nome || 'Admin'}</span>
                <span class="note-timestamp">${new Date(note.createdAt).toLocaleString('pt-BR')}</span>
            </div>
            <p class="note-content">${note.content}</p>
        `;
        return noteItem;
    }

    /**
     * Lida com o envio do formulário de nova nota.
     */
    async function handleAddNote(e) {
        e.preventDefault();
        const content = noteInput.value.trim();
        if (!content || !activeConversationId) return;

        try {
            const response = await fetch(`http://localhost:3001/api/admin/conversations/${activeConversationId}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) throw new Error('Falha ao salvar a nota.');
            
            // Limpa o input e recarrega as notas para exibir a nova.
            noteInput.value = '';
            fetchAndRenderNotes();

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    /**
     * Renderiza uma bolha de mensagem na thread ativa.
     * @param {object} message - O objeto da mensagem.
     */
    function renderMessageBubble(message) {
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        // Assumindo que o admin logado tem seu ID em window.adminId
        const isAdminSender = message.senderId === window.adminId;
        bubble.classList.add(isAdminSender ? 'sent' : 'received');

        bubble.innerHTML = `
            <p>${message.content}</p>
            <div class="message-meta">
                <span class="timestamp">${new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                ${isAdminSender ? '<i class="fas fa-check-double read-receipt"></i>' : ''}
            </div>
        `;
        messagesThreadContainer.appendChild(bubble);
        messagesThreadContainer.scrollTop = messagesThreadContainer.scrollHeight;
    }

    /**
     * Busca o histórico de mensagens de uma conversa.
     */
    async function fetchMessagesForConversation(conversationId) {
        messagesThreadContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Carregando histórico...</p>';
        const response = await fetch(`http://localhost:3001/api/admin/conversations/${conversationId}/messages`, { headers: { 'Authorization': `Bearer ${token}` } });
        const messages = await response.json();
        messagesThreadContainer.innerHTML = ''; // Limpa a thread
        messages.forEach(renderMessageBubble);
    }

    // --- Event Listeners ---

    // Busca
    searchInput.addEventListener('keyup', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchAndRenderConversations(e.target.value);
        }, 500);
    });

    // Selecionar uma conversa
    conversationListContainer.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('.btn-delete-conversation');
        
        if (deleteButton) {
            event.stopPropagation(); // Impede que o clique selecione a conversa
            const conversationItem = deleteButton.closest('.conversation-item');
            const conversationId = conversationItem.dataset.id;
            const contactName = conversationItem.querySelector('.contact-name').textContent;

            window.openConfirmationModal(
                'Confirmar Exclusão',
                `<p>Você tem certeza que deseja excluir permanentemente a conversa com <strong>${contactName}</strong>? Todas as mensagens serão perdidas.</p>`,
                async () => {
                    try {
                        const response = await fetch(`http://localhost:3001/api/admin/conversations/${conversationId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!response.ok) throw new Error('Falha ao excluir conversa.');
                        conversationItem.remove(); // Remove o item da lista na UI
                    } catch (error) { console.error(error); alert(error.message); }
                }
            );
            return; // Encerra a função aqui para não processar o clique na conversa
        }

        // Lógica para destacar o item clicado
        const allItems = conversationListContainer.querySelectorAll('.conversation-item');
        allItems.forEach(item => item.classList.remove('active'));
        if (event.target.closest('.conversation-item')) {
            event.target.closest('.conversation-item').classList.add('active');
        }

        const conversationItem = event.target.closest('.conversation-item');
        if (conversationItem) {
            activeConversationId = conversationItem.dataset.id;
            activeParticipant = {
                id: conversationItem.dataset.participantId,
                type: conversationItem.dataset.participantType
            };

            // Se for um novo contato (sem ID de conversa), não marca como lido nem busca histórico
            if (!activeConversationId) {
                document.getElementById('chat-welcome-screen').style.display = 'none';
                document.getElementById('active-chat-screen').style.display = 'flex';
                messagesThreadContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Inicie a conversa enviando uma mensagem.</p>';
                // Atualiza o header do chat e sai da função
                const contactName = conversationItem.querySelector('.contact-name').textContent;
                const contactAvatar = conversationItem.querySelector('.avatar').src;
                document.getElementById('active-chat-name').textContent = contactName;
                document.getElementById('active-chat-avatar').src = contactAvatar;
                notesPanel.classList.remove('visible');
                return;
            }
            
            // --- LÓGICA PARA MARCAR COMO LIDO ---
            // 1. Remove o badge da UI imediatamente (Optimistic UI)
            const unreadBadge = conversationItem.querySelector('.unread-badge');
            if (unreadBadge) {
                unreadBadge.remove();
            }

            // 2. Envia a requisição para o backend para marcar como lido
            try {
                await fetch(`http://localhost:3001/api/messaging/conversations/${activeConversationId}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (error) { console.error('Falha ao marcar conversa como lida:', error); }

            // Lógica para mostrar o painel de chat ativo (simplificada)
            document.getElementById('chat-welcome-screen').style.display = 'none';
            document.getElementById('active-chat-screen').style.display = 'flex';
            
            // Atualiza o header do chat
            const contactName = conversationItem.querySelector('.contact-name').textContent;
            const contactAvatar = conversationItem.querySelector('.avatar').src;
            document.getElementById('active-chat-name').textContent = contactName;
            document.getElementById('active-chat-avatar').src = contactAvatar;

            fetchMessagesForConversation(activeConversationId); // Carrega o histórico

            // Fecha o painel de notas se estiver aberto
            notesPanel.classList.remove('visible');
        }
    });

    // Abrir painel de notas
    openNotesButton.addEventListener('click', () => {
        if (activeConversationId) {
            notesPanel.classList.add('visible');
            fetchAndRenderNotes(); // Busca as notas ao abrir
        } else {
            alert("Selecione uma conversa para ver as notas.");
        }
    });

    // Fechar painel de notas
    closeNotesButton.addEventListener('click', () => {
        notesPanel.classList.remove('visible');
    });

    // Adicionar uma nota
    addNoteForm.addEventListener('submit', handleAddNote);

    // Enviar mensagem
    function handleSendMessage() {
        const content = messageInput.innerText.trim();
        // CORREÇÃO: A verificação agora é se temos um participante ativo,
        // não se a conversa já existe. Isso permite iniciar novas conversas.
        if (!content || !activeParticipant || !socket) {
            return;
        }

        const messagePayload = {
            conversationId: activeConversationId,
            recipientId: activeParticipant.id,
            recipientType: activeParticipant.type,
            content: content
        };

        socket.emit('sendMessage', messagePayload, (response) => {
            if (response.success) {
                // The message was sent and saved successfully.
                renderMessageBubble(response.message);

                // If this was a new conversation, the backend has now created it.
                // We need to update the frontend state to reflect this.
                if (!activeConversationId) {
                    // Set the activeConversationId with the ID from the newly created message's conversation
                    activeConversationId = response.message.conversationId;

                    // Find the temporary "new contact" item in the list and update its dataset
                    const newConvoItem = conversationListContainer.querySelector(`.conversation-item[data-participant-id="${activeParticipant.id}"]`);
                    if (newConvoItem) {
                        newConvoItem.dataset.id = activeConversationId;
                    }
                }
                updateConversationPreview(response.message);

                // A atualização da lista é tratada pelo evento 'conversationUpdated'
                messageInput.innerHTML = ''; // Limpa o editor
            } else {
                console.error("Falha ao enviar mensagem:", response.error);
                alert("Não foi possível enviar a mensagem.");
            }
        });
    }

    sendButton.addEventListener('click', handleSendMessage);
    messageInput.addEventListener('keydown', (e) => {
        // Envia com Enter (sem Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // --- LÓGICA DE RESPOSTAS RÁPIDAS (/) ---

    messageInput.addEventListener('input', () => {
        const text = messageInput.innerText;
        const slashIndex = text.lastIndexOf('/');

        // Verifica se há um '/' e se não há espaços depois dele
        if (slashIndex !== -1 && !text.substring(slashIndex).includes(' ')) {
            const query = text.substring(slashIndex + 1).toLowerCase();
            const items = quickReplyMenu.querySelectorAll('.quick-reply-item');
            let hasVisibleItems = false;

            items.forEach(item => {
                const itemText = item.textContent.toLowerCase();
                if (itemText.includes(query)) {
                    item.style.display = 'block';
                    hasVisibleItems = true;
                } else {
                    item.style.display = 'none';
                }
            });

            if (hasVisibleItems) {
                quickReplyMenu.style.display = 'block';
            } else {
                quickReplyMenu.style.display = 'none';
            }
        } else {
            quickReplyMenu.style.display = 'none';
        }
    });

    quickReplyMenu.addEventListener('click', (e) => {
        const selectedItem = e.target.closest('.quick-reply-item');
        if (selectedItem) {
            const text = messageInput.innerText;
            const slashIndex = text.lastIndexOf('/');
            
            // Substitui o comando (ex: "/saudacao") pelo valor da resposta rápida
            const newText = text.substring(0, slashIndex) + selectedItem.dataset.value;
            messageInput.innerText = newText;

            quickReplyMenu.style.display = 'none';

            // Coloca o cursor no final do texto
            messageInput.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(messageInput);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    });

    // --- LÓGICA DO SOCKET.IO ---

    function initializeSocket() {
        socket = io('http://localhost:3001', {
            auth: {
                token: token
            }
        });

        socket.on('connect', () => {
            console.log('Socket.IO conectado com sucesso!', socket.id);
            if (!window.adminId) {
                console.warn("ID do admin não encontrado em window.adminId. A diferenciação de mensagens pode falhar.");
            }
        });

        socket.on('receiveMessage', (message) => {
            console.log('Nova mensagem recebida:', message);

            // Apenas renderiza a bolha se a mensagem pertencer à conversa ativa e não for do próprio admin
            if (message.conversationId.toString() === activeConversationId) {
                renderMessageBubble(message);
            }
        });

        socket.on('conversationUpdated', (data) => {
            console.log('Evento de atualização de conversa recebido:', data);
            // A API de conversas já retorna a última mensagem, então podemos usar o objeto `data.lastMessage`
            if (data.lastMessage) {
                updateConversationPreview(data.lastMessage);
            }
        });

        socket.on('connect_error', (err) => {
            console.error('Erro de conexão com Socket.IO:', err.message);
            alert('Não foi possível conectar ao chat em tempo real.');
        });
    }

    // --- Inicialização ---
    fetchAndRenderConversations();
};