// backend/controllers/qnaController.js
const { Question, Answer, Psychologist, Message } = require('../models');

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

        // --- NOVA LÓGICA ---
        // Envia a pergunta para a caixa de entrada dos psicólogos do plano Ecossistema.
        // NOTA: A pergunta ainda está como 'pending_review'. A notificação é para que eles
        // saibam que há uma nova pergunta na fila para ser respondida assim que aprovada.
        // Uma melhoria futura seria notificar apenas após a aprovação.
        const targetPlan = 'ecossistema';
        const psychologistsToNotify = await Psychologist.findAll({ where: { plano: targetPlan } });

        if (psychologistsToNotify.length > 0) {
            const messagePromises = psychologistsToNotify.map(psi => {
                return Message.create({
                    psychologistId: psi.id, // Destinatário
                    // senderId pode ser null para mensagens do sistema
                    subject: 'Nova pergunta da comunidade para você',
                    content: `Uma nova pergunta foi enviada por um usuário anônimo e está aguardando moderação. \n\nPergunta: "${content}"\n\nAssim que for aprovada, você poderá respondê-la no painel de Perguntas & Respostas.`,
                    isRead: false,
                });
            });
            await Promise.all(messagePromises);
        }

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

/**
 * Permite que um psicólogo logado envie uma resposta para uma pergunta.
 */
exports.createAnswer = async (req, res) => {
    const { questionId } = req.params;
    const { content } = req.body;
    const psychologistId = req.user.id; // Assumindo que o ID do psicólogo vem do middleware de autenticação

    if (!content || content.length < 20) {
        return res.status(400).json({ message: 'O conteúdo da resposta deve ter pelo menos 20 caracteres.' });
    }

    try {
        const question = await Question.findByPk(questionId);
        if (!question) {
            return res.status(404).json({ message: 'Pergunta não encontrada.' });
        }

        // Opcional: Verificar se a pergunta pode ser respondida (status 'approved')
        if (question.status !== 'approved' && question.status !== 'answered') {
            return res.status(403).json({ message: 'Esta pergunta não está aberta para respostas no momento.' });
        }

        const newAnswer = await Answer.create({
            content,
            questionId,
            psychologistId,
        });

        // Atualiza o status da pergunta para 'answered'
        await question.update({ status: 'answered' });

        res.status(201).json({ message: 'Resposta enviada com sucesso!', answer: newAnswer });

    } catch (error) {
        console.error("Erro ao criar resposta:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao processar a resposta.' });
    }
};