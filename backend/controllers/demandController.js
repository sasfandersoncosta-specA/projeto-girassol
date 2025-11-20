const db = require('../models');

/**
 * VERSÃO FINAL DEBUG: Salva a busca e força o salvamento da avaliação.
 */
exports.recordSearch = async (req, res) => {
    try {
        let data = req.body;

        // --- NORMALIZAÇÃO DO INPUT (A CORREÇÃO DEFINITIVA) ---
        // Se o body for uma string (vindo do sendBeacon), faz o parse para JSON.
        // Se já for um objeto (vindo de um fetch normal), usa diretamente.
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }

        let rating = null;
        let feedback = null;

        // 1. Tenta achar a nota em qualquer lugar possível
        if (data.rating) rating = data.rating;
        if (data.feedback) feedback = data.feedback;
        
        // Se não achou, olha dentro do objeto avaliacao_ux
        if (!rating && data.avaliacao_ux) {
            rating = data.avaliacao_ux.rating;
            feedback = data.avaliacao_ux.feedback;
        }

        // Limpa o objeto para salvar na coluna JSON
        const searchParams = { ...data };
        delete searchParams.rating;
        delete searchParams.feedback;
        delete searchParams.avaliacao_ux;

        // 2. Cria o registro no banco (Sequelize)
        const novaBusca = await db.DemandSearch.create({
            searchParams: searchParams
        });
        
        const idGerado = novaBusca.id;

        // 3. Se tiver avaliação, atualiza a linha via SQL Direto
        if (rating || feedback) {
            // Garante tipos corretos
            const rValue = rating ? parseInt(rating) : null;
            const fValue = feedback ? String(feedback) : null;

            try {
                // Tenta tabela com aspas (Padrão Sequelize)
                await db.sequelize.query(
                    `UPDATE "DemandSearches" SET rating = :r, feedback = :f WHERE id = :id`,
                    { replacements: { r: rValue, f: fValue, id: idGerado } }
                );
            } catch (err1) {
                // Tenta tabela minúscula (Padrão Postgres puro)
                await db.sequelize.query(
                    `UPDATE "demand_searches" SET rating = :r, feedback = :f WHERE id = :id`,
                    { replacements: { r: rValue, f: fValue, id: idGerado } }
                );
            }
        }

        res.status(201).json({ message: 'Busca registrada!' });

    } catch (error) {
        console.error('[DEBUG] ERRO FATAL:', error);
        res.status(500).json({ error: 'Erro interno.' });
    }
};

/**
 * Busca as avaliações para o Admin
 */
exports.getRatings = async (req, res) => {
    try {
        let tableName = "DemandSearches";
        try { await db.sequelize.query('SELECT 1 FROM "DemandSearches" LIMIT 1'); } 
        catch (e) { tableName = "demand_searches"; }

        const [stats] = await db.sequelize.query(`
            SELECT AVG(rating)::numeric(10,1) as media, COUNT(*) as total 
            FROM "${tableName}" WHERE rating IS NOT NULL
        `);

        const [reviews] = await db.sequelize.query(`
            SELECT rating, feedback, "createdAt"
            FROM "${tableName}"
            WHERE rating IS NOT NULL
            ORDER BY "createdAt" DESC
            LIMIT 50
        `);

        res.json({
            stats: stats[0] || { media: 0, total: 0 },
            reviews: reviews || []
        });

    } catch (error) {
        console.error('Erro admin:', error);
        res.status(500).json({ error: 'Erro ao carregar dados.' });
    }
};