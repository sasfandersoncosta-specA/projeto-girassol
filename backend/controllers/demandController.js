const db = require('../models');

/**
 * Registra as respostas de um questionário como uma busca de demanda anônima.
 * @param {object} req - O objeto de requisição do Express.
 * @param {object} res - O objeto de resposta do Express.
 */
exports.recordSearch = async (req, res) => {
    try {
        const searchData = req.body;

        // Cria um novo registro na tabela DemandSearch
        await db.DemandSearch.create({
            searchParams: searchData
        });

        res.status(201).json({ message: 'Busca registrada com sucesso.' });
    } catch (error) {
        console.error('Erro ao registrar busca de demanda:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao registrar a busca.' });
    }
};