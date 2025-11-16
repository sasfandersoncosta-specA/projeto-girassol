// backend/controllers/qnaController.js
const { Question, Answer, Psychologist } = require('../models');

/**
 * Cria uma nova pergunta anônima.
 */
exports.createQuestion = async (req, res) => {
    const { content } = req.body;

    if (!content || content.length < 50) {
        return res.status(400).json({ message: 'O conteúdo da pergunta deve ter pelo menos 50 caracteres.' });
    }

    try {
        // Gera um título a partir do conteúdo
        const title = content.substring(0, 60).trim() + (content.length > 60 ? '...' : '');

        const newQuestion = await Question.create({
            title,
            content,
            status: 'pending_review', // Todas as perguntas começam pendentes de revisão
        });

        res.status(201).json({ message: 'Pergunta enviada com sucesso e aguardando moderação.', question: newQuestion });

    } catch (error) {
        console.error("Erro ao criar pergunta:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao processar a pergunta.' });
    }
};

/**
 * Busca todas as perguntas que foram aprovadas e suas respectivas respostas.
 */
exports.getApprovedQuestions = async (req, res) => {
    try {
        const questions = await Question.findAll({
            where: {
                status: ['approved', 'answered'], // Busca perguntas aprovadas ou já respondidas
            },
            include: [
                {
                    model: Answer,
                    as: 'answers',
                    required: false, // LEFT JOIN para incluir perguntas sem respostas
                    include: [
                        {
                            model: Psychologist,
                            as: 'psychologist',
                            attributes: ['id', 'nome', 'crp', 'fotoUrl', 'slug'], // Seleciona os campos do psicólogo
                        }
                    ]
                }
            ],
            order: [
                ['createdAt', 'DESC'], // Ordena as perguntas da mais nova para a mais antiga
                [{ model: Answer, as: 'answers' }, 'createdAt', 'ASC'] // Ordena as respostas dentro de cada pergunta
            ],
        });

        // Adiciona um campo 'patient' para manter a compatibilidade com o frontend
        const formattedQuestions = questions.map(q => ({
            ...q.toJSON(),
            patient: { nome: 'Anônimo' }
        }));

        res.status(200).json(formattedQuestions);
    } catch (error) {
        console.error("Erro ao buscar perguntas:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar as perguntas.' });
    }
};