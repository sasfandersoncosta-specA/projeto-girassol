// Aguarda o carregamento completo do documento antes de executar o script
document.addEventListener('DOMContentLoaded', () => {
    // 1. Elementos do Formulário
    // IDs adicionados no login.html: form-login, email-login, senha-login, mensagem-login
    const loginForm = document.getElementById('form-login');
    const emailInput = document.getElementById('email-login');
    const senhaInput = document.getElementById('senha-login');
    const mensagemEl = document.getElementById('mensagem-login');

    // Função para exibir mensagens (Sucesso ou Erro)
    function showMessage(text, isError = false) {
        mensagemEl.textContent = text;
        // Classes de estilo definidas no CSS para controle de visibilidade/cor
        mensagemEl.classList.remove('mensagem-oculta', 'mensagem-erro', 'mensagem-sucesso');
        mensagemEl.classList.add(isError ? 'mensagem-erro' : 'mensagem-sucesso');
        
        // Define para sumir após 5 segundos
        setTimeout(() => {
            mensagemEl.classList.add('mensagem-oculta');
        }, 5000);
    }

    // 2. Evento de Submissão do Formulário
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Impede o envio tradicional (que recarrega a página)

            const email = emailInput.value;
            const senha = senhaInput.value;

            // Limpa mensagens anteriores
            mensagemEl.textContent = '';
            mensagemEl.classList.add('mensagem-oculta');

            // Prepara os dados para o backend
            const payload = JSON.stringify({ email, senha });

            try {
                // 3. Chamada à API de Login
                const response = await fetch('http://localhost:3001/api/patients/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: payload,
                });

                const data = await response.json();

                // 4. Tratamento da Resposta
                if (response.ok) {
                    // Login Bem-Sucedido
                    showMessage('Login bem-sucedido! Redirecionando...', false);

                    // SALVA O TOKEN JWT NO LOCALSTORAGE
                    localStorage.setItem('girassol_token', data.token);

                    // REDIRECIONAMENTO CORRIGIDO PARA A URL ABSOLUTA DO LIVE SERVER
                    setTimeout(() => {
                        window.location.href = 'http://127.0.0.1:5500/patient/patient_dashboard.html'; 
                    }, 500); // Redireciona um pouco mais rápido

                } else {
                    // Erro de Login (Email/Senha inválidos, etc.)
                    const errorMessage = data.error || 'Email ou senha inválidos. Tente novamente.';
                    showMessage(errorMessage, true);
                }
            } catch (error) {
                // Erro de Rede ou Servidor
                console.error('Erro de conexão:', error);
                showMessage('Falha na conexão com o servidor. Verifique se o backend está ligado.', true);
            }
        });
    }
});
