// Arquivo: profissionais.js

document.addEventListener('DOMContentLoaded', () => {
    const questions = [
        // Etapa 1: Boas-vindas e Dados Básicos
        { id: 'boas-vindas', type: 'welcome', question: "Junte-se à Nossa Comunidade de Profissionais", subtitle: "Olá! Ficamos felizes com seu interesse. Este pré-cadastro rápido nos ajudará a entender sua prática e a verificar a demanda de pacientes para o seu perfil." },        
        { id: 'nome', type: 'text', question: "Primeiro, qual o seu nome completo?", placeholder: "Nome Completo", required: true },
        { id: 'email', type: 'email', question: "Qual o seu melhor e-mail profissional?", placeholder: "E-mail Profissional", required: true },
        { id: 'crp', type: 'text', question: "E o seu número de registro no CRP?", placeholder: "Número do CRP (ex: 06/123456)", required: true },
        // Etapa 2: Definição do Nicho
        { id: 'nicho-intro', type: 'info', question: "Entendendo sua Prática e Especialidades", subtitle: "Suas respostas aqui são cruciais. Elas definem seu 'nicho de mercado' e nos permitem verificar se há uma demanda ativa de pacientes para o seu perfil." },
        { id: 'genero_identidade', question: "Com qual gênero você se identifica?", type: 'choice', choices: ["Feminino", "Masculino", "Não-binário", "Outro"], required: true },
        { id: 'valor_sessao_faixa', question: "Em qual faixa de preço você pretende atender?", type: 'choice', choices: ["Até R$ 50", "R$ 51 - R$ 90", "R$ 91 - R$ 150", "Acima de R$ 150"], required: true },
        { id: 'temas_atuacao', question: "Quais são seus principais temas de atuação?", type: 'multiple-choice', scrollable: true, choices: ["Ansiedade", "Estresse", "Depressão", "Relacionamentos", "Carreira", "Autoestima", "Luto", "Traumas", "TDAH", "Sexualidade"], required: true },
        { id: 'abordagens_tecnicas', question: "Qual a sua principal abordagem teórica?", type: 'choice', scrollable: true, choices: ["Psicanálise", "Terapia Cognitivo-Comportamental (TCC)", "Humanista / Centrada na Pessoa", "Gestalt-terapia", "Análise do Comportamento (ABA)", "Sistêmica", "Outra"], required: true },
        { id: 'praticas_afirmativas', question: "Sua prática é afirmativa para quais comunidades ou perspectivas?", type: 'multiple-choice', scrollable: true, choices: ["LGBTQIAPN+ friendly", "Antirracista", "Feminista", "Neurodiversidade", "Nenhuma específica"], required: true, buttonText: "Verificar Demanda" },
        // Telas de Resultado Dinâmico
        { id: 'loading', type: 'loading', question: "Analisando a demanda...", subtitle: "Estamos cruzando seus dados com as buscas de nossos pacientes. Só um instante." },
        { id: 'approved', type: 'approved', question: "Ótima notícia! Há uma grande procura por seu perfil.", subtitle: "Identificamos que há uma demanda ativa de pacientes buscando por profissionais com suas especialidades e faixa de preço. Estamos felizes em te convidar para a próxima etapa: a validação de suas credenciais." },
        { id: 'waitlisted', type: 'waitlisted', question: "Agradecemos seu interesse na Girassol!", subtitle: "No momento, a busca por profissionais com seu perfil específico já está bem atendida em nossa plataforma. Para garantir que todos os nossos parceiros tenham sucesso, seu perfil foi adicionado à nossa lista de espera estratégica. Você será notificado(a) por e-mail assim que surgir uma nova oportunidade alinhada à sua prática." },
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
            case 'welcome': case 'info': case 'waitlisted': case 'error':
                break;
            default:
                contentHTML = `<p>Tipo de pergunta não reconhecido: ${questionData.type}</p>`;
        }

        const backButtonHTML = !isFirstInteractiveStep && !['welcome', 'info', 'loading', 'approved', 'waitlisted', 'error'].includes(questionData.type) ? `<button class="back-button">← Voltar</button>` : '';

        let nextButtonHTML = '';
        if (['welcome', 'info', 'text', 'email', 'choice', 'multiple-choice'].includes(questionData.type)) {
            const buttonText = questionData.buttonText || "Avançar";
            const action = questionData.buttonText ? "check" : "next";
            nextButtonHTML = `<button class="cta-button" data-action="${action}">${buttonText}</button>`;
        } else if (questionData.type === 'approved') {
            nextButtonHTML = `<button class="cta-button" data-action="submit-validation">Enviar para Validação</button>`;
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

        // --- APLICA A MÁSCARA DE INPUT PARA O CRP ---
        const currentQuestion = questions[currentStep];
        if (currentQuestion && currentQuestion.id === 'crp') {
            const crpInput = document.getElementById(`input-${currentQuestion.id}`);
            // Garante que a biblioteca IMask esteja disponível
            if (crpInput && window.IMask) {
                IMask(crpInput, { mask: '00/000000' });
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

        // Função de validação de email
        const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        // Função de validação de CRP (formato 00/000000)
        const isCrpValid = (crp) => /^\d{2}\/\d{6}$/.test(crp);

        if (['text', 'email'].includes(currentQuestion.type)) {
            const input = document.getElementById(`input-${currentQuestion.id}`);
            elementToShake = input.parentElement; // Anima o grupo do formulário

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
            const response = await fetch('http://localhost:3001/api/psychologists/check-demand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userAnswers)
            });
            const data = await response.json();

            if (response.ok) {
                if (data.status === 'approved') {
                    goToSlide(questions.findIndex(q => q.id === 'approved'));
                } else { 
                    goToSlide(questions.findIndex(q => q.id === 'waitlisted'));
                }
            } else {
                // Handle server errors (e.g., show a generic error slide)
                console.error("Erro na API:", data.error);
                goToSlide(questions.findIndex(q => q.id === 'error'));
            }
        } catch (error) {
            console.error("Erro de conexão:", error);
            goToSlide(questions.findIndex(q => q.id === 'error'));
        }
    }

    function initializeQuiz() {
        slidesContainer.innerHTML = questions.map((q, i) => createSlideHTML(q, i)).join('');
        
        slidesContainer.addEventListener('click', (e) => {
            const target = e.target;
            if (target.matches('[data-action="next"]')) {
                validateAndAdvance();
            } else if (target.matches('[data-action="restart"]')) {
                goToSlide(0); // Volta para o início
            } else if (target.matches('[data-action="submit-validation"]')) {
                // Simula o envio do CRP e redireciona para a página de registro
                const { nome, email, crp } = userAnswers;
                const params = new URLSearchParams({
                    nome: nome || '',
                    email: email || '',
                    crp: crp || ''
                });
                // A página psi_registro.html já sabe como ler esses parâmetros
                window.location.href = `psi_registro.html?${params.toString()}`;

            } else if (target.matches('[data-action="check"]')) {
                // Validação antes de verificar a demanda
                const currentSlideEl = document.querySelector('.slide.active');
                if (currentSlideEl.querySelectorAll('.choice-button.selected').length > 0) {
                    checkDemand();
                } else {
                    validateAndAdvance(); // Reutiliza a lógica de validação e shake
                }
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