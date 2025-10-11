// Arquivo: questionario.js (VERSÃO COM VALIDAÇÃO)
document.addEventListener('DOMContentLoaded', () => {
    let currentStep = 0;
    const slides = document.querySelectorAll('.slide');
    const totalSteps = 11;
    const userAnswers = {};
    const progressBarFill = document.getElementById('progress-fill');
    
    // Funções de navegação e estado (continuam as mesmas)
    function updateProgressBar() { const step = parseFloat(slides[currentStep].dataset.step) || currentStep; const progress = Math.max(0, (step - 1) / totalSteps) * 100; progressBarFill.style.width = `${progress}%`; }
    function goToNextSlide() { if (currentStep < slides.length - 1) { slides[currentStep].classList.remove('active'); currentStep++; slides[currentStep].classList.add('active'); updateProgressBar(); } }
    function goToPreviousSlide() { if (currentStep > 0) { slides[currentStep].classList.remove('active'); currentStep--; slides[currentStep].classList.add('active'); updateProgressBar(); } }
    function showSlide(id) { document.querySelector('.slide.active').classList.remove('active'); document.getElementById(id).classList.add('active'); }
    function collectAnswer(step) { const slide = slides[step]; const question = slide.querySelector('[data-question]')?.dataset.question; if (slide.querySelectorAll('.multi-choice').length > 0) { const selected = []; slide.querySelectorAll('.choice-button.selected').forEach(btn => selected.push(btn.dataset.value)); if (question) userAnswers[question] = selected; } else if (slide.querySelector('.text-input')) { const value = slide.querySelector('.text-input').value; if (question) userAnswers[question] = value; } }
    function finalize() { collectAnswer(currentStep); showSlide('slide-final'); console.log("DADOS FINAIS PARA ENVIAR AO BACKEND:"); console.log(JSON.stringify(userAnswers, null, 2)); setTimeout(() => { window.location.href = 'resultados.html'; }, 3000); }

    // --- EVENT LISTENER PRINCIPAL (COM VALIDAÇÃO) ---
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const currentSlide = slides[currentStep];

        // Lógica para Escolha Única (continua igual, já valida por natureza)
        if (target.matches('.choice-button') && !target.matches('.multi-choice')) {
            const value = target.dataset.value;
            const questionKey = currentSlide.querySelector('[data-question]')?.dataset.question;
            if(questionKey) userAnswers[questionKey] = value;
            if (currentStep === 2 && value === 'Menor de 18 anos') { showSlide('slide-erro-idade'); return; }
            goToNextSlide();
        }

        // Lógica para Múltipla Escolha (continua igual)
        if (target.matches('.multi-choice')) { target.classList.toggle('selected'); }

        // Lógica para o botão "Avançar" (AGORA COM VALIDAÇÃO)
        if (target.matches('[data-action="next"]')) {
            const input = currentSlide.querySelector('.text-input');
            const multiChoiceOptions = currentSlide.querySelectorAll('.multi-choice');

            // 1. Valida campo de texto
            if (input && input.value.trim() === '') {
                input.classList.add('shake-error');
                setTimeout(() => input.classList.remove('shake-error'), 500);
                return; // Impede de avançar
            }

            // 2. Valida múltipla escolha
            if (multiChoiceOptions.length > 0 && currentSlide.querySelectorAll('.multi-choice.selected').length === 0) {
                target.classList.add('shake-error'); // Treme o botão Avançar
                setTimeout(() => target.classList.remove('shake-error'), 500);
                return; // Impede de avançar
            }
            
            // Se passar nas validações, coleta a resposta e avança
            collectAnswer(currentStep);
            goToNextSlide();
        }

        if (target.matches('[data-action="finalize"]')) { finalize(); }
        if (target.matches('[data-action="prev"]')) { goToPreviousSlide(); }
    });

    const whatsappInput = document.getElementById('whatsapp-input');
    if (whatsappInput) { IMask(whatsappInput, { mask: '(00) 00000-0000' }); }
    
    updateProgressBar();
});