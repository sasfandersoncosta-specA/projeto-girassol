window.initializePage = function() {
    const tableBody = document.getElementById('psychologists-table-body');
    const rowTemplate = document.getElementById('psychologist-row-template');
    const token = localStorage.getItem('girassol_token');

    // --- CORREÇÃO 1: Definindo o URL base relativo ---
    // Usar string vazia faz com que ele use o domínio atual (Render) automaticamente
    const API_PREFIX = ''; 

    if (!tableBody || !rowTemplate || !token) {
        console.error("Elementos essenciais ou token não encontrados.");
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" class="error-row">Erro ao carregar elementos. Recarregue a página.</td></tr>';
        return;
    }

    const LIMIT = 10;
    let currentPage = 1;
    let currentFilters = {
        search: '',
        status: '',
        plano: ''
    };

    const searchInput = document.querySelector('.campo-busca');
    const statusSelect = document.querySelectorAll('.filtro-select')[0];
    const planoSelect = document.querySelectorAll('.filtro-select')[1];

    async function fetchPsychologists(page = 1, filters = {}) {
        tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Carregando dados...</td></tr>';
        currentPage = page;

        const params = new URLSearchParams();
        params.append('limit', LIMIT);
        params.append('page', page);

        if (filters.search) params.append('search', filters.search);
        if (filters.status) params.append('status', filters.status);
        if (filters.plano) params.append('plano', filters.plano);

        // --- CORREÇÃO 2: Caminho relativo ---
        const url = `${API_PREFIX}/api/admin/psychologists?${params.toString()}`;

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao buscar dados.');
            }

            const result = await response.json();
            renderTable(result.data);

        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="7" class="error-row">${error.message}</td></tr>`;
        }
    }

    function renderTable(psychologists) {
        tableBody.innerHTML = ''; 

        if (psychologists.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="empty-row">Nenhum profissional encontrado.</td></tr>';
            return;
        }

        psychologists.forEach(psy => {
            const row = rowTemplate.content.cloneNode(true).querySelector('tr');

            row.querySelector('[data-label="Nome"]').textContent = psy.nome;
            row.querySelector('[data-label="E-mail"]').textContent = psy.email;
            row.querySelector('[data-label="CRP"]').textContent = psy.crp;
            row.querySelector('[data-label="Plano"]').textContent = psy.plano || 'Gratuito';
            row.querySelector('[data-label="Cliques"]').textContent = '- / -';

            const statusCell = row.querySelector('[data-label="Status"] .status');
            // Traduz o status para ficar bonito na tabela
            const statusMap = { 'active': 'Ativo', 'inactive': 'Inativo', 'pending': 'Pendente' };
            statusCell.textContent = statusMap[psy.status] || psy.status;
            statusCell.className = `status status-${psy.status}`;

            const actionsCell = row.querySelector('[data-label="Ações"]');
            const isSuspended = psy.status === 'inactive';

            // Recria os botões para garantir que estão limpos
            actionsCell.innerHTML = `
                <button class="btn-tabela btn-details" title="Ver Perfil Público">Ver Detalhes</button>
                <button class="btn-tabela btn-suspend">${isSuspended ? 'Reativar' : 'Suspender'}</button>
                <button class="btn-tabela btn-tabela-perigo btn-delete">Excluir</button>
            `;

            // --- CORREÇÃO 3: Botão Ver Detalhes Agora Funciona ---
            actionsCell.querySelector('.btn-details').addEventListener('click', () => {
                if (psy.slug) {
                    // Abre o perfil público em nova aba
                    window.open(`/${psy.slug}`, '_blank');
                } else {
                    alert('Este profissional ainda não configurou um link personalizado (slug).');
                }
            });

            // --- Botão Suspender/Reativar ---
            actionsCell.querySelector('.btn-suspend').addEventListener('click', () => {
                const newStatus = isSuspended ? 'active' : 'inactive';
                const actionText = isSuspended ? 'reativar' : 'suspender';
                
                window.openConfirmationModal(
                    `Confirmar ${isSuspended ? 'Reativação' : 'Suspensão'}`,
                    `<p>Você tem certeza que deseja <strong>${actionText}</strong> o perfil de <b>${psy.nome}</b>?</p>`,
                    async () => {
                        try {
                            const response = await fetch(`${API_PREFIX}/api/admin/psychologists/${psy.id}/status`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ status: newStatus })
                            });
                            if (!response.ok) throw new Error('Falha ao atualizar status.');
                            fetchPsychologists(currentPage, currentFilters); 
                        } catch (error) {
                            alert(error.message);
                        }
                    }
                );
            });

            // --- Botão Excluir ---
            actionsCell.querySelector('.btn-delete').addEventListener('click', () => {
                window.openConfirmationModal(
                    'Confirmar Exclusão Permanente',
                    `<p style="color:#e63946">ATENÇÃO: Esta ação é irreversível!</p><p>Você vai apagar permanentemente o perfil de <b>${psy.nome}</b> e todos os dados associados.</p>`,
                    async () => {
                        try {
                            const response = await fetch(`${API_PREFIX}/api/admin/psychologists/${psy.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!response.ok) throw new Error('Falha ao excluir perfil.');
                            
                            // Remove a linha visualmente para dar feedback instantâneo
                            row.style.opacity = '0';
                            setTimeout(() => fetchPsychologists(currentPage, currentFilters), 500);
                            
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
        fetchPsychologists(1, currentFilters);
    }

    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 500); 
    });
    statusSelect.addEventListener('change', applyFilters);
    planoSelect.addEventListener('change', applyFilters);

    // Carrega inicial
    fetchPsychologists(1, currentFilters);
};