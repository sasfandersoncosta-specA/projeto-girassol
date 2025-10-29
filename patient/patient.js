// Arquivo: patient.js (MOTOR DO DASHBOARD - CORREÇÃO FINAL DA BUSCA)

document.addEventListener('DOMContentLoaded', () => {

    // -----------------------------------------------------
    // 1. VARIÁVEIS DE ESTADO E INFORMAÇÃO
    // -----------------------------------------------------
    let patientData = null; 
    const loginUrl = 'http://127.0.0.1:5500/login.html'; 
    
    // Elementos do DOM (mantidos para o funcionamento do dashboard)
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('patient-main-content');
    const navLinks = document.querySelectorAll('.sidebar-nav li');

    // -----------------------------------------------------
    // 2. FUNÇÃO DE SEGURANÇA E BUSCA DE DADOS REAIS
    // -----------------------------------------------------
    async function fetchPatientData() {
        const token = localStorage.getItem('girassol_token');

        if (!token) {
            window.location.href = loginUrl;
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/patients/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` 
                }
            });

            if (response.ok) {
                patientData = await response.json();
                initializeDashboard();
            } else {
                // Se der 401 ou outro erro de sessão, lança para o catch
                throw new Error("Sessão inválida.");
            }

        } catch (error) {
            console.error('Falha na autenticação inicial:', error.message);
            // Se o token falhar, o sistema limpa e força o login
            localStorage.removeItem('girassol_token');
            window.location.href = loginUrl;
        }
    }

    // -----------------------------------------------------
    // 3. LÓGICA DAS PÁGINAS ESPECÍFICAS
    // -----------------------------------------------------

    function inicializarVisaoGeral() {
        const nomeUsuarioEl = document.getElementById('nome-usuario');
        if (nomeUsuarioEl && patientData && patientData.nome_completo) { // CORREÇÃO AQUI
            // USA O CAMPO CORRETO 'nome_completo'
            nomeUsuarioEl.textContent = patientData.nome_completo.split(' ')[0]; 
        }

        const statusPaciente = 'novo'; 
        const cardPassosEl = document.getElementById('card-proximos-passos');
        
        if (cardPassosEl) {
            if (statusPaciente === 'novo') {
                cardPassosEl.innerHTML = `
                    <h2>Pronto(a) para começar a conversa?</h2>
                    <p>Explore os perfis que encontramos para você na seção 'Meus Matches' e inicie o contato com quem você mais se identificar.</p>
                    <a href="#" class="btn btn-principal" data-target="patient_matches.html">Ver meus Matches</a>
                `;
            } else {
                cardPassosEl.innerHTML = `
                    <h2>Como foi sua experiência?</h2>
                    <p>Sua opinião é muito importante para nossa comunidade. Quando se sentir confortável, você pode deixar uma avaliação sobre o profissional com quem conversou.</p>
                    <a href="#" class="btn btn-principal" data-target="patient_matches.html">Avaliar Profissional</a>
                `;
            }
        }
    }
    
    // CORREÇÃO: Função para a tela de Matches
    async function inicializarMatches() {
        const matchesGrid = document.getElementById('matches-grid');
        if (!matchesGrid) return;
        
        matchesGrid.innerHTML = '<p class="text-center">Buscando profissionais compatíveis...</p>';

        try {
            const token = localStorage.getItem('girassol_token');
            
            const response = await fetch('http://localhost:3001/api/psychologists', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` 
                }
            });

            // O status é 200, então focamos na leitura do JSON
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Resposta vazia ou inválida.' }));
                throw new Error(`Falha ao carregar profissionais. Status ${response.status}: ${errorData.error || 'Erro desconhecido.'}`);
            }

            // CORREÇÃO CRÍTICA: LENDO O ARRAY CORRETO DO OBJETO
            const responseData = await response.json();
            const psychologists = responseData.psychologists || []; 
            
            if (psychologists.length === 0) {
                // Se nenhum profissional for retornado
                document.getElementById('favoritos-vazio').classList.remove('hidden');
                matchesGrid.innerHTML = '';
                return;
            }

            // RENDERIZAÇÃO
            document.getElementById('favoritos-vazio').classList.add('hidden');

            matchesGrid.innerHTML = psychologists.map(pro => `
                <div class="pro-card">
                    <img src="https://placehold.co/400x400/1B4332/FFFFFF?text=CRP" alt="Foto do Profissional" class="pro-card-img">
                    <span class="pro-crp">CRP ${pro.crp}</span>
                    <h3>Dr(a). ${pro.nome}</h3>
                    <p class="pro-abordagem">${pro.abordagem}</p>
                    <p class="pro-especialidades">Especialidades: ${pro.especialidades}</p>
                    <p class="pro-localizacao">${pro.cidade} ${pro.online ? '(Online)' : ''}</p>
                    <div class="pro-card-actions">
                        <a href="#" class="btn btn-principal">Iniciar Conversa</a>
                        <button class="btn-favorito" data-id="${pro.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Erro fatal ao buscar matches:', error);
            matchesGrid.innerHTML = `<p class="text-center text-error">Erro ao carregar profissionais: ${error.message}.</p>`;
        }
    }


    // -----------------------------------------------------
    // 4. GERENCIADOR DE CARREGAMENTO E INICIALIZAÇÃO
    // -----------------------------------------------------

    function loadPage(pageUrl) {
        if (!pageUrl) return;

        fetch(pageUrl) 
            .then(response => response.ok ? response.text() : Promise.reject(`Arquivo não encontrado: ${pageUrl}`))
            .then(html => {
                mainContent.innerHTML = html;
                
                if (pageUrl.includes('patient_visao_geral.html')) {
                    inicializarVisaoGeral();
                } else if (pageUrl.includes('patient_matches.html')) {
                    inicializarMatches(); 
                }
            })
            .catch(error => {
                mainContent.innerHTML = `<h1>Página em Construção ou Erro de Carregamento</h1>`;
                console.error(error);
            });
    }

    function initializeDashboard() {
        
        // --- LÓGICA DO MENU MOBILE ---
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('is-open');
            });
        }

        // --- LÓGICA DE LOGOUT ---
        const logoutLink = document.querySelector('.sidebar-footer a[data-action="logout"]');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('girassol_token'); 
                window.location.href = loginUrl; // Usa a URL de login correta
            });
        }

        // --- ADICIONA EVENTO DE CLIQUE PARA A NAVEGAÇÃO ---
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                if (sidebar.classList.contains('is-open')) {
                    sidebar.classList.remove('is-open');
                }

                navLinks.forEach(item => item.classList.remove('active'));
                this.classList.add('active');
                
                // Correção do caminho com './'
                const page = './' + this.getAttribute('data-page'); 
                loadPage(page);
            });
        });

        // --- INICIALIZAÇÃO DE TELA (Carrega a Visão Geral) ---
        loadPage('./patient_visao_geral.html');

    } // FIM initializeDashboard()

    // -----------------------------------------------------
    // 5. INÍCIO DA EXECUÇÃO
    // -----------------------------------------------------
    fetchPatientData(); 
});
