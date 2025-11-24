// backend/controllers/qnaController.js
const db = require('../models');

// Listar perguntas (GET /api/qna)
exports.getQuestions = async (req, res) => {
    try {
        // (Trava de plano removida aqui)

        // 2. BUSCA NO BANCO
        const questions = await db.Question.findAll({
            include: [{
                model: db.Patient,
                attributes: ['nome', 'fotoUrl'] 
            }],
            order: [['createdAt', 'DESC']]
        });

        // 3. FORMATAÇÃO
        const formatted = questions.map(q => ({
            id: q.id,
            titulo: q.title,
            conteudo: q.content,
            Patient: q.Patient,
            createdAt: q.createdAt
        }));

        res.json(formatted);

    } catch (error) {
        console.error('Erro ao buscar perguntas:', error);
        res.status(500).json({ error: 'Erro interno ao carregar comunidade.' });
    }
};

// Responder pergunta (POST /api/qna/:id/answer)
exports.answerQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { conteudo } = req.body; 
        const psychologistId = req.psychologist.id;

        // (Trava de plano removida aqui)

        // 2. CRIA A RESPOSTA
        await db.Answer.create({
            content: conteudo,
            questionId: id,
            psychologistId
        });
        
        console.log(`Psi ${psychologistId} respondeu a pergunta ${id}`);
        res.json({ success: true, message: 'Resposta enviada!' });
    } catch (error) {
        console.error('Erro ao responder:', error);
        res.status(500).json({ error: 'Erro ao salvar resposta.' });
    }
};
// --- ÁREA DO ADMIN (Adicione isto ao final do arquivo) ---

// Listar perguntas pendentes de moderação
exports.getPendingQuestions = async (req, res) => {
    try {
        // Busca perguntas (Se tiver coluna 'status' no banco, adicione o where: { status: 'pending' })
        const questions = await db.Question.findAll({
            include: [{
                model: db.Patient,
                attributes: ['nome', 'email'] // Dados do autor para o admin ver
            }],
            order: [['createdAt', 'DESC']]
        });
        res.json(questions);
    } catch (error) {
        console.error('Erro Admin QnA:', error);
        res.status(500).json({ error: 'Erro ao buscar perguntas pendentes' });
    }
};

// Moderar pergunta (Aprovar/Rejeitar)
exports.moderateQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const { status } = req.body; // O frontend enviará { status: 'approved' } ou 'rejected'

        const question = await db.Question.findByPk(questionId);
        if (!question) return res.status(404).json({ error: 'Pergunta não encontrada' });

        // Lógica de atualização (Se seu banco já tiver a coluna 'status')
        /* question.status = status;
        await question.save();
        */

        console.log(`[ADMIN] Pergunta ${questionId} moderada para: ${status}`);
        
        res.json({ success: true, message: `Pergunta ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso` });
    } catch (error) {
        console.error('Erro Admin Moderation:', error);
        res.status(500).json({ error: 'Erro ao processar moderação' });
    }
};