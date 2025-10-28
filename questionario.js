// Arquivo: questionario.js (VERSÃO FINAL COM CORREÇÃO DO 'WELCOME')

document.addEventListener('DOMContentLoaded', () => {

    const questions = [
        { id: 'boas-vindas', question: "Vamos encontrar a pessoa certa para te acompanhar nessa jornada.", subtitle: "Responda algumas perguntas para começarmos.", type: 'welcome' },
        { id: 'nome', question: "Olá! Para começarmos, como podemos te chamar?", subtitle: "Isso nos ajuda a te entregar uma experiência personalizada.", type: 'text', placeholder: "Digite seu nome ou apelido", required: true },
        { id: 'idade', question: "Certo, [NOME]. Muito prazer! E qual a sua faixa etária?", subtitle: "Isso nos ajuda a entender melhor quem busca a Girassol.", type: 'choice', choices: ["Menor de 18 anos", "18-24 anos", "25-34 anos", "35-44 anos", "45-54 anos", "55+ anos"], required: true },
        { id: 'identidade_genero', question: "Agora, [NOME], com qual gênero você se identifica?", subtitle: "Sua identidade é importante. Selecione a opção que melhor te representa.", type: 'choice', scrollable: true, choices: ["Masculino", "Feminino", "Não-binário", "Agênero", "Bigênero", "Pangênero", "Genderqueer", "Gênero fluido", "Demigênero", "Andrógeno", "Outro", "Prefiro não informar"], required: true },
        { id: 'pref_genero_prof', question: "Você tem preferência pelo gênero do(a) profissional?", subtitle: "Sua segurança e conforto são nossa prioridade.", type: 'choice', choices: ["Indiferente", "Masculino", "Feminino", "Não-binário"], required: true },
        { id: 'motivacao', question: "[NOME], o que te motivou a buscar terapia agora?", subtitle: "Saber seu ponto de partida nos ajuda a encontrar o melhor caminho. Selecione as principais opções.", type: 'multiple-choice', scrollable: true, choices: ["Estou passando por um desafio específico", "Quero me conhecer melhor", "Recebi uma recomendação", "Estou lidando com sintomas difíceis (ansiedade, tristeza)", "Quero melhorar meus relacionamentos", "Outro", "Não tenho certeza"], required: true },
        { id: 'temas', question: "Quais temas ou sentimentos você gostaria de explorar?", subtitle: "Já estamos finalizando. Selecione os principais. Isso nos ajuda a focar na sua necessidade.", type: 'multiple-choice', scrollable: true, choices: ["Ansiedade", "Estresse", "Depressão", "Relacionamentos", "Carreira", "Autoestima", "Luto", "Traumas"], required: true },
        { id: 'terapia_anterior', question: "Você já fez terapia antes, [NOME]?", subtitle: "Entender sua trajetória nos ajuda a traçar um novo futuro.", type: 'choice', choices: ["Sim, e foi uma boa experiência", "Sim, mas não foi uma boa experiência", "Não, esta é minha primeira vez"], required: true },
        { id: 'experiencia_desejada', question: "Que tipo de experiência terapêutica você imagina?", subtitle: "Isso nos ajuda a alinhar seu estilo com o do profissional.", type: 'multiple-choice', choices: ["Um espaço de escuta e acolhimento para me encontrar", "Ferramentas e tarefas práticas para aplicar no dia a dia", "Entender meu passado e a raiz das minhas emoções", "Focar em soluções para problemas específicos", "Não sei / Indiferente"], required: true },
        { id: 'caracteristicas_prof', question: "Existem características importantes para você em um(a) psicólogo(a)?", subtitle: "A identidade de quem te escuta pode fazer toda a diferença.", type: 'multiple-choice', choices: ["Que faça parte da comunidade LGBTQIAPN+", "Que seja uma pessoa não-branca (racializada) / prática antirracista", "Que tenha uma perspectiva feminista", "Que entenda de neurodiversidade (TDAH, Autismo, etc.)", "Indiferente"], required: true },
        { id: 'faixa_valor', question: "Qual faixa de valor você pode investir por sessão?", subtitle: "Isso garante que vamos te conectar com profissionais que cabem no seu orçamento.", type: 'choice', choices: ["Até R$ 50", "R$ 51 - R$ 90", "R$ 91 - R$ 150", "Acima de R$ 150"], required: true },
        { id: 'whatsapp', question: "Para finalizar, [NOME], qual seu número de WhatsApp?", subtitle: "Seu número será usado apenas para o contato inicial do profissional e mensagens de acompanhamento da Girassol.", type: 'tel', placeholder: "(XX) XXXXX-XXXX", required: true },
        { id: 'avaliacao_ux', question: "Como você avalia sua experiência ao preencher este questionário?", subtitle: "Seu feedback nos ajuda a melhorar!", type: 'choice', choices: ["1 (Ruim)", "2", "3", "4", "5 (Ótima)"], required: true },
        { id: 'agradecimento', type: 'thank-you', question: "Obrigado pelo seu feedback, [NOME]!", subtitle: "Sua jornada de cuidado está prestes a começar." },
        { id: 'final', type: 'final', question: "Tudo pronto, [NOME]!", subtitle: "Estamos cruzando suas respostas para encontrar as conexões mais significativas. Em instantes, você verá suas recomendações."},
        { id: 'erro-idade', type: 'error', question: "Atenção", subtitle: "A plataforma Girassol é destinada apenas para maiores de 18 anos...", buttonText: "Entendi e Sair"}
    ];
    
    let currentStep = 0;
    const userAnswers = {};
    const slidesContainer = document.querySelector('.slides-container');
    const progressBarFill = document.querySelector('.progress-bar-fill');
    const totalQuestions = questions.filter(q => !['welcome', 'final', 'error', 'thank-you'].includes(q.type)).length; 

    function updateNamePlaceholders(name) { /* ... (inalterado) ... */ }
    
    // =====================================================================
    // FUNÇÃO createSlideHTML CORRIGIDA (ADICIONADO CASE 'welcome')
    // =====================================================================
    function createSlideHTML(questionData, index) { 
        let contentHTML = '', navHTML = ''; 
        const isFirstStep = questions.findIndex(q => q.type !== 'welcome') === index; 
        
        switch (questionData.type) { 
            case 'text': case 'tel': 
                contentHTML = `<input type="${questionData.type}" id="input-${questionData.id}" class="text-input" placeholder="${questionData.placeholder}">`; 
                break; 
            case 'choice': case 'multiple-choice': 
                const choicesClass = questionData.scrollable ? 'choices-container scrollable' : 'choices-container'; 
                const buttonClass = questionData.type === 'multiple-choice' ? 'choice-button multi-choice' : 'choice-button'; 
                contentHTML = `<div class="${choicesClass}">${questionData.choices.map(choice => `<button class="${buttonClass}" data-value="${choice}">${choice}</button>`).join('')}</div>`; 
                break; 
            case 'welcome': // <-- LINHA ADICIONADA: O 'welcome' agora explicitamente não gera conteúdo
            case 'thank-you': 
            case 'final': 
            case 'error': 
                break; // Tipos sem conteúdo interativo no meio
            default: 
                console.warn("Tipo de pergunta desconhecido:", questionData.type); // Troca por um aviso no console
                contentHTML = ''; // Garante que nenhum texto estranho apareça
        } 
        
        const backButtonHTML = !isFirstStep && !['welcome', 'final', 'error', 'thank-you'].includes(questionData.type) ? `<button class="back-button">← Voltar</button>` : ''; 
        let nextButtonHTML = ''; 

        if (questionData.type === 'welcome') { 
            nextButtonHTML = `<button class="cta-button" data-action="next">Vamos começar</button>`; 
        } else if (['text', 'tel', 'multiple-choice'].includes(questionData.type)) { 
            let buttonText = "Avançar";
            let buttonAction = "next";
            if(questionData.id === 'whatsapp') { buttonText = "Ver Avaliação"; }
            nextButtonHTML = `<button class="cta-button" data-action="${buttonAction}">${buttonText}</button>`; 
        } else if (questionData.type === 'error') { 
            navHTML = `<a href="index.html" class="cta-button">${questionData.buttonText}</a>`; 
        } 
        
        const navigationClass = backButtonHTML ? '' : 'single-button'; 
        if (!navHTML && (backButtonHTML || nextButtonHTML)) { 
            navHTML = `<div class="navigation-buttons ${navigationClass}">${backButtonHTML}${nextButtonHTML}</div>`; 
        } 
        return `<div class="slide" id="slide-${questionData.id}" data-index="${index}"><div class="slide-header"><h1>${questionData.question}</h1><p class="subtitle">${questionData.subtitle || ''}</p></div><div class="slide-body">${contentHTML}</div>${navHTML}</div>`; 
    }
    
    // --- O RESTO DO CÓDIGO CONTINUA O MESMO ---
    function updateProgressBar() { const questionIndex = questions.slice(0, currentStep + 1).filter(q => !['welcome', 'final', 'error', 'thank-you'].includes(q.type)).length; const progress = Math.max(0, (questionIndex / totalQuestions) * 100); progressBarFill.style.width = `${progress}%`; }
    function goToSlide(index) { const currentSlide = document.querySelector('.slide.active'); if (currentSlide) currentSlide.classList.remove('active'); currentStep = index; const nextSlide = document.querySelector(`[data-index="${currentStep}"]`); if (nextSlide) nextSlide.classList.add('active'); else console.error(`Slide com index ${index} não encontrado.`); updateProgressBar(); const currentQuestion = questions[currentStep]; if (currentQuestion && currentQuestion.type === 'tel') { const phoneInput = document.getElementById(`input-${currentQuestion.id}`); if (phoneInput) IMask(phoneInput, { mask: '(00) 00000-0000' }); } }
    function collectAnswer() { const question = questions[currentStep]; if (!question || !question.id || ['welcome', 'final', 'error', 'thank-you'].includes(question.type)) return; let answer; if (['text', 'tel'].includes(question.type)) { answer = document.getElementById(`input-${question.id}`)?.value || ''; } else if (question.type === 'choice') { const selectedButton = document.querySelector(`#slide-${question.id} .choice-button.selected`); answer = selectedButton ? selectedButton.dataset.value : undefined; } else if (question.type === 'multiple-choice') { const selected = []; document.querySelectorAll(`#slide-${question.id} .choice-button.selected`).forEach(btn => selected.push(btn.dataset.value)); answer = selected; } userAnswers[question.id] = answer; }
    function finalize() { updateNamePlaceholders(userAnswers.nome); goToSlide(questions.findIndex(q => q.id === 'final')); console.log("DADOS FINAIS PARA ENVIAR AO BACKEND:", userAnswers); setTimeout(() => { window.location.href = 'resultados.html'; }, 3000); }
    function validateAndAdvance() { const currentQuestion = questions[currentStep]; const currentSlideEl = document.querySelector('.slide.active'); if (!currentQuestion.required) { collectAnswer(); goToSlide(currentStep + 1); return; } let isValid = true; if (['text', 'tel'].includes(currentQuestion.type)) { const input = document.getElementById(`input-${currentQuestion.id}`); if (input.value.trim() === '') { input.classList.add('shake-error'); setTimeout(() => input.classList.remove('shake-error'), 500); isValid = false; } if (currentQuestion.type === 'tel' && input.value.length < 15) { input.classList.add('shake-error'); setTimeout(() => input.classList.remove('shake-error'), 500); isValid = false; } } else if (['choice', 'multiple-choice'].includes(currentQuestion.type)) { if (currentSlideEl.querySelectorAll('.choice-button.selected').length === 0) { const btnToShake = currentSlideEl.querySelector('.cta-button') || currentSlideEl.querySelector('.choices-container'); btnToShake.classList.add('shake-error'); setTimeout(() => btnToShake.classList.remove('shake-error'), 500); isValid = false; } } if (isValid) { collectAnswer(); if (currentQuestion.id === 'nome') { updateNamePlaceholders(userAnswers.nome); } const actionButton = currentSlideEl.querySelector('.cta-button'); const action = actionButton ? actionButton.dataset.action : null; if (action === 'finalize') { finalize(); } else { goToSlide(currentStep + 1); } } }
    function initializeQuiz() { try { slidesContainer.innerHTML = questions.map((q, i) => createSlideHTML(q, i)).join(''); } catch (error) { console.error("Erro ao gerar o HTML dos slides:", error); slidesContainer.innerHTML = "<p style='color:red; text-align:center; padding: 40px;'>Ocorreu um erro ao carregar o questionário. Tente recarregar a página.</p>"; return; } slidesContainer.addEventListener('click', (e) => { const target = e.target; const currentQuestion = questions[currentStep]; if (target.matches('[data-action="next"], [data-action="finalize"]')) { validateAndAdvance(); } if (target.matches('.back-button')) { goToSlide(currentStep - 1); } if (target.matches('.choice-button')) { const isMulti = target.classList.contains('multi-choice'); if (isMulti) { target.classList.toggle('selected'); } else { const parent = target.closest('.choices-container'); parent.querySelectorAll('.choice-button').forEach(btn => btn.classList.remove('selected')); target.classList.add('selected'); collectAnswer(); if (currentQuestion.id === 'idade' && target.dataset.value === 'Menor de 18 anos') { goToSlide(questions.findIndex(q => q.id === 'erro-idade')); } else if (currentQuestion.id === 'avaliacao_ux') { updateNamePlaceholders(userAnswers.nome); goToSlide(questions.findIndex(q => q.id === 'agradecimento')); setTimeout(finalize, 1500); } else { setTimeout(() => goToSlide(currentStep + 1), 250); } } } }); slidesContainer.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('.text-input')) { e.preventDefault(); validateAndAdvance(); } }); if (document.querySelector(`[data-index="0"]`)) { goToSlide(0); } else { console.error("Erro: Slide inicial não encontrado."); } }
    initializeQuiz();
    function updateNamePlaceholders(name) { if (!name) return; const allSlides = document.querySelectorAll('.slide'); allSlides.forEach(slide => { const title = slide.querySelector('h1'); const subtitle = slide.querySelector('p.subtitle'); if (title && title.innerHTML.includes('[NOME]')) { title.innerHTML = title.innerHTML.replace(/\[NOME\]/g, name); } if (subtitle && subtitle.innerHTML.includes('[NOME]')) { subtitle.innerHTML = subtitle.innerHTML.replace(/\[NOME\]/g, name); } }); }
});