const db = require('../models');

/**
 * REGISTRO DA BUSCA + AVALIAÇÃO
 * Versão corrigida para extrair dados aninhados (avaliacao_ux)
 */
exports.recordSearch = async (req, res) => {
    try {
        const data = req.body;

        // --- 1. A EXTRAÇÃO CORRETA (O PULO DO GATO) ---
        let rating = data.rating;
        let feedback = data.feedback;

        // Se não veio solto, procura dentro da caixinha 'avaliacao_ux'
        if (!rating && data.avaliacao_ux) {
            rating = data.avaliacao_ux.rating;
            feedback = data.avaliacao_ux.feedback;
        }

        console.log("RECEBIDO PELO BACKEND:", { rating, feedback }); // Para debug nos logs

        // Remove a avaliação dos parâmetros de busca para não sujar o JSON
        // (Cria uma cópia dos dados sem a chave avaliacao_ux)
        const { avaliacao_ux, ...searchParams } = data;

        // --- 2. CRIAR A BUSCA (SEQUELIZE) ---
        const novaBusca = await db.DemandSearch.create({
            searchParams: searchParams
        });

        // Se não tem nota nem feedback, encerra aqui
        if (!rating && !feedback) {
            return res.status(201).json({ message: 'Busca registrada (sem avaliação).' });
        }

        // --- 3. SALVAR A NOTA (SQL DIRETO) ---
        // Atualiza a linha recém-criada com os dados da avaliação
        const idGerado = novaBusca.id;
        
        // Tratamento de tipos
        const rValue = rating ? parseInt(rating) : null;
        const fValue = feedback ? feedback : null;

        try {
            // Tenta na tabela padrao DemandSearches
            await db.sequelize.query(
                `UPDATE "DemandSearches" SET rating = :r, feedback = :f WHERE id = :id`,
                {
                    replacements: { r: rValue, f: fValue, id: idGerado },
                    type: db.sequelize.QueryTypes.UPDATE
                }
            );
        } catch (sqlError) {
            console.warn("Tentativa 1 falhou, tentando minúsculo...");
            // Plano B (tabela minúscula)
            await db.sequelize.query(
                `UPDATE "demand_searches" SET rating = :r, feedback = :f WHERE id = :id`,
                {
                    replacements: { r: rValue, f: fValue, id: idGerado },
                    type: db.sequelize.QueryTypes.UPDATE
                }
            );
        }

        res.status(201).json({ message: 'Avaliação salva com sucesso!' });

    } catch (error) {
        console.error('ERRO NO CONTROLLER:', error);
        res.status(500).json({ error: 'Erro interno ao processar.' });
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