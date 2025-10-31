const db = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');

// ----------------------------------------------------------------------
// Função Auxiliar: Gera o Token JWT para Psicólogo
// ----------------------------------------------------------------------
const generateToken = (id) => {
    return jwt.sign({ id, type: 'psychologist' }, process.env.JWT_SECRET, {
        expiresIn: '30d', // O token expira em 30 dias
    });
};
// Helper function to parse price range string to min/max values
const parsePriceRange = (rangeString) => {
    if (!rangeString) return { min: 0, max: Infinity };
    if (rangeString === "Até R$ 50") return { min: 0, max: 50 };
    if (rangeString === "R$ 51 - R$ 90") return { min: 51, max: 90 };
    if (rangeString === "R$ 91 - R$ 150") return { min: 91, max: 150 };
    if (rangeString === "Acima de R$ 150") return { min: 151, max: Infinity };
    return { min: 0, max: Infinity }; // Default if not matched
};

// Helper function to map patient's affirmative practices to psychologist's practices_vivencias
const mapPatientPracticesToPsychologist = (patientPractices) => {
    if (!patientPractices || patientPractices.length === 0) return [];

    const mapping = {
        "Que faça parte da comunidade LGBTQIAPN+": "LGBTQIAPN+ friendly",
        "Que seja uma pessoa não-branca (racializada) / prática antirracista": "Antirracista",
        "Que tenha uma perspectiva feminista": "Feminista",
        "Que entenda de neurodiversidade (TDAH, Autismo, etc.)": "Neurodiversidade",
    };

    // Mapeia as preferências do paciente para os valores do psicólogo, ignorando "Indiferente"
    return patientPractices.map(p => mapping[p]).filter(p => p); // Filtra valores nulos ou indefinidos
};

// ----------------------------------------------------------------------
// Rota: POST /api/psychologists/register
// DESCRIÇÃO: Registra um novo psicólogo.
// ----------------------------------------------------------------------
exports.registerPsychologist = async (req, res) => {
    try {
        const { nome, email, senha, crp, invitationToken } = req.body;

        if (!nome || !email || !senha || !crp) {
            return res.status(400).json({ error: 'Nome, email, senha e CRP são obrigatórios.' });
        }

        // Validação do convite (APENAS se um token for fornecido)
        if (invitationToken) {
            const waitingListEntry = await db.WaitingList.findOne({
                where: {
                    invitationToken: invitationToken,
                    status: 'invited',
                    invitationExpiresAt: { [Op.gt]: new Date() } // Maior que a data atual
                }
            });

            if (!waitingListEntry) {
                return res.status(403).json({ error: 'Convite inválido ou expirado. Por favor, faça o pré-cadastro novamente.' });
            }
        } // Se não há token, é um registro direto (após triagem com vaga). O fluxo continua.

        // Verifica se o email já está cadastrado
        const existingEmail = await db.Psychologist.findOne({ where: { email: email } });
        if (existingEmail) {
            return res.status(409).json({ error: 'Este email já está cadastrado.' });
        }

        // Verifica se o CRP já está cadastrado
        const existingCrp = await db.Psychologist.findOne({ where: { crp: crp } });
        if (existingCrp) {
            return res.status(409).json({ error: 'Este CRP já está cadastrado.' });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);

        const newPsychologist = await db.Psychologist.create({
            nome,
            email,
            senha: hashedPassword,
            crp,
            // Os outros campos serão preenchidos posteriormente no perfil do psicólogo
        });

        // Se o registro foi bem-sucedido e veio de um convite, remove da lista de espera
        if (invitationToken) {
            await db.WaitingList.destroy({ where: { invitationToken: invitationToken } });
            console.log(`Profissional ${email} registrado via convite e removido da lista de espera.`);
        } else {
            // Lógica para registro direto (se houver)
        }

        res.status(201).json({
            id: newPsychologist.id,
            nome: newPsychologist.nome,
            email: newPsychologist.email,
            crp: newPsychologist.crp,
            token: generateToken(newPsychologist.id),
            message: 'Psicólogo cadastrado com sucesso!',
        });

    } catch (error) {
        console.error('Erro ao registrar psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: POST /api/psychologists/forgot-password
// DESCRIÇÃO: Inicia o processo de redefinição de senha para psicólogos.
// ----------------------------------------------------------------------
exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const psychologist = await db.Psychologist.findOne({ where: { email } });

        if (!psychologist) {
            return res.status(200).json({ message: 'Se um usuário com este e-mail existir, um link de redefinição foi enviado.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        psychologist.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        psychologist.resetPasswordExpires = Date.now() + 3600000; // 1 hora

        await psychologist.save();

        const resetLink = `http://127.0.0.1:5500/redefinir_senha.html?token=${resetToken}&type=psychologist`;
        await sendPasswordResetEmail(psychologist, resetLink);

        res.status(200).json({ message: 'Se um usuário com este e-mail existir, um link de redefinição foi enviado.' });

    } catch (error) {
        console.error('Erro ao solicitar redefinição de senha de psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: POST /api/psychologists/reset-password/:token
// DESCRIÇÃO: Efetivamente redefine a senha do psicólogo.
// ----------------------------------------------------------------------
exports.resetPassword = async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const psychologist = await db.Psychologist.findOne({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { [db.Sequelize.Op.gt]: Date.now() }
            }
        });

        if (!psychologist) {
            return res.status(400).json({ error: 'Token de redefinição inválido ou expirado.' });
        }

        psychologist.senha = await bcrypt.hash(req.body.senha, 10);
        psychologist.resetPasswordToken = null;
        psychologist.resetPasswordExpires = null;
        await psychologist.save();

        res.status(200).json({ message: 'Senha redefinida com sucesso!' });

    } catch (error) {
        console.error('Erro ao redefinir senha de psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: POST /api/psychologists/login
// DESCRIÇÃO: Autentica um psicólogo e retorna um token JWT.
// ----------------------------------------------------------------------
exports.loginPsychologist = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
        }

        const psychologist = await db.Psychologist.findOne({ where: { email: email } });

        if (psychologist && (await bcrypt.compare(senha, psychologist.senha))) {
            res.status(200).json({
                id: psychologist.id,
                nome: psychologist.nome,
                email: psychologist.email,
                token: generateToken(psychologist.id)
            });
        } else {
            res.status(401).json({ error: 'Email ou senha inválidos.' });
        }
    } catch (error) {
        console.error('Erro no login do psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};
// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/me (Rota Protegida)
// DESCRIÇÃO: Busca os dados do psicólogo logado.
// ----------------------------------------------------------------------
exports.getPsychologistData = async (req, res) => {
    try {
        // O middleware de autenticação já nos deu o psicólogo em `req.psychologist`
        if (req.psychologist) {
            // Retorna os dados do psicólogo (já sem a senha)
            res.status(200).json(req.psychologist);
        } else {
            res.status(404).json({ error: 'Psicólogo não encontrado.' });
        }
    } catch (error) {
        console.error('Erro ao buscar dados do psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: POST /api/psychologists/check-demand
// DESCRIÇÃO: Verifica se há demanda para o perfil do psicólogo.
// ----------------------------------------------------------------------
exports.checkDemand = async (req, res) => {    
    try {
        const { nome, email, crp, valor_sessao_faixa, temas_atuacao, praticas_afirmativas, abordagens_tecnicas } = req.body;

        // Validação básica dos dados recebidos
        if (!email || !crp || !valor_sessao_faixa || !temas_atuacao || !praticas_afirmativas) {
            return res.status(400).json({ error: 'Dados insuficientes para verificar a demanda.' });
        }

        // --- LÓGICA DO BOLSÃO DE DEMANDA (APRIMORADA) ---
        const LIQUIDITY_TARGET = 8; // Número-alvo de profissionais por nicho

        // Define o "bolsão" de demanda combinando os critérios.
        // A cláusula `where` irá procurar por psicólogos que correspondam a TODOS os critérios.
        const whereClause = {
            status: 'active', // Considera apenas psicólogos ativos
            valor_sessao_faixa: valor_sessao_faixa,
            temas_atuacao: {
                [Op.contains]: temas_atuacao // Psicólogo deve ter TODOS os temas informados
            },
            praticas_vivencias: { // CORRIGIDO: O nome do campo no modelo é 'praticas_vivencias'
                [Op.contains]: praticas_afirmativas // Psicólogo deve ter TODAS as práticas informadas
            }
        };

        // Conta quantos psicólogos ativos já existem com a mesma combinação de características.
        const count = await db.Psychologist.count({ where: whereClause });

        // Log para depuração: mostra a contagem e o alvo
        console.log(`[CHECK DEMAND] Nicho verificado. Profissionais ativos encontrados: ${count}. Alvo: ${LIQUIDITY_TARGET}.`);

        if (count < LIQUIDITY_TARGET) {
            // Status: Aprovado
            res.status(200).json({ status: 'approved', message: 'Há demanda para este perfil.' });
        } else {
            // Status: Lista de Espera
            // Salva os dados do pré-cadastro na tabela WaitlistedProfiles (ou WaitingList)
            await db.WaitingList.findOrCreate({
                where: { email }, // Usar e-mail como chave única é mais seguro
                defaults: { 
                    nome, 
                    email, 
                    crp, 
                    valor_sessao_faixa, 
                    temas_atuacao, 
                    praticas_afirmativas, // O campo no modelo é 'praticas_afirmativas'
                    abordagens_tecnicas, 
                    status: 'pending' 
                }
            });
            res.status(200).json({ status: 'waitlisted', message: 'Perfil adicionado à lista de espera.' });
        }
    } catch (error) {
        console.error('Erro ao verificar demanda:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/waiting-list (Rota Protegida)
// DESCRIÇÃO: Retorna todos os profissionais na lista de espera.
// ----------------------------------------------------------------------
exports.getWaitingList = async (req, res) => {
    try {
        // Em um app real, você validaria se req.psychologist é um admin.
        // Por enquanto, qualquer psicólogo logado pode ver.
        const waitingList = await db.WaitingList.findAll({
            order: [['createdAt', 'DESC']] // Ordena pelos mais recentes primeiro
        });
        res.status(200).json(waitingList);
    } catch (error) {
        console.error('Erro ao buscar lista de espera:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};


// ----------------------------------------------------------------------
// Rota: PUT /api/psychologists/me (Rota Protegida)
// DESCRIÇÃO: Atualiza os dados do perfil do psicólogo logado.
// ----------------------------------------------------------------------
exports.updatePsychologistProfile = async (req, res) => {
    try {
        const psychologist = req.psychologist;

        if (!psychologist) {
            return res.status(404).json({ error: 'Psicólogo não encontrado ou não autenticado.' });
        }

        const {
            nome, email, crp, telefone, bio, fotoUrl,
            valor_sessao_numero, temas_atuacao, abordagens_tecnicas,
            genero_identidade, praticas_vivencias, disponibilidade_periodo
        } = req.body;

        // Validações básicas (pode ser expandido com Joi/Yup)
        if (!nome || !email || !crp) {
            return res.status(400).json({ error: 'Nome, email e CRP são obrigatórios.' });
        }

        // Verifica se o novo email já está em uso por outro psicólogo
        if (email.toLowerCase() !== psychologist.email.toLowerCase()) {
            const existingEmail = await db.Psychologist.findOne({ where: { email } });
            if (existingEmail) {
                return res.status(409).json({ error: 'Este email já está em uso por outra conta.' });
            }
        }

        await psychologist.update({
            nome, email, crp, telefone, bio, fotoUrl,
            valor_sessao_numero, temas_atuacao, abordagens_tecnicas,
            genero_identidade, praticas_vivencias, disponibilidade_periodo
        });

        res.status(200).json({ message: 'Perfil atualizado com sucesso!', psychologist });

    } catch (error) {
        console.error('Erro ao atualizar perfil do psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao atualizar perfil.' });
    }
};

// ----------------------------------------------------------------------
// Rota: PUT /api/psychologists/me/password (Rota Protegida)
// DESCRIÇÃO: Atualiza a senha do psicólogo logado.
// ----------------------------------------------------------------------
exports.updatePsychologistPassword = async (req, res) => {
    try {
        const { senha_atual, nova_senha } = req.body;

        if (!senha_atual || !nova_senha) {
            return res.status(400).json({ error: 'Todos os campos de senha são obrigatórios.' });
        }

        // O middleware nos dá `req.psychologist` sem a senha. Precisamos buscar o usuário novamente.
        const psychologistWithPassword = await db.Psychologist.findByPk(req.psychologist.id);

        const isMatch = await bcrypt.compare(senha_atual, psychologistWithPassword.senha);
        if (!isMatch) {
            return res.status(401).json({ error: 'A senha atual está incorreta.' });
        }

        psychologistWithPassword.senha = await bcrypt.hash(nova_senha, 10);
        await psychologistWithPassword.save();

        res.status(200).json({ message: 'Senha alterada com sucesso!' });
    } catch (error) {
        console.error('Erro ao alterar senha do psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: PUT /api/psychologists/me/complete-profile (Rota Protegida)
// DESCRIÇÃO: Completa o perfil de um psicólogo após login social.
// ----------------------------------------------------------------------
exports.completeSocialProfile = async (req, res) => {
    try {
        const psychologist = req.psychologist;

        if (!psychologist) {
            return res.status(404).json({ error: 'Psicólogo não encontrado ou não autenticado.' });
        }

        // Se o perfil já tem um CRP, não deveria estar nesta rota.
        if (psychologist.crp) {
            return res.status(400).json({ error: 'Este perfil já está completo.' });
        }

        const { crp, telefone } = req.body;

        if (!crp) {
            return res.status(400).json({ error: 'O número do CRP é obrigatório.' });
        }

        // Atualiza o perfil com os dados que faltavam
        await psychologist.update({
            crp,
            telefone,
            status: 'active' // Ativa o psicólogo na plataforma
        });

        res.status(200).json({ message: 'Perfil completado com sucesso!' });
    } catch (error) {
        console.error('Erro ao completar perfil do psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/me/unread-count (Rota Protegida)
// DESCRIÇÃO: Retorna a contagem de mensagens não lidas para o psicólogo.
// ----------------------------------------------------------------------
exports.getUnreadMessageCount = async (req, res) => {
    try {
        const psychologistId = req.psychologist.id;

        // LÓGICA REAL: Agora busca no banco de dados.
        const count = await db.Message.count({
            where: { 
                recipientId: psychologistId, 
                recipientType: 'psychologist',
                isRead: false 
            }
        });
        res.status(200).json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar contagem de mensagens.' });
    }
};

// ----------------------------------------------------------------------
// Rota: PUT /api/psychologists/me/photo (Rota Protegida)
// DESCRIÇÃO: Faz o upload de uma nova foto de perfil.
// ----------------------------------------------------------------------
exports.updateProfilePhoto = async (req, res) => {
    try {
        const psychologist = req.psychologist;

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo de imagem foi enviado.' });
        }

        // A URL da imagem no Cloudinary está em req.file.path
        const fotoUrl = req.file.path;

        await psychologist.update({ fotoUrl });

        res.status(200).json({
            message: 'Foto de perfil atualizada com sucesso!',
            fotoUrl: fotoUrl
        });

    } catch (error) {
        console.error('Erro ao fazer upload da foto:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao fazer upload da foto.' });
    }
};

// ----------------------------------------------------------------------
// Rota: DELETE /api/psychologists/me (Rota Protegida)
// DESCRIÇÃO: Exclui a conta do psicólogo logado após confirmar a senha.
// ----------------------------------------------------------------------
exports.deletePsychologistAccount = async (req, res) => {
    try {
        const { senha } = req.body;

        if (!senha) {
            return res.status(400).json({ error: 'A senha é obrigatória para excluir a conta.' });
        }

        // Busca o psicólogo novamente para ter acesso ao hash da senha
        const psychologistWithPassword = await db.Psychologist.findByPk(req.psychologist.id);

        const isMatch = await bcrypt.compare(senha, psychologistWithPassword.senha);
        if (!isMatch) {
            return res.status(401).json({ error: 'Senha incorreta. A conta não foi excluída.' });
        }

        // Se a senha estiver correta, exclui o psicólogo
        await psychologistWithPassword.destroy();

        res.status(200).json({ message: 'Sua conta foi excluída com sucesso.' });

    } catch (error) {
        console.error('Erro ao excluir conta do psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/matches (Rota Protegida)
// DESCRIÇÃO: Encontra psicólogos compatíveis com as preferências do paciente logado.
// ----------------------------------------------------------------------
exports.getPatientMatches = async (req, res) => {
    try {
        const patient = req.patient; // Patient object from authMiddleware

        if (!patient) {
            return res.status(401).json({ error: 'Paciente não autenticado.' });
        }

        // Retrieve patient's saved preferences from their profile
        const patientPreferences = {
            valor_sessao_faixa: patient.valor_sessao_faixa,
            temas_buscados: patient.temas_buscados || [],
            abordagem_desejada: patient.abordagem_desejada || [],
            genero_profissional: patient.genero_profissional,
            praticas_afirmativas: patient.praticas_afirmativas || [],
            // disponibilidade_periodo: patient.disponibilidade_periodo || [], // Adicionar se for usado
        };

        // If patient hasn't filled out the questionnaire yet
        if (!patientPreferences.valor_sessao_faixa && patientPreferences.temas_buscados.length === 0 && patientPreferences.abordagem_desejada.length === 0) {
            return res.status(200).json({
                message: 'Por favor, preencha o questionário para encontrar psicólogos compatíveis.',
                matchTier: 'none',
                results: []
            });
        }

        let psychologists = await db.Psychologist.findAll({
            attributes: { exclude: ['senha'] } // Exclude sensitive data
        });

        const matchedPsychologists = [];
        const nearMatchedPsychologists = [];
        let compromiseText = "";

        // Parse patient's preferred price range
        const { min: patientMinPrice, max: patientMaxPrice } = parsePriceRange(patientPreferences.valor_sessao_faixa);

        // Map patient's affirmative practices to psychologist's practices_vivencias
        const mappedPatientPractices = mapPatientPracticesToPsychologist(patientPreferences.praticas_afirmativas);

        psychologists.forEach(psy => {
            let score = 0;
            let matchDetails = [];

            // --- Gênero do Profissional ---
            if (patientPreferences.genero_profissional && patientPreferences.genero_profissional !== "Indiferente") {
                if (psy.genero_identidade === patientPreferences.genero_profissional) {
                    score += 10; // High score for exact gender match
                    matchDetails.push("Gênero do profissional");
                }
            } else {
                score += 5; // Neutral score if patient is indifferent
            }

            // --- Faixa de Valor ---
            if (psy.valor_sessao_numero >= patientMinPrice && psy.valor_sessao_numero <= patientMaxPrice) {
                score += 10; // High score for price match
                matchDetails.push("Faixa de valor");
            }

            // --- Temas Buscados ---
            if (patientPreferences.temas_buscados.length > 0 && psy.temas_atuacao && psy.temas_atuacao.length > 0) {
                const commonTemas = patientPreferences.temas_buscados.filter(tema => psy.temas_atuacao.includes(tema));
                score += commonTemas.length * 3; // Points for each matching theme
                if (commonTemas.length > 0) matchDetails.push("Temas de atuação");
            }

            // --- Abordagem Desejada ---
            if (patientPreferences.abordagem_desejada.length > 0 && psy.abordagens_tecnicas && psy.abordagens_tecnicas.length > 0) {
                const commonAbordagens = patientPreferences.abordagem_desejada.filter(abordagem => psy.abordagens_tecnicas.includes(abordagem));
                score += commonAbordagens.length * 3; // Points for each matching approach
                if (commonAbordagens.length > 0) matchDetails.push("Abordagem terapêutica");
            }

            // --- Práticas Afirmativas / Características do Profissional ---
            if (mappedPatientPractices.length > 0 && psy.praticas_vivencias && psy.praticas_vivencias.length > 0) {
                const commonPractices = mappedPatientPractices.filter(practice => psy.praticas_vivencias.includes(practice));
                score += commonPractices.length * 5; // Higher points for these specific characteristics
                if (commonPractices.length > 0) matchDetails.push("Práticas afirmativas");
            }

            // Store psychologist with their score and match details
            psy.dataValues.score = score;
            psy.dataValues.matchDetails = matchDetails;
        });

        // Sort psychologists by score in descending order
        psychologists.sort((a, b) => b.dataValues.score - a.dataValues.score);

        // Define thresholds for "ideal" and "near" matches
        const IDEAL_MATCH_THRESHOLD = 20; // Example threshold, adjust as needed
        const NEAR_MATCH_THRESHOLD = 10;  // Example threshold, adjust as needed

        // Filtra apenas psicólogos com alguma pontuação e os ordena
        const relevantPsychologists = psychologists.filter(psy => psy.dataValues.score > 0).sort((a, b) => b.dataValues.score - a.dataValues.score);

        // Filtra em matches ideais e próximos a partir da lista relevante
        const idealMatches = relevantPsychologists.filter(psy => psy.dataValues.score >= IDEAL_MATCH_THRESHOLD);
        const remainingPsychologists = relevantPsychologists.filter(psy => psy.dataValues.score < IDEAL_MATCH_THRESHOLD);

        if (idealMatches.length > 0) {
            matchedPsychologists.push(...idealMatches.slice(0, 3));
            return res.status(200).json({
                message: 'Psicólogos compatíveis encontrados!',
                matchTier: 'ideal',
                results: matchedPsychologists
            });
        }

        // If no ideal matches, look for near matches
        if (remainingPsychologists.length > 0) {
            const topNearMatches = remainingPsychologists.filter(psy => psy.dataValues.score >= NEAR_MATCH_THRESHOLD).slice(0, 3);
            if (topNearMatches.length > 0) {
                // Determine compromise text based on the highest scoring near match
                // This is a simplified way; a more complex logic could analyze what was *missed*
                compromiseText = "Estes profissionais se encaixam na maioria das suas preferências, mas podem ter uma pequena diferença em um dos critérios.";
                nearMatchedPsychologists.push(...topNearMatches);
                return res.status(200).json({
                    message: 'Psicólogos próximos encontrados!',
                    matchTier: 'near',
                    results: nearMatchedPsychologists,
                    compromiseText
                });
            }
        }

        // If no matches at all
        res.status(200).json({
            message: 'Nenhum psicólogo compatível encontrado no momento.',
            matchTier: 'none',
            results: []
        });

    } catch (error) {
        console.error('Erro ao encontrar psicólogos compatíveis:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao buscar psicólogos compatíveis.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/:id
// DESCRIÇÃO: Busca o perfil de um psicólogo específico.
// ----------------------------------------------------------------------
exports.getPsychologistProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const psychologist = await db.Psychologist.findByPk(id, {
            attributes: { exclude: ['senha'] },
            include: [{
                model: db.Review,
                as: 'reviews',
                attributes: ['rating', 'comment', 'createdAt'],
                include: [{
                    model: db.Patient,
                    as: 'patient',
                    attributes: ['nome']
                }]
            }]
        });

        if (!psychologist) {
            return res.status(404).json({ error: 'Psicólogo não encontrado.' });
        }

        // Calculate average rating and count
        const reviews = psychologist.reviews || [];
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const average_rating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : null;
        const review_count = reviews.length;

        const psychologistData = {
            ...psychologist.toJSON(),
            average_rating,
            review_count,
            reviews: undefined // Remove raw reviews if not needed directly in the main profile object
        };

        res.status(200).json(psychologistData);
    } catch (error) {
        console.error('Erro ao buscar perfil do psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/:id/reviews
// DESCRIÇÃO: Busca as avaliações de um psicólogo específico.
// ----------------------------------------------------------------------
exports.getPsychologistReviews = async (req, res) => {
    try {
        const { id } = req.params;
        const reviews = await db.Review.findAll({
            where: { psychologistId: id },
            include: [{
                model: db.Patient,
                as: 'patient',
                attributes: ['nome']
            }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(reviews);
    } catch (error) {
        console.error('Erro ao buscar avaliações do psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};