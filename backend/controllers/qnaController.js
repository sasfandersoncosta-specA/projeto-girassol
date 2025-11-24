// backend/controllers/qnaController.js
const db = require('../models');

// Listar perguntas (GET /api/qna)
exports.getQuestions = async (req, res) => {
    try {
        // Busca perguntas que ainda não foram respondidas (ou todas, dependendo da regra)
        // Inclui dados do Paciente para mostrar "Perguntado por: João"
        const questions = await db.Question.findAll({
            include: [
                {
                    model: db.Patient,
                    attributes: ['nome', 'fotoUrl'] 
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Formata para o frontend
        const formatted = questions.map(q => ({
            id: q.id,
            titulo: q.titulo,
            conteudo: q.descricao || q.conteudo, // Ajuste conforme seu model (descricao ou conteudo)
            Patient: q.Patient,
            createdAt: q.createdAt
            // Se tiver lógica de 'respondedByMe', adicione aqui
        }));

        res.json(formatted);
    } catch (error) {
        console.error("Erro ao buscar perguntas:", error);
        res.status(500).json({ error: 'Erro interno ao carregar comunidade.' });
    }
};

// Responder pergunta (POST /api/qna/:id/answer)
exports.answerQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { conteudo } = req.body;
        const psychologistId = req.psychologist.id;

        // Aqui você criaria a resposta na tabela 'Answers'
        // Exemplo básico (ajuste conforme seu model):
        /* await db.Answer.create({
            conteudo,
            questionId: id,
            psychologistId
        });
        */

        // Por enquanto, simulamos sucesso para destravar o frontend
        console.log(`Psi ${psychologistId} respondeu a pergunta ${id}: ${conteudo}`);
        
        res.json({ success: true, message: 'Resposta enviada!' });
    } catch (error) {
        console.error('Erro ao responder:', error);
        res.status(500).json({ error: 'Erro ao salvar resposta.' });
    }
};