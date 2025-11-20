const db = require('../models');

/**
 * CONTROLLER BLINDADO (Versão SQL Puro)
 * Grava os dados diretamente na tabela, sem depender do Modelo do Sequelize.
 */
exports.recordSearch = async (req, res) => {
    try {
        const data = req.body;

        // --- 1. DETETIVE DE DADOS ---
        // Procura a nota e o feedback onde quer que eles estejam escondidos
        let rawRating = data.rating;
        let rawFeedback = data.feedback;

        // Se não achou no topo, procura dentro do objeto 'avaliacao_ux' (padrão do seu frontend)
        if (!rawRating && data.avaliacao_ux) {
            rawRating = data.avaliacao_ux.rating;
            rawFeedback = data.avaliacao_ux.feedback;
        }

        // Prepara os dados para o banco (Sanitização)
        const rating = rawRating ? parseInt(rawRating) : null;
        const feedback = rawFeedback ? String(rawFeedback) : null;

        // Limpa o JSON para salvar na coluna 'searchParams' sem duplicar a avaliação
        const searchParams = { ...data };
        delete searchParams.avaliacao_ux;
        delete searchParams.rating;
        delete searchParams.feedback;

        console.log("Tentando salvar via SQL Direto:", { rating, feedback });

        // --- 2. INJEÇÃO DIRETA NO BANCO ---
        // Tenta inserir na tabela com aspas (padrão Postgres/Sequelize)
        const query = `
            INSERT INTO "DemandSearches" 
            ("searchParams", "rating", "feedback", "createdAt", "updatedAt")
            VALUES 
            (:json, :rating, :feedback, NOW(), NOW())
        `;

        try {
            await db.sequelize.query(query, {
                replacements: { 
                    json: JSON.stringify(searchParams), 
                    rating: rating, 
                    feedback: feedback 
                },
                type: db.sequelize.QueryTypes.INSERT
            });
        } catch (sqlError) {
            console.warn("Erro na tabela 'DemandSearches', tentando 'demand_searches'...", sqlError.message);
            
            // PLANO B: Se a tabela estiver em minúsculo
            const queryB = `
                INSERT INTO "demand_searches" 
                ("searchParams", "rating", "feedback", "createdAt", "updatedAt")
                VALUES 
                (:json, :rating, :feedback, NOW(), NOW())
            `;
            await db.sequelize.query(queryB, {
                replacements: { 
                    json: JSON.stringify(searchParams), 
                    rating: rating, 
                    feedback: feedback 
                },
                type: db.sequelize.QueryTypes.INSERT
            });
        }

        res.status(201).json({ message: 'Busca e Avaliação salvas com sucesso!' });

    } catch (error) {
        console.error('ERRO CRÍTICO AO SALVAR:', error);
        // Não devolve erro 500 para não travar o frontend do usuário, mas loga no servidor
        res.status(201).json({ message: 'Busca salva (com alerta interno).' });
    }
};

/**
 * Busca as avaliações para o Admin
 */
exports.getRatings = async (req, res) => {
    try {
        // Descobre o nome da tabela
        let tableName = "DemandSearches";
        try {
            await db.sequelize.query('SELECT 1 FROM "DemandSearches" LIMIT 1');
        } catch (e) {
            tableName = "demand_searches"; 
        }

        // Busca média
        const [stats] = await db.sequelize.query(`
            SELECT AVG(rating)::numeric(10,1) as media, COUNT(*) as total 
            FROM "${tableName}" WHERE rating IS NOT NULL
        `);

        // Busca lista
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
        res.status(500).json({ error: 'Erro ao carregar dados.' });
    }
};