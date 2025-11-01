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
        // Retorna também a fotoUrl, que é necessária no frontend
        const { id, nome, email, telefone, fotoUrl } = req.psychologist;
        res.status(200).json({ id, nome, email, telefone, fotoUrl });
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
 * Rota: PUT /api/admin/me/photo
 * Descrição: Atualiza a foto de perfil do administrador logado.
 * Requer middleware de upload (ex: multer) para lidar com req.file.
 */
exports.updateAdminPhoto = async (req, res) => {
    try {
        const adminUser = req.psychologist;

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo de imagem foi enviado.' });
        }

        // Em um ambiente de produção, você faria o upload para um serviço como S3.
        // Aqui, vamos simular salvando o caminho do arquivo localmente.
        // O caminho depende de como seu servidor estático está configurado.
        const fotoUrl = `/uploads/profiles/${req.file.filename}`;

        await adminUser.update({ fotoUrl });

        res.status(200).json({
            message: 'Foto de perfil atualizada com sucesso!',
            fotoUrl: fotoUrl // Retorna a nova URL para o frontend
        });
    } catch (error) {
        console.error('Erro ao atualizar foto do admin:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao processar a imagem.' });
    }
};

/**
 * Rota: PUT /api/admin/me/photo
 * Descrição: Atualiza a foto de perfil do administrador logado.
 * Requer middleware de upload (ex: multer) para lidar com req.file.
 */
exports.updateAdminPhoto = async (req, res) => {
    try {
        const adminUser = req.psychologist;

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo de imagem foi enviado.' });
        }

        // Em um ambiente de produção, você faria o upload para um serviço como S3.
        // Aqui, vamos simular salvando o caminho do arquivo localmente.
        // O caminho depende de como seu servidor estático está configurado.
        const fotoUrl = `/uploads/profiles/${req.file.filename}`;

        await adminUser.update({ fotoUrl });

        res.status(200).json({
            message: 'Foto de perfil atualizada com sucesso!',
            fotoUrl: fotoUrl // Retorna a nova URL para o frontend
        });
    } catch (error) {
        console.error('Erro ao atualizar foto do admin:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao processar a imagem.' });
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
            // Lógica de findOrCreate corrigida para lidar com conversas Psi-Psi
            const whereClause = {
                [Op.or]: [
                    { psychologistId: adminId, patientId: recipient.id },
                    { psychologistId: recipient.id, patientId: adminId }
                ]
            };
            
            // Se o destinatário for um psicólogo, o admin será o 'patientId' na conversa para evitar conflito de chave.
            // Esta é uma convenção para o modelo atual.
            const defaults = recipientType === 'psychologist' 
                ? { psychologistId: recipient.id, patientId: adminId }
                : { psychologistId: adminId, patientId: recipient.id };

            const [conversation] = await db.Conversation.findOrCreate({
                where: whereClause,
                defaults: defaults
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

/**
 * Rota: GET /api/admin/conversations
 * Descrição: Busca conversas paginadas para a caixa de entrada do admin.
 * Query Params: page, limit, view ('inbox' ou 'sent'), search.
 */
exports.getConversations = async (req, res) => {
    try {
        const adminId = req.psychologist.id;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 15;
        const offset = (page - 1) * limit;
        const { view = 'inbox', search = '' } = req.query;

        // 1. Encontra todas as conversas onde o admin é um dos participantes
        // A busca por nome será aplicada DEPOIS de identificar os participantes.
        // Isso simplifica a query e evita problemas com joins complexos.
        const { count, rows: conversations } = await db.Conversation.findAndCountAll({
            where: {
                [Op.or]: [
                    { psychologistId: adminId },
                    { patientId: adminId } // Embora admin seja psicólogo, é bom cobrir o caso de ser paciente de outro admin
                ]
            },
            limit,
            offset,
            order: [['updatedAt', 'DESC']],
            include: [ // Inclui os modelos para ter acesso aos dados
                { model: db.Patient, as: 'patient', attributes: ['id', 'nome', 'fotoUrl'] },
                { model: db.Psychologist, as: 'psychologist', attributes: ['id', 'nome', 'fotoUrl'] }
            ]
        });


        // Processa cada conversa para adicionar os detalhes necessários pelo front-end
        const formattedConversations = await Promise.all(
            conversations.map(async (convo) => {
                const otherParticipantRaw = convo.patientId === adminId ? convo.psychologist : (convo.patient || convo.psychologist);
                
                // Pula conversas inválidas (ex: admin com ele mesmo)
                if (!otherParticipantRaw || otherParticipantRaw.id === adminId) return null;

                const otherParticipant = {
                    id: otherParticipantRaw.id,
                    nome: otherParticipantRaw.nome,
                    fotoUrl: otherParticipantRaw.fotoUrl,
                    type: convo.patientId === adminId ? 'psychologist' : (convo.patient ? 'patient' : 'psychologist')
                };

                const lastMessage = await db.Message.findOne({
                    where: { conversationId: convo.id },
                    order: [['createdAt', 'DESC']]
                });

                const unreadCount = await db.Message.count({
                    where: {
                        conversationId: convo.id,
                        recipientId: adminId,
                        isRead: false
                    }
                });

                return {
                    // Adiciona o ID da conversa para uso futuro (ex: deletar)
                    id: convo.id, 
                    otherParticipant,
                    lastMessage: {
                        content: lastMessage?.content || 'Nenhuma mensagem.',
                        createdAt: lastMessage?.createdAt || convo.createdAt,
                        senderId: lastMessage?.senderId
                    },
                    unreadCount
                };
            })
        );
        
        // 2. Remove os nulos e aplica os filtros de 'search' e 'view' no array processado
        let finalConversations = formattedConversations.filter(Boolean);

        if (search) {
            finalConversations = finalConversations.filter(c => 
                c.otherParticipant.nome.toLowerCase().includes(search.toLowerCase())
            );
        }

        // 2.5 (NOVO) Se houver busca, encontra usuários que ainda não estão na lista de conversas
        if (search) {
            const existingParticipantIds = finalConversations.map(c => c.otherParticipant.id);
            
            const newPatients = await db.Patient.findAll({
                where: {
                    nome: { [Op.iLike]: `%${search}%` },
                    id: { [Op.notIn]: existingParticipantIds }
                },
                attributes: ['id', 'nome', 'fotoUrl'],
                limit: 5 // Limita para não sobrecarregar
            });

            const newPsychologists = await db.Psychologist.findAll({
                where: {
                    nome: { [Op.iLike]: `%${search}%` },
                    id: { [Op.notIn]: [...existingParticipantIds, adminId] } // Exclui também o próprio admin
                },
                attributes: ['id', 'nome', 'fotoUrl'],
                limit: 5
            });

            const formatNewContact = (user, type) => ({
                id: null, // Não há ID de conversa ainda
                isNew: true, // Flag para o frontend
                otherParticipant: {
                    id: user.id,
                    nome: user.nome,
                    fotoUrl: user.fotoUrl,
                    type: type
                },
                lastMessage: { content: 'Clique para iniciar uma nova conversa.' },
                unreadCount: 0
            });

            const newContacts = [
                ...newPatients.map(p => formatNewContact(p, 'patient')),
                ...newPsychologists.map(p => formatNewContact(p, 'psychologist'))
            ];
            finalConversations.unshift(...newContacts); // Adiciona novos contatos no topo da lista
        }

        if (view === 'sent') {
            // Filtra para mostrar apenas conversas onde a ÚLTIMA mensagem foi enviada pelo admin.
            finalConversations = finalConversations.filter(c => c.lastMessage.senderId === adminId);
        }

        // 3. Retorna a resposta paginada
        res.status(200).json({
            conversations: finalConversations,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });

    } catch (error) {
        console.error('Erro ao buscar conversas do admin:', error);
        res.status(500).json({ error: 'Falha ao buscar conversas.' });
    }
};