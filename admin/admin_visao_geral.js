window.initializePage = function() {
    const token = localStorage.getItem('girassol_token');

    async function fetchStats() {
        try {
            const response = await fetch('http://localhost:3001/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Falha ao buscar estatísticas.');
            }

            const stats = await response.json();
            updateKpiCards(stats);
            updateActionWidgets(stats);

        } catch (error) {
            console.error("Erro ao carregar dados da visão geral:", error);
            // Você pode adicionar uma mensagem de erro na UI aqui
        }
    }

    function updateKpiCards(stats) {
        document.getElementById('kpi-mrr').textContent = `R$ ${parseFloat(stats.mrr).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        document.getElementById('kpi-new-patients').textContent = stats.newPatientsCount;
        document.getElementById('kpi-new-psychologists').textContent = stats.newPsychologistsCount;
        document.getElementById('kpi-questionnaires').textContent = stats.questionnairesTodayCount;
    }

    function updateActionWidgets(stats) {
        const pendingCrpCount = document.getElementById('pending-crp-count');
        const pendingReviewsCount = document.getElementById('pending-reviews-count');

        if (pendingCrpCount) pendingCrpCount.textContent = stats.waitingListCount;
        if (pendingReviewsCount) pendingReviewsCount.textContent = stats.pendingReviewsCount;

        if (stats.waitingListCount > 0) pendingCrpCount.classList.add('alerta-critico');
    }

    fetchStats();
};