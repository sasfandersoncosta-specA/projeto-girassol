const db = require('../models');

/**
 * Registra as respostas de um questionário como uma busca de demanda anônima.
 * VERSÃO FORÇADA (SQL DIRETO) para garantir que Rating e Feedback sejam salvos
 * mesmo sem atualizar o Model do Sequelize.
 */
exports.recordSearch = async (req, res) => {
    try {
        // 1. Separa os dados novos (rating/feedback) do resto do JSON
        const { rating, feedback, ...searchParams } = req.body;

        // 2. Prepara os valores
        const searchParamsJson = JSON.stringify(searchParams);
        
        // Garante que rating seja número (ou null) e feedback string (ou null)
        const ratingValue = rating ? parseInt(rating) : null;
        const feedbackValue = feedback ? feedback : null;

        console.log("Tentando salvar:", { rating: ratingValue, feedback: feedbackValue });

        // 3. SQL NA FORÇA BRUTA (Ignora o Model)
        // Tenta inserir na tabela "DemandSearches" (padrão) ou "demand_searches" (alternativa)
        // Usamos COALESCE para garantir data atual
        const query = `
            INSERT INTO "DemandSearches" 
            ("searchParams", "rating", "feedback", "createdAt", "updatedAt")
            VALUES 
            (:json, :rating, :feedback, NOW(), NOW())
        `;

        await db.sequelize.query(query, {
            replacements: { 
                json: searchParamsJson,
                rating: ratingValue,
                feedback: feedbackValue
            },
            type: db.sequelize.QueryTypes.INSERT
        });

        res.status(201).json({ message: 'Busca registrada com sucesso (SQL Direto)!' });

    } catch (error) {
        console.error('Erro ao registrar busca (Tentativa 1):', error.message);
        
        // PLANO B: Se a tabela estiver em minúsculo (acontece em alguns bancos)
        try {
             const queryB = `
                INSERT INTO "demand_searches" 
                ("searchParams", "rating", "feedback", "createdAt", "updatedAt")
                VALUES 
                (:json, :rating, :feedback, NOW(), NOW())
            `;
            await db.sequelize.query(queryB, {
                replacements: { json: JSON.stringify(searchParams), rating: rating, feedback: feedback },
                type: db.sequelize.QueryTypes.INSERT
            });
            res.status(201).json({ message: 'Busca registrada com sucesso (Plano B)!' });
        } catch (errorB) {
            console.error('Erro Fatal ao salvar:', errorB);
            res.status(500).json({ error: 'Erro ao salvar no banco.' });
        }
    }
};

/**
 * Retorna todas as avaliações (rating + feedback) e a média geral.
 * Tenta ler de "DemandSearches" ou "demand_searches".
 */
exports.getRatings = async (req, res) => {
    try {
        // Descobre qual nome de tabela funciona
        let tableName = "DemandSearches";
        try {
            await db.sequelize.query('SELECT 1 FROM "DemandSearches" LIMIT 1');
        } catch (e) {
            tableName = "demand_searches"; 
        }

        // 1. Busca a Média e o Total
        const [stats] = await db.sequelize.query(`
            SELECT 
                AVG(rating)::numeric(10,1) as media, 
                COUNT(*) as total 
            FROM "${tableName}" 
            WHERE rating IS NOT NULL
        `);

        // 2. Busca os comentários
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
        console.error('Erro ao buscar avaliações:', error);
        res.status(500).json({ error: 'Erro ao carregar avaliações.' });
    }
};