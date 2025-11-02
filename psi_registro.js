// Lógica para registrar um novo psicólogo usando a API REST
document.addEventListener('DOMContentLoaded', () => {

    // Pega os parâmetros da URL para pré-preencher o formulário
    const params = new URLSearchParams(window.location.search);
    const nomeParam = params.get('nome');
    const emailParam = params.get('email');
    const crpParam = params.get('crp');
    const tokenParam = params.get('token'); // Pega o token de convite da URL

    // Preenche os campos se os parâmetros existirem
    if (nomeParam) document.getElementById('nome-completo').value = nomeParam;
    if (emailParam) document.getElementById('email').value = emailParam;
    if (crpParam) document.getElementById('crp').value = crpParam;

    const formRegistro = document.getElementById('form-registro-psi');
    const mensagemRegistro = document.getElementById('mensagem-registro-psi');

    if (!formRegistro) {
        return;
    }

    formRegistro.addEventListener('submit', async (event) => {
        
        event.preventDefault();

        mensagemRegistro.textContent = '';
        mensagemRegistro.classList.add('mensagem-oculta');

        const nome = document.getElementById('nome-completo').value;
        const crp = document.getElementById('crp').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;
        const termosAceite = document.getElementById('termos-aceite').checked;
        
        if (senha !== confirmarSenha) {
            mensagemRegistro.textContent = 'As senhas não conferem. Verifique.';
            mensagemRegistro.classList.remove('mensagem-oculta');
            mensagemRegistro.classList.add('mensagem-erro');
            return;
        }

        if (!termosAceite) {
            mensagemRegistro.textContent = 'Você precisa aceitar os Termos e Condições para continuar.';
            mensagemRegistro.classList.remove('mensagem-oculta');
            mensagemRegistro.classList.add('mensagem-erro');
            return;
        }

        const dadosPsicologo = {
            nome: nome,
            crp: crp,
            email: email,
            senha: senha,
            invitationToken: tokenParam // Envia o token para o backend
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/psychologists/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosPsicologo)
            });

            const result = await response.json();

            if (response.ok) { 
                mensagemRegistro.textContent = result.message + " Redirecionando para o login...";
                mensagemRegistro.classList.remove('mensagem-oculta');
                mensagemRegistro.classList.add('mensagem-sucesso');

                formRegistro.reset();

                setTimeout(() => {
                    window.location.href = 'psi_login.html'; 
                }, 2000);

            } else {
                mensagemRegistro.textContent = result.error;
                mensagemRegistro.classList.remove('mensagem-oculta');
                mensagemRegistro.classList.add('mensagem-erro');
            }

        } catch (error) {
            console.error('Erro de conexão com a API:', error);
            mensagemRegistro.textContent = 'Erro ao conectar com o servidor. Verifique se o backend está rodando.';
            mensagemRegistro.classList.remove('mensagem-oculta');
            mensagemRegistro.classList.add('mensagem-erro');
        }
    });
});