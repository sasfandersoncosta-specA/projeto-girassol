const db = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateAdminToken = (id) => {
    return jwt.sign({ id, type: 'admin' }, process.env.JWT_SECRET, {
        expiresIn: '8h', // Token de admin dura 8 horas
    });
};

/**
 * Rota: POST /api/admin/login
 * Descrição: Autentica um administrador.
 */
exports.loginAdmin = async (req, res) => {
    try {
        const { email, senha } = req.body;
        const adminUser = await db.Psychologist.findOne({ where: { email, isAdmin: true } });

        if (adminUser && (await bcrypt.compare(senha, adminUser.senha))) {
            res.status(200).json({ token: generateAdminToken(adminUser.id) });
        } else {
            res.status(401).json({ error: 'Credenciais de administrador inválidas.' });
        }
    } catch (error) {
        console.error('Erro no login do administrador:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

/**
 * Rota: GET /api/admin/me
 * Descrição: Busca os dados do administrador logado.
 */
exports.getAdminData = async (req, res) => {
    // O middleware 'protect' já anexa o usuário em req.psychologist
    if (req.psychologist) {
        const { id, nome, email, telefone } = req.psychologist;
        res.status(200).json({ id, nome, email, telefone });
    } else {
        res.status(404).json({ error: 'Administrador não encontrado.' });
    }
};

/**
 * Rota: PUT /api/admin/me
 * Descrição: Atualiza os dados do administrador logado.
 */
exports.updateAdminData = async (req, res) => {
    try {
        const adminUser = req.psychologist;
        const { nome, email, telefone } = req.body;

        if (!nome || !email) {
            return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
        }

        // Verifica se o novo email já está em uso por outro usuário
        if (email.toLowerCase() !== adminUser.email.toLowerCase()) {
            const existingUser = await db.Psychologist.findOne({ where: { email } });
            if (existingUser) {
                return res.status(409).json({ error: 'Este email já está em uso por outra conta.' });
            }
        }

        await adminUser.update({ nome, email, telefone });

        res.status(200).json({ message: 'Dados atualizados com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar dados do admin:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

/**
 * Rota: PUT /api/admin/me/password
 * Descrição: Atualiza a senha do administrador logado.
 */
exports.updateAdminPassword = async (req, res) => {
    try {
        const { senha_atual, nova_senha } = req.body;

        if (!senha_atual || !nova_senha) {
            return res.status(400).json({ error: 'Todos os campos de senha são obrigatórios.' });
        }

        const adminUser = await db.Psychologist.findByPk(req.psychologist.id);

        const isMatch = await bcrypt.compare(senha_atual, adminUser.senha);
        if (!isMatch) {
            return res.status(401).json({ error: 'A senha atual está incorreta.' });
        }

        adminUser.senha = await bcrypt.hash(nova_senha, 10);
        await adminUser.save();

        res.status(200).json({ message: 'Senha alterada com sucesso!' });
    } catch (error) {
        console.error('Erro ao alterar senha do admin:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

/**
 * Rota: GET /api/admin/stats
 * Descrição: Busca estatísticas chave para o dashboard do administrador.
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // 1. Novos Pacientes (últimos 30 dias)
        const newPatientsCount = await db.Patient.count({
            where: { createdAt: { [Op.gte]: thirtyDaysAgo } }
        });

        // 2. Novos Psicólogos (últimos 30 dias)
        const newPsychologistsCount = await db.Psychologist.count({
            where: { createdAt: { [Op.gte]: thirtyDaysAgo } }
        });

        // 3. Questionários preenchidos hoje
        const questionnairesTodayCount = await db.DemandSearch.count({
            where: { createdAt: { [Op.gte]: todayStart } }
        });

        // 4. Profissionais na lista de espera
        const waitingListCount = await db.WaitingList.count({
            where: { status: 'pending' }
        });

        // 5. MRR (Receita Recorrente Mensal) - Simulado
        // Esta é uma simulação, pois não temos um campo 'plano' no modelo Psychologist.
        // Em um sistema real, buscaríamos os planos de cada psicólogo ativo.
        const activePsychologists = await db.Psychologist.findAll({ where: { status: 'active' } });
        const planPrices = { 'Semente': 59.90, 'Luz': 89.90, 'Sol': 129.90 };
        let mrr = 0;
        activePsychologists.forEach(psy => {
            // Simula um plano aleatório para cada psicólogo ativo
            const plans = Object.keys(planPrices);
            const randomPlan = plans[Math.floor(Math.random() * plans.length)];
            mrr += planPrices[randomPlan];
        });

        // 6. Avaliações pendentes de moderação
        const pendingReviewsCount = await db.Review.count({
            where: { status: 'pending' }
        });

        res.status(200).json({
            mrr: mrr.toFixed(2),
            newPatientsCount,
            newPsychologistsCount,
            questionnairesTodayCount,
            waitingListCount, // Usado para o alerta de "Verificações Pendentes"
            pendingReviewsCount
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas do dashboard:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

/**
 * Rota: GET /api/admin/psychologists
 * Descrição: Busca todos os psicólogos para a página de gerenciamento.
 */
exports.getAllPsychologists = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const { search, status, plano } = req.query;

        const whereClause = {};

        if (search) {
            whereClause[Op.or] = [
                { nome: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
                { crp: { [Op.iLike]: `%${search}%` } }
            ];
        }
        if (status) {
            whereClause.status = status;
        }
        if (plano) {
            whereClause.plano = plano;
        }

        const { count, rows } = await db.Psychologist.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            attributes: { exclude: ['senha', 'resetPasswordToken', 'resetPasswordExpires'] },
            order: [['createdAt', 'DESC']]
        });

        const totalPages = Math.ceil(count / limit);

        res.status(200).json({
            data: rows,
            totalPages,
            currentPage: page,
            totalCount: count
        });
    } catch (error) {
        console.error('Erro ao buscar lista de psicólogos:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

/**
 * Rota: GET /api/admin/patients
 * Descrição: Busca todos os pacientes para a página de gerenciamento.
 */
exports.getAllPatients = async (req, res) => {
    try {
        const patients = await db.Patient.findAll({
            attributes: { exclude: ['senha', 'resetPasswordToken', 'resetPasswordExpires'] },
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(patients);
    } catch (error) {
        console.error('Erro ao buscar lista de pacientes:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

/**
 * Rota: GET /api/admin/reviews
 * Descrição: Busca todas as avaliações para a página de gestão de conteúdo.
 */
exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await db.Review.findAll({
            include: [
                { model: db.Patient, as: 'patient', attributes: ['nome'] },
                { model: db.Psychologist, as: 'psychologist', attributes: ['nome'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(reviews);
    } catch (error) {
        console.error('Erro ao buscar lista de avaliações:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

/**
 * Rota: GET /api/admin/logs
 * Descrição: Busca os logs do sistema.
 */
exports.getSystemLogs = async (req, res) => {
    try {
        // Em um sistema real, isso leria de um arquivo ou serviço de log.
        // Aqui, vamos simular buscando de uma tabela de log.
        const logs = await db.SystemLog.findAll({
            limit: 100, // Limita aos 100 logs mais recentes
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(logs);
    } catch (error) {
        console.error('Erro ao buscar logs do sistema:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

/**
 * Rota: GET /api/admin/messages
 * Descrição: Busca todas as mensagens para a caixa de entrada do admin.
 */
exports.getAllMessages = async (req, res) => {
    try {
        const messages = await db.Message.findAll({
            include: [
                { model: db.Patient, as: 'senderPatient', attributes: ['nome', 'id'] },
                { model: db.Psychologist, as: 'senderPsychologist', attributes: ['nome', 'id'] },
                { model: db.Patient, as: 'recipientPatient', attributes: ['nome', 'id'] },
                { model: db.Psychologist, as: 'recipientPsychologist', attributes: ['nome', 'id'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 200 // Limita às 200 mensagens mais recentes
        });
        res.status(200).json(messages);
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

/**
 * Rota: POST /api/admin/broadcast
 * Descrição: Envia uma mensagem em massa para todos os psicólogos ou pacientes.
 */
exports.sendBroadcastMessage = async (req, res) => {
    try {
        const { target, content } = req.body;
        const adminId = req.psychologist.id;

        if (!target || !content) {
            return res.status(400).json({ error: 'Público-alvo e conteúdo são obrigatórios.' });
        }

        let recipients;
        let recipientType;

        if (target.startsWith('psychologists')) {
            const whereClause = { id: { [Op.ne]: adminId } }; // Exclui o próprio admin

            // Verifica se é um alvo específico de plano
            if (target.includes('-')) {
                const plan = target.split('-')[1]; // Ex: 'psychologists-Semente' -> 'Semente'
                whereClause.plano = plan;
            }
            // Se for apenas 'psychologists', o whereClause não terá filtro de plano, pegando todos.

            recipients = await db.Psychologist.findAll({ where: whereClause });
            recipientType = 'psychologist';
        } else if (target === 'patients') {
            recipients = await db.Patient.findAll();
            recipientType = 'patient';
        } else {
            return res.status(400).json({ error: 'Público-alvo inválido.' });
        }

        if (recipients.length === 0) {
            return res.status(200).json({ message: 'Nenhum destinatário encontrado para este público-alvo.' });
        }

        // Para cada destinatário, encontra ou cria uma conversa e envia a mensagem.
        // Em um app de produção, isso seria uma tarefa em background (background job).
        for (const recipient of recipients) {
            const [conversation] = await db.Conversation.findOrCreate({
                where: {
                    [Op.or]: [
                        { psychologistId: adminId, patientId: recipient.id },
                        { psychologistId: recipient.id, patientId: adminId } // Caso o admin envie para outro psicólogo
                    ]
                },
                defaults: {
                    psychologistId: recipientType === 'psychologist' ? recipient.id : adminId,
                    patientId: recipientType === 'patient' ? recipient.id : null
                }
            });

            await db.Message.create({
                conversationId: conversation.id,
                senderId: adminId,
                senderType: 'psychologist', // Admin é um tipo de psicólogo
                recipientId: recipient.id,
                recipientType: recipientType,
                content: content
            });
        }

        res.status(200).json({ message: `Mensagem enviada para ${recipients.length} destinatários.` });
    } catch (error) {
        console.error('Erro ao enviar mensagem em massa:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao enviar a mensagem.' });
    }
};

/**
 * Rota: POST /api/admin/reply
 * Descrição: Envia uma resposta do admin para uma conversa específica.
 */
exports.sendReply = async (req, res) => {
    try {
        const { recipientId, recipientType, content } = req.body;
        const adminId = req.psychologist.id;

        if (!recipientId || !recipientType || !content) {
            return res.status(400).json({ error: 'Destinatário e conteúdo são obrigatórios.' });
        }

        // Encontra ou cria a conversa entre o admin e o destinatário
        const [conversation] = await db.Conversation.findOrCreate({
            where: {
                [Op.or]: [
                    { psychologistId: adminId, patientId: recipientId },
                    { psychologistId: recipientId, patientId: adminId }
                ]
            },
            defaults: {
                psychologistId: recipientType === 'psychologist' ? recipientId : adminId,
                patientId: recipientType === 'patient' ? recipientId : null
            }
        });

        const message = await db.Message.create({
            conversationId: conversation.id,
            senderId: adminId,
            senderType: 'psychologist',
            recipientId: recipientId,
            recipientType: recipientType,
            content: content
        });

        res.status(201).json(message);
    } catch (error) {
        console.error('Erro ao enviar resposta do admin:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

/**
 * Rota: DELETE /api/admin/conversations/:id
 * Descrição: Deleta uma conversa e todas as suas mensagens.
 */
exports.deleteConversation = async (req, res) => {
    try {
        const { id } = req.params;

        const conversation = await db.Conversation.findByPk(id);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversa não encontrada.' });
        }

        // A associação com `onDelete: 'CASCADE'` no modelo de Mensagem cuidará de apagar as mensagens.
        await conversation.destroy();

        res.status(200).json({ message: 'Conversa excluída com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar conversa:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};