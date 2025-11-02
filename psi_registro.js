// Arquivo: psi_registro.js (CORRIGIDO)
document.addEventListener('DOMContentLoaded', () => {

    // --- MÁSCARAS DE INPUT ---
    const crpInput = document.getElementById('crp');
    const cpfInput = document.getElementById('cpf');

    if (crpInput && window.IMask) {
        IMask(crpInput, { mask: '00/000000' });
    }
    if (cpfInput && window.IMask) {
        IMask(cpfInput, { mask: '000.000.000-00' });
    }

    // --- LÓGICA DE VALIDAÇÃO DE CPF (SIMPLES) ---
    function isCpfValid(cpf) {
        if (!cpf) return false;
        const cpfLimpo = cpf.replace(/\D/g, ''); 
        if (cpfLimpo.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cpfLimpo)) return false; 
        return /^\d{11}$/.test(cpfLimpo);
    }

    // --- PRÉ-PREENCHIMENTO DA URL ---
    const params = new URLSearchParams(window.location.search);
    const nomeParam = params.get('nome');
    const emailParam = params.get('email');
    const crpParam = params.get('crp');
    const tokenParam = params.get('token'); 

    const emailInput = document.getElementById('email'); 

    if (nomeParam) document.getElementById('nome-completo').value = nomeParam;
    if (emailParam) emailInput.value = emailParam;
    if (crpParam) crpInput.value = crpParam;

    // --- LÓGICA DO FORMULÁRIO ---
    const formRegistro = document.getElementById('form-registro-psi');
    const mensagemRegistro = document.getElementById('mensagem-registro-psi');

    if (!formRegistro) {
        return;
    }

    formRegistro.addEventListener('submit', async (event) => {
        
        event.preventDefault();
        mensagemRegistro.textContent = '';
        mensagemRegistro.className = 'mensagem-oculta'; 

        // --- VALIDAÇÕES (permanecem as mesmas) ---
        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;
        const cpf = cpfInput.value;
        const termosAceite = document.getElementById('termos-aceite').checked;

        if (senha !== confirmarSenha) {
            mensagemRegistro.textContent = 'As senhas não conferem. Verifique.';
            mensagemRegistro.className = 'mensagem-erro';
            return;
        }
        if (senha.length < 6) {
            mensagemRegistro.textContent = 'A senha deve ter ao menos 6 dígitos.';
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

        // --- CORREÇÃO APLICADA AQUI ---

        // 1. Tenta carregar os dados do questionário do localStorage
        const storedAnswers = JSON.parse(localStorage.getItem('psi_questionario_respostas') || '{}');

        // 2. Coleta os dados deste formulário
        const registrationData = {
            nome: document.getElementById('nome-completo').value,
            crp: crpInput.value,
            cpf: cpf,
            email: emailInput.value,
            senha: senha,
            invitationToken: tokenParam 
        };

        // 3. MESCLA os dois objetos. Os dados do registro (mais recentes) têm prioridade.
        const dadosPsicologo = {
            ...storedAnswers,
            ...registrationData
        };

        // --- FIM DA CORREÇÃO ---


        // --- CHAMADA DE API ---
        try {
            const response = await fetch(`${API_BASE_URL}/api/psychologists/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosPsicologo) // Envia o payload mesclado
            });

            const result = await response.json();

            if (response.ok) { 
                mensagemRegistro.textContent = result.message + " Redirecionando para o login...";
                mensagemRegistro.className = 'mensagem-sucesso';
                formRegistro.reset();

                // 4. LIMPA o localStorage após o sucesso
                localStorage.removeItem('psi_questionario_respostas');

                // Salva os dados de pré-login (que você já tinha)
                localStorage.setItem('login_prefetch_email', registrationData.email);
                localStorage.setItem('login_prefetch_role', 'psychologist');

                setTimeout(() => {
                    window.location.href = 'login.html'; 
                }, 2000);

            } else {
                mensagemRegistro.textContent = result.error;
                mensagemRegistro.className = 'mensagem-erro';
            }

        } catch (error) {
            console.error('Erro de conexão ou script:', error); 
            mensagemRegistro.textContent = 'Erro ao conectar com o servidor. Verifique o console.';
            mensagemRegistro.className = 'mensagem-erro';
        }
    });
});