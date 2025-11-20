const db = require('../models');

/**
 * CONTROLLER COM DEBUG E LOGS DETALHADOS
 * Grava os dados diretamente na tabela e mostra no terminal o que está acontecendo.
 */
exports.recordSearch = async (req, res) => {
    try {
        // --- 1. DEBUG: O QUE CHEGOU? ---
        console.log("\n========== [DEBUG START] NOVA REQUISIÇÃO ==========");
        console.log("RAW BODY:", JSON.stringify(req.body, null, 2));

        const data = req.body;

        // --- 2. EXTRAÇÃO DE DADOS ---
        let rawRating = data.rating;
        let rawFeedback = data.feedback;

        // Se não veio solto, procura dentro da caixinha 'avaliacao_ux'
        if (!rawRating && data.avaliacao_ux) {
            console.log("[DEBUG] Encontrado objeto 'avaliacao_ux'. Extraindo...");
            rawRating = data.avaliacao_ux.rating;
            rawFeedback = data.avaliacao_ux.feedback;
        }

        console.log(`[DEBUG] Dados extraídos -> Rating: ${rawRating} | Feedback: ${rawFeedback}`);

        // --- 3. SANITIZAÇÃO ---
        // Garante que rating seja número inteiro ou null (Postgres odeia string vazia ou NaN)
        let ratingValue = null;
        if (rawRating !== undefined && rawRating !== null && rawRating !== "") {
            ratingValue = parseInt(rawRating, 10);
        }

        // Garante que feedback seja string ou null
        let feedbackValue = null;
        if (rawFeedback !== undefined && rawFeedback !== null && typeof rawFeedback === 'string' && rawFeedback.trim() !== "") {
            feedbackValue = rawFeedback;
        }

        console.log(`[DEBUG] Valores finais p/ Banco -> Rating: ${ratingValue} (${typeof ratingValue}) | Feedback: ${feedbackValue}`);

        // Limpa o JSON para salvar na coluna 'searchParams' sem duplicar a avaliação
        const searchParams = { ...data };
        delete searchParams.avaliacao_ux;
        delete searchParams.rating;
        delete searchParams.feedback;

        // --- 4. SQL DIRETO ---
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
                    rating: ratingValue, 
                    feedback: feedbackValue 
                },
                type: db.sequelize.QueryTypes.INSERT
            });
            console.log("[DEBUG] Sucesso no INSERT (Tabela DemandSearches)");

        } catch (sqlError) {
            console.warn("[DEBUG] Falha na tabela 'DemandSearches'. Tentando 'demand_searches'...", sqlError.message);
            
            // PLANO B
            const queryB = `
                INSERT INTO "demand_searches" 
                ("searchParams", "rating", "feedback", "createdAt", "updatedAt")
                VALUES 
                (:json, :rating, :feedback, NOW(), NOW())
            `;
            await db.sequelize.query(queryB, {
                replacements: { 
                    json: JSON.stringify(searchParams), 
                    rating: ratingValue, 
                    feedback: feedbackValue 
                },
                type: db.sequelize.QueryTypes.INSERT
            });
            console.log("[DEBUG] Sucesso no INSERT (Tabela demand_searches)");
        }

        console.log("========== [DEBUG END] SUCESSO ==========\n");
        res.status(201).json({ message: 'Busca e Avaliação salvas com sucesso!' });

    } catch (error) {
        console.error("========== [DEBUG ERROR] ==========");
        console.error(error);
        console.error("===================================");
        // Não devolve erro 500 para não travar o frontend, mas avisa no log
        res.status(201).json({ message: 'Busca salva (com alerta interno nos logs).' });
    }
};

/**
 * Busca as avaliações para o Admin
 */
exports.getRatings = async (req, res) => {
    try {
        let tableName = "DemandSearches";
        try {
            await db.sequelize.query('SELECT 1 FROM "DemandSearches" LIMIT 1');
        } catch (e) {
            tableName = "demand_searches"; 
        }

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
        console.error('Erro ao buscar avaliações:', error);
        res.status(500).json({ error: 'Erro ao carregar dados.' });
    }
};