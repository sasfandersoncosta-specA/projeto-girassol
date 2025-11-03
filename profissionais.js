document.addEventListener('DOMContentLoaded', () => {
    const questions = [
        { id: 'boas-vindas', type: 'welcome', question: "Boas-vindas ao Girassol, colega.", subtitle: "Este pré-cadastro rápido nos ajudará a entender sua prática e a verificar a demanda de pacientes para o seu perfil." },
        { id: 'nome', type: 'text', question: "Primeiro, qual o seu nome completo?", placeholder: "Nome Completo", required: true },
        { id: 'email', type: 'email', question: "Qual o seu melhor e-mail profissional?", placeholder: "E-mail Profissional", required: true },
        { id: 'crp', type: 'text', question: "E o seu número de registro no CRP?", placeholder: "Número do CRP (ex: 06/123456)", required: true },
        { id: 'nicho-intro', type: 'info', question: "Entendendo sua Prática e Especialidades", subtitle: "Suas respostas aqui são cruciais. Elas definem seu 'nicho de mercado' e nos permitem verificar se há uma demanda ativa de pacientes para o seu perfil." },
        { id: 'genero_identidade', question: "Com qual gênero você se identifica?", type: 'choice', choices: ["Feminino", "Masculino", "Não-binário", "Outro"], required: true },
        { id: 'valor_sessao_faixa', question: "Em qual faixa de preço você pretende atender?", type: 'choice', choices: ["Até R$ 50", "R$ 51 - R$ 90", "R$ 91 - R$ 150", "Acima de R$ 150"], required: true },
        { id: 'temas_atuacao', question: "Quais são seus principais temas de atuação?", type: 'multiple-choice', scrollable: true, choices: ["Ansiedade", "Estresse", "Depressão", "Relacionamentos", "Carreira", "Autoestima", "Luto", "Traumas", "TDAH", "Sexualidade"], required: true },
        { id: 'abordagens_tecnicas', question: "Qual a sua principal abordagem teórica?", type: 'choice', scrollable: true, choices: ["Psicanálise", "Terapia Cognitivo-Comportamental (TCC)", "Humanista / Centrada na Pessoa", "Gestalt-terapia", "Análise do Comportamento (ABA)", "Sistêmica", "Outra"], required: true },
        { id: 'praticas_afirmativas', question: "Sua prática é afirmativa para quais comunidades ou perspectivas?", type: 'multiple-choice', scrollable: true, choices: ["LGBTQIAPN+ friendly", "Antirracista", "Feminista", "Neurodiversidade", "Nenhuma específica"], required: true, buttonText: "Verificar Demanda" },
        { id: 'loading', type: 'loading', question: "Analisando a demanda...", subtitle: "Estamos cruzando seus dados com as buscas de nossos pacientes. Só um instante." },
        { id: 'approved', type: 'approved', question: "Ótima notícia! Há uma grande procura por seu perfil.", subtitle: "Identificamos que há uma demanda ativa de pacientes buscando por profissionais com suas especialidades e faixa de preço. Estamos felizes em te convidar para a próxima etapa: a validação de suas credenciais." },
        { id: 'waitlisted', type: 'waitlisted', question: "Agradecemos seu interesse na Girassol!", subtitle: "No momento, a busca por profissionais com seu perfil específico já está bem atendida. Para garantir que todos os nossos parceiros tenham sucesso, adicionamos seu perfil à nossa lista de espera. Deixe seu e-mail abaixo para ser notificado(a) assim que surgir uma nova oportunidade.", buttonText: "Confirmar E-mail e Finalizar" },
        { id: 'error', type: 'error', question: "Oops! Ocorreu um problema.", subtitle: "Não foi possível conectar ao servidor para verificar a demanda. Por favor, tente novamente em alguns instantes.", buttonText: "Tentar Novamente" }
    ];

    let currentStep = 0;
    const userAnswers = {};
    const slidesContainer = document.querySelector('.slides-container');
    const progressBarFill = document.querySelector('.progress-bar-fill');
    const totalQuestions = questions.filter(q => !['welcome', 'info', 'loading', 'approved', 'waitlisted', 'error'].includes(q.type)).length;

    function createSlideHTML(questionData, index) {
        let contentHTML = '', navHTML = '';
        const isFirstInteractiveStep = questions.findIndex(q => !['welcome', 'info', 'error'].includes(q.type)) === index;

        switch (questionData.type) {
            case 'text':
            case 'email':
                contentHTML = `
                    <div class="form-group-questionario">
                        <input type="${questionData.type}" id="input-${questionData.id}" class="text-input" placeholder=" " required>
                        <label for="input-${questionData.id}" class="input-label">${questionData.placeholder}</label>
                    </div>`;
                break;
            case 'choice': case 'multiple-choice': 
                const choicesClass = questionData.scrollable ? 'choices-container scrollable' : 'choices-container';
                const buttonClass = `choice-button ${questionData.type === 'multiple-choice' ? 'multi-choice' : ''}`;
                contentHTML = `<div class="${choicesClass}">${questionData.choices.map(choice => `<button class="${buttonClass}" data-value="${choice}">${choice}</button>`).join('')}</div>`;
                break;
            case 'approved':
                contentHTML = `
                    <div class="upload-container">
                        <label for="crp-upload" class="upload-label">
                            <span id="upload-text">Clique aqui para enviar a foto do seu CRP</span>
                        </label>
                        <input type="file" id="crp-upload" accept="image/*,.pdf">
                    </div>`;
                break;
            case 'loading':
                contentHTML = `<div class="loading-animation"><img src="assets/images/logo-girassol-icon.svg" alt="Carregando"></div>`;
                break;
            case 'waitlisted':
                contentHTML = `
                    <div class="form-group-questionario">
                        <input type="email" id="input-waitlist-email" class="text-input" placeholder=" " required>
                        <label for="input-waitlist-email" class="input-label">Seu melhor e-mail</label>
                    </div>`;
                break;
            case 'welcome': case 'info': case 'error':
                break;
            default:
                contentHTML = `<p>Tipo de pergunta não reconhecido: ${questionData.type}</p>`;
        }

        const backButtonHTML = !isFirstInteractiveStep && !['welcome', 'info', 'loading', 'approved', 'waitlisted', 'error'].includes(questionData.type) ? `<button class="back-button">← Voltar</button>` : '';

        let nextButtonHTML = '';
        if (['welcome', 'info', 'text', 'email', 'multiple-choice'].includes(questionData.type)) {
            const buttonText = questionData.buttonText || "Avançar";
            const action = questionData.buttonText ? "check" : "next";
            nextButtonHTML = `<button class="cta-button" data-action="${action}">${buttonText}</button>`;
        } else if (questionData.type === 'approved') {
            nextButtonHTML = `<button class="cta-button" data-action="submit-validation">Enviar para Validação</button>`;
        } else if (questionData.type === 'waitlisted') {
            nextButtonHTML = `<button class="cta-button" data-action="submit-waitlist">${questionData.buttonText}</button>`;
        } else if (questionData.type === 'error') {
            nextButtonHTML = `<button class="cta-button" data-action="restart">${questionData.buttonText}</button>`;
        }

        const navClass = backButtonHTML ? '' : 'single-button';
        if (backButtonHTML || nextButtonHTML) {
            navHTML = `<div class="navigation-buttons ${navClass}">${backButtonHTML}${nextButtonHTML}</div>`;
        }

        return `
            <div class="slide" id="slide-${questionData.id}" data-index="${index}">
                <div class="slide-header"><h1>${questionData.question || ''}</h1><p class="subtitle">${questionData.subtitle || ''}</p></div>
                <div class="slide-body">${contentHTML}</div>
                ${navHTML}
            </div>`;
    }

    function updateProgressBar() {
        const questionIndex = questions.slice(0, currentStep + 1).filter(q => !['welcome', 'info', 'loading', 'approved', 'waitlisted', 'error'].includes(q.type)).length;
        const progress = Math.max(0, (questionIndex / totalQuestions) * 100);
        progressBarFill.style.width = `${progress}%`;
    }

    function goToSlide(index) {
        document.querySelector('.slide.active')?.classList.remove('active');
        currentStep = index;
        document.querySelector(`[data-index="${currentStep}"]`)?.classList.add('active');
        updateProgressBar();

        const currentQuestion = questions[currentStep];
        if (currentQuestion && currentQuestion.id === 'crp') {
            const crpInput = document.getElementById(`input-${currentQuestion.id}`);
            if (crpInput && window.IMask) {
                IMask(crpInput, { mask: '00/000000' });
            }
        }
        if (currentQuestion && currentQuestion.id === 'waitlisted') {
            const waitlistEmailInput = document.getElementById('input-waitlist-email');
            if (waitlistEmailInput && userAnswers.email) {
                waitlistEmailInput.value = userAnswers.email;
            }
        }
    }

    function collectAnswer() {
        const question = questions[currentStep];
        if (!question || !question.id) return;

        if (['text', 'email'].includes(question.type)) {
            userAnswers[question.id] = document.getElementById(`input-${question.id}`)?.value || '';
        }
        else if (['choice', 'multiple-choice'].includes(question.type)) {
            const selected = Array.from(document.querySelectorAll(`#slide-${question.id} .choice-button.selected`)).map(btn => btn.dataset.value);
            userAnswers[question.id] = question.type === 'choice' ? selected[0] : selected;
        }
    }

    function validateAndAdvance() {
        const currentQuestion = questions[currentStep];
        const currentSlideEl = document.querySelector('.slide.active');
        if (!currentQuestion.required) {
            collectAnswer();
            goToSlide(currentStep + 1);
            return;
        }

        let isValid = true;
        let elementToShake;

        const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isCrpValid = (crp) => /^\d{2}\/\d{6}$/.test(crp);

        if (['text', 'email'].includes(currentQuestion.type)) {
            const input = document.getElementById(`input-${currentQuestion.id}`);
            elementToShake = input.parentElement; 

            const value = input.value.trim();
            if (!value) {
                isValid = false;
            } else if (currentQuestion.type === 'email' && !isEmailValid(value)) {
                isValid = false;
            } else if (currentQuestion.id === 'crp' && !isCrpValid(value)) {
                isValid = false;
            }
        } else if (['multiple-choice'].includes(currentQuestion.type)) {
            elementToShake = currentSlideEl.querySelector('.choices-container');
            if (currentSlideEl.querySelectorAll('.choice-button.selected').length === 0) isValid = false;
        }
        
        if (isValid) {
            collectAnswer();
            goToSlide(currentStep + 1);
        } else if (elementToShake) {
            elementToShake.classList.add('shake-error');
            setTimeout(() => elementToShake.classList.remove('shake-error'), 500);
        }
    }

    async function checkDemand() {
        collectAnswer();
        goToSlide(questions.findIndex(q => q.id === 'loading'));

        try {
            const response = await fetch(`${API_BASE_URL}/api/psychologists/check-demand`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userAnswers)
            });
            const data = await response.json();

            if (response.ok) {
                if (data.status === 'approved') {
                    goToSlide(questions.findIndex(q => q.id === 'approved'));
                } else { // 'waitlisted'
                    goToSlide(questions.findIndex(q => q.id === 'waitlisted'));
                }
            } else {
                console.error("Erro na API:", data.error);
                goToSlide(questions.findIndex(q => q.id === 'error'));
            }
        } catch (error) {
            console.error("Erro de conexão:", error);
            goToSlide(questions.findIndex(q => q.id === 'error'));
        }
    }

    async function submitToWaitlist() {
        const waitlistEmailInput = document.getElementById('input-waitlist-email');
        const email = waitlistEmailInput.value;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            waitlistEmailInput.parentElement.classList.add('shake-error');
            setTimeout(() => waitlistEmailInput.parentElement.classList.remove('shake-error'), 500);
            return;
        }

        userAnswers.email = email;

        try {
            await fetch(`${API_BASE_URL}/api/psychologists/add-to-waitlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userAnswers)
            });
            window.location.href = 'obrigado_lista_espera.html';
        } catch (error) {
            console.error("Erro ao adicionar à lista de espera:", error);
            alert("Ocorreu um erro ao salvar seu e-mail. Tente novamente.");
        }
    }

    function initializeQuiz() {
    slidesContainer.innerHTML = questions.map((q, i) => createSlideHTML(q, i)).join('');
    
    slidesContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('[data-action="next"]')) {
            validateAndAdvance();
        } else if (target.matches('[data-action="restart"]')) {
            goToSlide(0); 
        } else if (target.matches('[data-action="submit-validation"]')) {
            
            // --- CORREÇÃO APLICADA AQUI ---
            // 1. Salva TODAS as respostas do questionário no localStorage
            localStorage.setItem('psi_questionario_respostas', JSON.stringify(userAnswers));

            // 2. Continua com o fluxo normal de redirect com os parâmetros da URL
            const { nome, email, crp } = userAnswers;
            const params = new URLSearchParams({
                nome: nome || '',
                email: email || '',
                crp: crp || ''
            });
            window.location.href = `psi_registro.html?${params.toString()}`;

        } else if (target.matches('[data-action="check"]')) {
            const currentSlideEl = document.querySelector('.slide.active');
            if (currentSlideEl.querySelectorAll('.choice-button.selected').length > 0) {
                checkDemand();
            } else {
                validateAndAdvance(); 
            }
        } else if (target.matches('[data-action="submit-waitlist"]')) {
            submitToWaitlist();
        } else if (target.matches('.back-button')) {
            goToSlide(currentStep - 1);
        } else if (target.matches('.choice-button')) {
            if (target.classList.contains('multi-choice')) {
                target.classList.toggle('selected');
            } else {
                target.closest('.choices-container').querySelectorAll('.choice-button').forEach(btn => btn.classList.remove('selected'));
                target.classList.add('selected');
                collectAnswer();
                setTimeout(() => goToSlide(currentStep + 1), 200);
            }
        }
    });

    // Adiciona a funcionalidade de avançar com "Enter" nos campos de texto
    slidesContainer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('.text-input')) {
            e.preventDefault(); // Previne o comportamento padrão do Enter
            validateAndAdvance();
        }
    });

    const uploadInput = document.getElementById('crp-upload');
    const uploadText = document.getElementById('upload-text');
    if (uploadInput && uploadText) {
        uploadInput.addEventListener('change', () => {
            if (uploadInput.files.length > 0) {
                uploadText.textContent = `Arquivo selecionado: ${uploadInput.files[0].name}`;
            } else {
                uploadText.textContent = 'Clique aqui para enviar a foto do seu CRP';
            }
        });
    }

    goToSlide(0);
}

    initializeQuiz();
});