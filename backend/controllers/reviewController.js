const db = require('../models');

// ----------------------------------------------------------------------
// Rota: POST /api/reviews
// DESCRIÇÃO: Cria uma nova avaliação para um psicólogo.
// Acesso: PRIVADO (apenas pacientes logados)
// ----------------------------------------------------------------------
exports.createReview = async (req, res) => {
    try {
        const patientId = req.patient.id;
        const { psychologistId, rating, comment } = req.body;

        // Validações básicas
        if (!psychologistId || !rating) {
            return res.status(400).json({ error: 'ID do psicólogo e nota são obrigatórios.' });
        }

        // Verifica se o psicólogo existe
        const psychologist = await db.Psychologist.findByPk(psychologistId);
        if (!psychologist) {
            return res.status(404).json({ error: 'Psicólogo não encontrado.' });
        }

        // Verifica se o paciente já avaliou este psicólogo
        const existingReview = await db.Review.findOne({
            where: {
                patientId: patientId,
                psychologistId: psychologistId
            }
        });

        if (existingReview) {
            return res.status(409).json({ error: 'Você já avaliou este profissional.' });
        }

        // Cria a nova avaliação
        const newReview = await db.Review.create({
            patientId,
            psychologistId,
            rating,
            comment
        });

        res.status(201).json({
            message: 'Avaliação criada com sucesso!',
            review: newReview
        });

    } catch (error) {
        console.error('Erro ao criar avaliação:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao criar avaliação.' });
    }
};