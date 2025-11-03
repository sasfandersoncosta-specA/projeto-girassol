// Arquivo: profissionais.js (CORRIGIDO)
document.addEventListener('DOMContentLoaded', () => {
    const questions = [
        // ... (boas-vindas, nome, email...)
        { id: 'nome', type: 'text', question: "Primeiro, qual o seu nome completo?", placeholder: "Nome Completo", required: true },
        { id: 'email', type: 'email', question: "Qual o seu melhor e-mail profissional?", placeholder: "E-mail Profissional", required: true },
        { id: 'crp', type: 'text', question: "E o seu número de registro no CRP?", placeholder: "Número do CRP (ex: 06/123456)", required: true },
        // ... (nicho-intro, genero_identidade, valor_sessao_faixa, temas_atuacao, abordagens_tecnicas, praticas_afirmativas...)
        // ...
        // 2. CÓPIA DO CRP ATUALIZADA (Problema 2)
        { id: 'approved', type: 'approved', 
          question: "Ótima notícia! Há uma grande procura por seu perfil.", 
          subtitle: "Para ganhar seu selo de 'Verificado' e finalizar o cadastro, envie uma foto do seu CRP (opcional)." 
        },
        // ... (waitlisted, error)
    ];

    let currentStep = 0;
    const userAnswers = {};
    const slidesContainer = document.querySelector('.slides-container');
    const progressBarFill = document.querySelector('.progress-bar-fill');
    const totalQuestions = questions.filter(q => !['welcome', 'info', 'loading', 'approved', 'waitlisted', 'error'].includes(q.type)).length;

    function createSlideHTML(questionData, index) {
        // ... (função createSlideHTML permanece idêntica) ...
        // ...
        // 1. ADICIONA EVENTO DE ENTER (Problema 1)
        if (questionData.type === 'text' || questionData.type === 'email') {
            contentHTML = `
                <div class="form-group-questionario">
                    <input type="${questionData.type}" id="input-${questionData.id}" class="text-input" placeholder=" " required>
                    <label for="input-${questionData.id}" class="input-label">${questionData.placeholder}</label>
                </div>`;
        }
        // ... (resto do switch) ...
        // ...
        return `... (HTML do slide) ...`;
    }

    // ... (updateProgressBar, goToSlide, collectAnswer, validateAndAdvance, checkDemand, submitToWaitlist - permanecem idênticos) ...

    function initializeQuiz() {
        slidesContainer.innerHTML = questions.map((q, i) => createSlideHTML(q, i)).join('');
        
        // 1. LÓGICA DO "ENTER PARA AVANÇAR" (Problema 1)
        slidesContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault(); // Impede o envio padrão do formulário
                const ctaButton = document.querySelector('.slide.active .cta-button[data-action="next"]');
                if (ctaButton) {
                    ctaButton.click();
                }
            }
        });

        slidesContainer.addEventListener('click', (e) => {
            const target = e.target;
            if (target.matches('[data-action="next"]')) {
                validateAndAdvance();
            } else if (target.matches('[data-action="submit-validation"]')) {
                
                // --- 5. CORREÇÃO DO PERFIL VAZIO (Problema 5) ---
                localStorage.setItem('psi_questionario_respostas', JSON.stringify(userAnswers));

                const { nome, email, crp } = userAnswers;
                const params = new URLSearchParams({
                    nome: nome || '',
                    email: email || '',
                    crp: crp || ''
                });
                window.location.href = `psi_registro.html?${params.toString()}`;
            
            } 
            // ... (resto dos 'else if' permanecem idênticos) ...
        });

        // ... (resto de initializeQuiz permanece idêntico) ...
        goToSlide(0);
    }
    initializeQuiz();
});