// Arquivo: psi_registro.js (COM MODO ADMIN)
document.addEventListener('DOMContentLoaded', () => {

    // --- PRÉ-PREENCHIMENTO E MODO ADMIN ---
    const params = new URLSearchParams(window.location.search);
    const nomeParam = params.get('nome');
    const emailParam = params.get('email');
    const crpParam = params.get('crp');
    const tokenParam = params.get('token'); 
    const modeParam = params.get('mode'); // Captura se é modo admin

    // --- MÁSCARAS DE INPUT ---
    const crpInput = document.getElementById('crp');
    const cpfInput = document.getElementById('cpf');
    const emailInput = document.getElementById('email'); 

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

    if (nomeParam) document.getElementById('nome-completo').value = nomeParam;
    if (emailParam && emailInput) emailInput.value = emailParam;
    if (crpParam && crpInput) crpInput.value = crpParam;

    // --- LÓGICA DO FORMULÁRIO ---
    const formRegistro = document.getElementById('form-registro-psi');
    const mensagemRegistro = document.getElementById('mensagem-registro-psi');

    if (!formRegistro) return;

    if (typeof setupPasswordToggles === 'function') {
        setupPasswordToggles();
    }

    formRegistro.addEventListener('submit', async (event) => {
        event.preventDefault();
        mensagemRegistro.textContent = '';
        mensagemRegistro.className = 'mensagem-oculta';

        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;
        const cpf = cpfInput.value;
        const termosAceite = document.getElementById('termos-aceite').checked;

        if (senha !== confirmarSenha) { mensagemRegistro.textContent = 'As senhas não conferem.'; mensagemRegistro.className = 'mensagem-erro'; return; }
        if (senha.length < 6) { mensagemRegistro.textContent = 'A senha deve ter no mínimo 6 caracteres.'; mensagemRegistro.className = 'mensagem-erro'; return; }
        if (!isCpfValid(cpf)) { mensagemRegistro.textContent = 'CPF inválido.'; mensagemRegistro.className = 'mensagem-erro'; return; }
        if (!termosAceite) { mensagemRegistro.textContent = 'Você deve aceitar os termos.'; mensagemRegistro.className = 'mensagem-erro'; return; }

        // --- CORREÇÃO DO PERFIL (ADMIN vs NORMAL) ---
        let storedAnswers = {};

        if (modeParam === 'admin') {
            console.log("Modo Admin detectado: Usando dados padrão.");
            // Cria dados fictícios para passar na validação do backend
            storedAnswers = {
                genero_identidade: 'Prefiro não informar',
                valor_sessao_faixa: 'A combinar',
                temas_atuacao: ['Cadastro Administrativo'],
                abordagens_tecnicas: ['Não especificado'],
                praticas_vivencias: [],
                modalidade: 'Online'
            };
        } else {
            // Fluxo normal: pega do localStorage
            storedAnswers = JSON.parse(localStorage.getItem('psi_questionario_respostas') || '{}');
        }

        const registrationData = {
            nome: document.getElementById('nome-completo').value,
            crp: crpInput.value,
            cpf: cpf,
            email: emailInput.value,
            senha: senha,
            invitationToken: tokenParam
        };

        const dadosPsicologo = { ...storedAnswers, ...registrationData };
        
        // Limpeza de CPF para evitar erro no backend
        if(dadosPsicologo.cpf) dadosPsicologo.cpf = dadosPsicologo.cpf.replace(/\D/g, '');

        try {
            const response = await fetch(`${API_BASE_URL}/api/psychologists/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosPsicologo)
            });
            const result = await response.json();

            if (response.ok) {
                // Se não for admin, limpa o cache. Se for admin, não precisa limpar nada.
                if (modeParam !== 'admin') {
                    localStorage.removeItem('psi_questionario_respostas');
                }
                
                // Não faz login automático se for admin criando conta pra outro
                if (modeParam === 'admin') {
                     mensagemRegistro.textContent = "Cadastro Administrativo realizado com sucesso!";
                     mensagemRegistro.className = 'mensagem-sucesso';
                     formRegistro.reset(); // Limpa o formulário para o próximo
                } else {
                    localStorage.setItem('login_prefetch_email', registrationData.email);
                    localStorage.setItem('login_prefetch_role', 'psychologist');
                    mensagemRegistro.textContent = result.message + " Redirecionando...";
                    mensagemRegistro.className = 'mensagem-sucesso';
                    setTimeout(() => { 
                        window.location.href = `login.html?email=${encodeURIComponent(registrationData.email)}&tipo=psi`; 
                    }, 2000);
                }

            } else {
                mensagemRegistro.textContent = result.error;
                mensagemRegistro.className = 'mensagem-erro';
            }
        } catch (error) {
            console.error('Erro de conexão ou script:', error);
            mensagemRegistro.textContent = 'Erro ao conectar com o servidor.';
            mensagemRegistro.className = 'mensagem-erro';
        }
    });    
});