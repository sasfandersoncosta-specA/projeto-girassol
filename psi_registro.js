document.addEventListener('DOMContentLoaded', () => {

    // --- MÁSCARAS DE INPUT ---
    const crpInput = document.getElementById('crp');
    const cpfInput = document.getElementById('cpf'); // Pega o novo campo

    if (crpInput && window.IMask) {
        IMask(crpInput, { mask: '00/000000' });
    }
    if (cpfInput && window.IMask) {
        IMask(cpfInput, { mask: '000.000.000-00' }); // Máscara de CPF
    }

    // --- LÓGICA DE VALIDAÇÃO DE CPF (SIMPLES) ---
    function isCpfValid(cpf) {
        if (!cpf) return false;
        const cpfLimpo = cpf.replace(/\D/g, ''); // Remove máscara
        if (cpfLimpo.length !== 11) return false;
        // Evita CPFs inválidos conhecidos (ex: 111.111.111-11)
        if (/^(\d)\1{10}$/.test(cpfLimpo)) return false; 
        
        // Validação de dígito (simplificada para o frontend, o backend deve revalidar)
        // Esta é uma validação básica de formato
        return /^\d{11}$/.test(cpfLimpo);
    }


    // --- PRÉ-PREENCHIMENTO DA URL ---
    const params = new URLSearchParams(window.location.search);
    const nomeParam = params.get('nome');
    const emailParam = params.get('email');
    const crpParam = params.get('crp');
    const tokenParam = params.get('token'); 

    const nomeInput = document.getElementById('nome-completo');
    const emailInput = document.getElementById('email');
    
    if (nomeParam) nomeInput.value = nomeParam;
    if (emailParam) emailInput.value = emailParam;
    if (crpParam) crpInput.value = crpParam;

    // Força o "label flutuante" a subir se houver pré-preenchimento
    [nomeInput, emailInput, crpInput].forEach(input => {
        if (input.value) {
            input.classList.add('prefilled'); // Assumindo que você tem um CSS para :not(:placeholder-shown)
        }
    });

    const formRegistro = document.getElementById('form-registro-psi');
    const mensagemRegistro = document.getElementById('mensagem-registro-psi');

    if (!formRegistro) {
        return;
    }

    formRegistro.addEventListener('submit', async (event) => {
        
        event.preventDefault();

        mensagemRegistro.textContent = '';
        mensagemRegistro.className = 'mensagem-oculta'; // Reseta classes

        const nome = nomeInput.value;
        const crp = crpInput.value;
        const cpf = cpfInput.value; // Coleta o CPF
        const email = emailInput.value;
        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;
        const termosAceite = document.getElementById('termos-aceite').checked;
        
        // --- VALIDAÇÕES DO LADO DO CLIENTE ---
        if (senha !== confirmarSenha) {
            mensagemRegistro.textContent = 'As senhas não conferem. Verifique.';
            mensagemRegistro.className = 'mensagem-erro';
            return;
        }

        if (!isCpfValid(cpf)) {
             mensagemRegistro.textContent = 'O CPF informado é inválido. Verifique.';
             mensagemRegistro.className = 'mensagem-erro';
             return;
        }

        if (!termosAceite) {
            mensagemRegistro.textContent = 'Você precisa aceitar os Termos e Condições.';
            mensagemRegistro.className = 'mensagem-erro';
            return;
        }

        const dadosPsicologo = {
            nome: nome,
            crp: crp,
            cpf: cpf, // Envia o CPF para o backend
            email: email,
            senha: senha,
            invitationToken: tokenParam 
        };

        // --- CHAMADA DE API ---
        try {
            // O ERRO 3 (CONEXÃO) É RESOLVIDO PORQUE config.js FOI CARREGADO NO HTML
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
                mensagemRegistro.className = 'mensagem-sucesso';
                formRegistro.reset();

                setTimeout(() => {
                    window.location.href = 'psi_login.html'; 
                }, 2000);

            } else {
                mensagemRegistro.textContent = result.error;
                mensagemRegistro.className = 'mensagem-erro';
            }

        } catch (error) {
            // Este erro (ReferenceError) não deve mais acontecer
            console.error('Erro de conexão ou script:', error); 
            mensagemRegistro.textContent = 'Erro ao conectar com o servidor. Verifique o console.';
            mensagemRegistro.className = 'mensagem-erro';
        }
    });
});