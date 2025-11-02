window.initializePage = function() {
    const tableBody = document.getElementById('psychologists-table-body');
    const rowTemplate = document.getElementById('psychologist-row-template');
    const token = localStorage.getItem('girassol_token');

    if (!tableBody || !rowTemplate || !token) {
        console.error("Elementos essenciais ou token não encontrados para a página de gerenciamento.");
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" class="error-row">Erro ao carregar a página. Faça login novamente.</td></tr>';
        return;
    }

    const LIMIT = 10;
    let currentPage = 1;
    let currentFilters = {
        search: '',
        status: '',
        plano: ''
    };

    // Mapear elementos de filtro
    const searchInput = document.querySelector('.campo-busca');
    const statusSelect = document.querySelectorAll('.filtro-select')[0];
    const planoSelect = document.querySelectorAll('.filtro-select')[1];

    async function fetchPsychologists(page = 1, filters = {}) {
        tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Carregando psicólogos...</td></tr>';
        currentPage = page;

        const params = new URLSearchParams();
        params.append('limit', LIMIT);
        params.append('page', page);

        if (filters.search) params.append('search', filters.search);
        if (filters.status) params.append('status', filters.status);
        if (filters.plano) params.append('plano', filters.plano);

        const url = `http://localhost:3001/api/admin/psychologists?${params.toString()}`;

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao buscar dados dos psicólogos.');
            }

            const result = await response.json();
            renderTable(result.data);
            // TODO: Implementar renderização da paginação com 'result.totalPages'

        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="7" class="error-row">${error.message}</td></tr>`;
        }
    }

    function renderTable(psychologists) {
        tableBody.innerHTML = ''; // Limpa o estado de "carregando"

        if (psychologists.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="empty-row">Nenhum psicólogo encontrado.</td></tr>';
            return;
        }

        psychologists.forEach(psy => {
            const row = rowTemplate.content.cloneNode(true).querySelector('tr');

            row.querySelector('[data-label="Nome"]').textContent = psy.nome;
            row.querySelector('[data-label="E-mail"]').textContent = psy.email;
            row.querySelector('[data-label="CRP"]').textContent = psy.crp;
            row.querySelector('[data-label="Plano"]').textContent = psy.plano || '-';
            // A simulação de cliques foi removida do backend, então simplificamos aqui
            row.querySelector('[data-label="Cliques"]').textContent = '- / -';

            const statusCell = row.querySelector('[data-label="Status"] .status');
            statusCell.textContent = psy.status;
            statusCell.className = `status status-${psy.status}`;

            // A lógica dos botões de ação pode ser adicionada aqui
            const actionsCell = row.querySelector('[data-label="Ações"]');
            const isSuspended = psy.status === 'inactive';

            actionsCell.innerHTML = `
                <button class="btn-tabela">Ver Detalhes</button>
                <button class="btn-tabela btn-suspend">${isSuspended ? 'Reativar' : 'Suspender'}</button>
                <button class="btn-tabela btn-tabela-perigo btn-delete">Excluir</button>
            `;

            // Adiciona funcionalidade ao botão de Suspender/Reativar
            actionsCell.querySelector('.btn-suspend').addEventListener('click', () => {
                const newStatus = isSuspended ? 'active' : 'inactive';
                const actionText = isSuspended ? 'reativar' : 'suspender';
                
                window.openConfirmationModal(
                    `Confirmar ${isSuspended ? 'Reativação' : 'Suspensão'}`,
                    `<p>Você tem certeza que deseja <strong>${actionText}</strong> o perfil de ${psy.nome}?</p>`,
                    async () => {
                        try {
                            const response = await fetch(`http://localhost:3001/api/admin/psychologists/${psy.id}/status`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ status: newStatus })
                            });
                            if (!response.ok) throw new Error('Falha ao atualizar status.');
                            fetchPsychologists(currentPage, currentFilters); // Recarrega a tabela
                        } catch (error) {
                            alert(error.message);
                        }
                    }
                );
            });

            // Adiciona funcionalidade ao botão de Excluir
            actionsCell.querySelector('.btn-delete').addEventListener('click', () => {
                window.openConfirmationModal(
                    'Confirmar Exclusão Permanente',
                    `<p>Esta ação é irreversível. Você tem certeza que deseja <strong>excluir permanentemente</strong> o perfil de ${psy.nome}?</p>`,
                    async () => {
                        try {
                            const response = await fetch(`http://localhost:3001/api/admin/psychologists/${psy.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!response.ok) throw new Error('Falha ao excluir perfil.');
                            row.remove(); // Remove da UI imediatamente
                        } catch (error) { alert(error.message); }
                    }
                );
            });

            tableBody.appendChild(row);
        });
    }

    function applyFilters() {
        currentFilters.search = searchInput.value;
        currentFilters.status = statusSelect.value;
        currentFilters.plano = planoSelect.value;
        fetchPsychologists(1, currentFilters); // Sempre volta para a primeira página ao filtrar
    }

    // Adicionar Listeners nos Filtros
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 500); // Espera 500ms após o usuário parar de digitar
    });
    statusSelect.addEventListener('change', applyFilters);
    planoSelect.addEventListener('change', applyFilters);

    fetchPsychologists(1, currentFilters);
};