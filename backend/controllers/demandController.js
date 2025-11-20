const db = require('../models');

/**
 * Registra as respostas de um questionário como uma busca de demanda anônima.
 * Inclui avaliação (rating) e feedback se disponíveis.
 */
exports.recordSearch = async (req, res) => {
    try {
        // 1. Separa os dados novos (rating/feedback) do resto do JSON
        const { rating, feedback, ...searchParams } = req.body;

        // 2. Prepara os valores para o banco
        // Convertemos o JSON de busca para string para o banco aceitar no SQL bruto
        const searchParamsJson = JSON.stringify(searchParams);
        
        // Tratamento para rating (garante que seja número ou null)
        const ratingValue = rating ? parseInt(rating) : null;
        // Tratamento para feedback (garante string ou null)
        const feedbackValue = feedback ? feedback : null;

        // 3. Executa INSERT via SQL Bruto (Bypassing do Model para garantir as colunas novas)
        // Nota: O Sequelize adiciona aspas duplas no nome da tabela "DemandSearches" e colunas
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

        res.status(201).json({ message: 'Busca registrada com sucesso (com feedback)!' });

    } catch (error) {
        console.error('Erro ao registrar busca de demanda:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao registrar a busca.' });
    }
};