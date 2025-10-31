document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-redefinir-senha');
    const novaSenhaInput = document.getElementById('nova-senha');
    const confirmarSenhaInput = document.getElementById('confirmar-nova-senha');
    const mensagemEl = document.getElementById('mensagem-redefinir-senha');

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userType = params.get('type');

    if (!token || !userType) {
        mensagemEl.textContent = 'Link de redefinição inválido ou expirado.';
        mensagemEl.className = 'mensagem-erro';
        form.style.display = 'none';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const novaSenha = novaSenhaInput.value;
        const confirmarSenha = confirmarSenhaInput.value;

        if (novaSenha !== confirmarSenha) {
            mensagemEl.textContent = 'As senhas não conferem.';
            mensagemEl.className = 'mensagem-erro';
            return;
        }

        const apiUrl = userType === 'patient'
            ? `http://localhost:3001/api/patients/reset-password/${token}`
            : `http://localhost:3001/api/psychologists/reset-password/${token}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senha: novaSenha })
            });

            const result = await response.json();

            if (response.ok) {
                mensagemEl.textContent = result.message + ' Redirecionando para o login...';
                mensagemEl.className = 'mensagem-sucesso';
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            } else {
                mensagemEl.textContent = result.error || 'Ocorreu um erro.';
                mensagemEl.className = 'mensagem-erro';
            }
        } catch (error) {
            console.error('Erro de conexão:', error);
            mensagemEl.textContent = 'Falha na conexão com o servidor.';
            mensagemEl.className = 'mensagem-erro';
        }
    });
});