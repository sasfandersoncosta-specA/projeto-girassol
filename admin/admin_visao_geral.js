// admin/admin_visao_geral.js

window.initializePage = function() {
    let refreshInterval; // Variável para armazenar o ID do intervalo

    // Adiciona o script do Chart.js dinamicamente
    const chartJsScript = document.createElement('script');
    chartJsScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(chartJsScript);

    const token = localStorage.getItem('girassol_token');
    if (!token) {
        // Se não houver token, a lógica em admin.js já fará o logout.
        console.error("Token de autenticação não encontrado.");
        return;
    }

    /**
     * Formata um número como moeda brasileira (BRL).
     * @param {number} value - O valor a ser formatado.
     * @returns {string} - O valor formatado como R$ 1.234,56.
     */
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    /**
     * Busca os dados da API e atualiza os cards do dashboard.
     */
    async function fetchAndRenderStats() {
        const kpiCards = document.querySelectorAll('.kpi-card .kpi-numero');

        // Mostra o spinner e esconde o número
        kpiCards.forEach(card => {
            let spinner = card.querySelector('.loading-spinner');
            if (!spinner) {
                spinner = document.createElement('div');
                spinner.className = 'loading-spinner';
                card.appendChild(spinner);
            }
            spinner.style.display = 'block';
            // Esconde o texto do número, mas mantém o espaço
            card.style.color = 'transparent';
        });

        try {
            const response = await fetch('http://localhost:3001/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Falha ao buscar estatísticas do dashboard.');
            }

            const stats = await response.json();

            // Atualiza cada card com os dados recebidos da API
            document.getElementById('kpi-mrr').textContent = formatCurrency(stats.mrr);
            document.getElementById('kpi-new-patients').textContent = stats.newPatientsCount;
            document.getElementById('kpi-new-psychologists').textContent = stats.newPsychologistsCount;
            document.getElementById('kpi-questionnaires-today').textContent = stats.questionnairesTodayCount;

            // Atualiza os alertas de ações pendentes individualmente
            document.getElementById('waiting-list-count').textContent = stats.waitingListCount || 0;
            document.getElementById('pending-reviews-count').textContent = stats.pendingReviewsCount || 0;

            // Atualiza o timestamp de "última atualização"
            const timestampEl = document.getElementById('last-updated-timestamp');
            if (timestampEl) {
                timestampEl.textContent = `Última atualização: ${new Date().toLocaleTimeString('pt-BR')}`;
            }

        } catch (error) {
            console.error("Erro ao carregar estatísticas:", error);
            // Opcional: Mostrar uma mensagem de erro na UI
        } finally {
            // Esconde o spinner e mostra o número novamente
            kpiCards.forEach(card => {
                card.style.color = ''; // Restaura a cor do texto
                const spinner = card.querySelector('.loading-spinner');
                if (spinner) spinner.style.display = 'none';
            });
        }
    }

    let newUsersChartInstance = null; // Variável para armazenar a instância do gráfico

    /**
     * Renderiza o gráfico de novos usuários.
     */
    async function renderNewUsersChart() {
        try {
            const response = await fetch('http://localhost:3001/api/admin/charts/new-users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao buscar dados do gráfico.');

            const chartData = await response.json();

            if (newUsersChartInstance) {
                newUsersChartInstance.destroy(); // Destrói o gráfico antigo antes de criar um novo
            }

            const ctx = document.getElementById('new-users-chart').getContext('2d');

            newUsersChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.labels, // Ex: ['Maio', 'Junho', 'Julho']
                    datasets: [
                        {
                            label: 'Novos Pacientes',
                            data: chartData.patientData,
                            backgroundColor: 'rgba(27, 67, 50, 0.7)', // Verde escuro
                            borderColor: 'rgba(27, 67, 50, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Novos Psicólogos',
                            data: chartData.psychologistData,
                            backgroundColor: 'rgba(255, 238, 140, 0.7)', // Amarelo Girassol
                            borderColor: 'rgba(255, 238, 140, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

        } catch (error) {
            console.error("Erro ao renderizar gráfico:", error);
            const chartContainer = document.getElementById('new-users-chart').parentElement;
            chartContainer.innerHTML = '<p>Não foi possível carregar o gráfico.</p>';
        }
    }

    // Função para iniciar a atualização automática
    function startAutoRefresh() {
        // Busca os dados imediatamente na primeira vez
        fetchAndRenderStats();
        renderNewUsersChart();

        // Configura o intervalo para atualizar a cada 60 segundos (60000 ms)
        refreshInterval = setInterval(fetchAndRenderStats, 60000);
    }

    // Inicia o processo ao carregar a página
    chartJsScript.onload = () => {
        startAutoRefresh();
    };

    // Limpa o intervalo quando a página for "desmontada" (função chamada pelo admin.js)
    window.cleanupPage = () => clearInterval(refreshInterval);
};