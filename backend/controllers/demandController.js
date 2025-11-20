const db = require('../models');

/**
 * REGISTRO HÍBRIDO: 
 * 1. Usa o Sequelize para criar a linha (garante que searchParams seja salvo corretamente).
 * 2. Usa SQL direto para atualizar o Rating e Feedback (já que o Model não tem esses campos).
 */
exports.recordSearch = async (req, res) => {
    try {
        const { rating, feedback, ...searchParams } = req.body;

        console.log("1. Recebido:", { rating, feedback });

        // PASSO 1: Criar o registro usando o Sequelize (Seguro)
        // Isso garante que 'searchParams', 'createdAt', etc. sejam salvos do jeito certo
        const novaBusca = await db.DemandSearch.create({
            searchParams: searchParams
        });

        // Se não tiver nota, paramos por aqui
        if (!rating && !feedback) {
            return res.status(201).json({ message: 'Busca registrada (sem avaliação).' });
        }

        const idGerado = novaBusca.id;
        console.log("2. ID Gerado pelo Sequelize:", idGerado);

        // PASSO 2: Atualizar a linha criada com a nota e feedback via SQL
        // Tentamos o nome da tabela padrão ("DemandSearches")
        try {
            await db.sequelize.query(
                `UPDATE "DemandSearches" SET rating = :r, feedback = :f WHERE id = :id`,
                {
                    replacements: { r: parseInt(rating), f: feedback, id: idGerado },
                    type: db.sequelize.QueryTypes.UPDATE
                }
            );
        } catch (sqlError) {
            console.warn("Tentativa 1 falhou, tentando nome de tabela minúsculo...");
            // Plano B: Tabela em minúsculo
            await db.sequelize.query(
                `UPDATE "demand_searches" SET rating = :r, feedback = :f WHERE id = :id`,
                {
                    replacements: { r: parseInt(rating), f: feedback, id: idGerado },
                    type: db.sequelize.QueryTypes.UPDATE
                }
            );
        }

        res.status(201).json({ message: 'Busca e Avaliação registradas com sucesso!' });

    } catch (error) {
        console.error('ERRO FATAL ao registrar:', error);
        res.status(500).json({ error: 'Erro interno ao salvar.' });
    }
};

/**
 * Busca as avaliações para o Admin
 */
exports.getRatings = async (req, res) => {
    try {
        // Descobre o nome da tabela dinamicamente para não errar
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