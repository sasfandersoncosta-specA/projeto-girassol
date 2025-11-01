window.initializePage = function() {
    const token = localStorage.getItem('girassol_token');

    const formDados = document.getElementById('form-dados-admin');
    const formSenha = document.getElementById('form-senha-admin');

    const nomeInput = document.getElementById('admin-nome');
    const emailInput = document.getElementById('admin-email');
    const telefoneInput = document.getElementById('admin-telefone');

    if (!formDados || !formSenha || !token) {
        console.error("Elementos do formulário ou token não encontrados.");
        return;
    }

    // Aplica máscara de telefone
    if (window.IMask && telefoneInput) {
        IMask(telefoneInput, { mask: '(00) 00000-0000' });
    }

    // Função para mostrar notificações (toast)
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const template = document.getElementById('toast-template');
        if (!container || !template) return;

        const toast = template.content.cloneNode(true).querySelector('.toast');
        toast.textContent = message;
        toast.classList.add(`toast-${type}`);
        container.appendChild(toast);

        setTimeout(() => toast.remove(), 4500);
    }

    // Busca e preenche os dados do admin
    async function fetchAdminData() {
        try {
            const response = await fetch('http://localhost:3001/api/admin/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao buscar dados do administrador.');

            const admin = await response.json();
            nomeInput.value = admin.nome || '';
            emailInput.value = admin.email || '';
            telefoneInput.value = admin.telefone || '';

        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Evento para salvar dados pessoais
    formDados.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = formDados.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = 'Salvando...';

        const payload = {
            nome: nomeInput.value,
            email: emailInput.value,
            telefone: telefoneInput.value
        };

        try {
            const response = await fetch('http://localhost:3001/api/admin/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            showToast(result.message, 'success');
            // Atualiza o nome no menu lateral
            const adminNameEl = document.querySelector('.nome-admin');
            if (adminNameEl) adminNameEl.textContent = payload.nome;

            // Dispara um evento customizado para notificar outras partes da UI (como o header)
            window.dispatchEvent(new CustomEvent('adminDataUpdated'));

        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            button.disabled = false;
            button.textContent = 'Salvar Alterações';
        }
    });

    // Evento para alterar senha
    formSenha.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = formSenha.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = 'Alterando...';

        const senhaAtual = document.getElementById('admin-senha-atual').value;
        const novaSenha = document.getElementById('admin-nova-senha').value;
        const confirmarSenha = document.getElementById('admin-confirmar-senha').value;

        if (novaSenha !== confirmarSenha) {
            showToast('A nova senha e a confirmação não coincidem.', 'error');
            button.disabled = false;
            button.textContent = 'Alterar Senha';
            return;
        }

        const payload = {
            senha_atual: senhaAtual,
            nova_senha: novaSenha
        };

        try {
            const response = await fetch('http://localhost:3001/api/admin/me/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            showToast(result.message, 'success');
            formSenha.reset();

        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            button.disabled = false;
            button.textContent = 'Alterar Senha';
        }
    });

    // Inicia a página buscando os dados
    fetchAdminData();
};