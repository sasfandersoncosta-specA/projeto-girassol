const db = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');
const { findMatches } = require('../services/matchService'); // Importa o novo serviço de match

// ----------------------------------------------------------------------
// Função Auxiliar: Gera o Token JWT para Psicólogo
// ----------------------------------------------------------------------
const generateToken = (id) => {
    return jwt.sign({ id, type: 'psychologist' }, process.env.JWT_SECRET, {
        expiresIn: '30d', // O token expira em 30 dias
    });
};

// Função Auxiliar: Gera um slug a partir de um nome
const generateSlug = (name) => {
    return name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres não alfanuméricos
        .replace(/\s+/g, '-');
};

// ----------------------------------------------------------------------
// Rota: POST /api/psychologists/register
// ----------------------------------------------------------------------
exports.registerPsychologist = async (req, res) => {
    try {
        const {
            nome, email, senha, crp, cpf,
            genero_identidade, valor_sessao_faixa, temas_atuacao,
            abordagens_tecnicas, praticas_vivencias, modalidade, cep
        } = req.body;

        // 1. Validação dos dados essenciais
        if (!nome || !email || !senha || !crp || !cpf) {
            return res.status(400).json({ error: 'Nome, email, senha, CRP e CPF são obrigatórios.' });
        }

        // 2. Verifica duplicidade usando o modelo correto: db.Psychologist
        const existingPsychologist = await db.Psychologist.findOne({
            where: { [Op.or]: [{ email }, { crp }, { cpf }] }
        });

        if (existingPsychologist) {
            if (existingPsychologist.email === email) {
                return res.status(409).json({ error: 'Este email já está cadastrado.' });
            }
            if (existingPsychologist.crp === crp) {
                return res.status(409).json({ error: 'Este CRP já está cadastrado.' });
            }
            if (existingPsychologist.cpf === cpf) {
                return res.status(409).json({ error: 'Este CPF já está cadastrado.' });
            }
        }

        // 3. Criptografa a senha
        const hashedPassword = await bcrypt.hash(senha, 10);

        // 4. Cria o novo psicólogo usando o modelo db.Psychologist
        const newPsychologist = await db.Psychologist.create({
            nome, email, crp, cpf,
            senha: hashedPassword,
            slug: generateSlug(nome),
            status: 'pending', // Status inicial para moderação do admin
            // Dados do questionário
            genero_identidade, valor_sessao_faixa, temas_atuacao: temas_atuacao || [],
            abordagens_tecnicas: abordagens_tecnicas ? [abordagens_tecnicas] : [],
            praticas_vivencias: praticas_vivencias || [], modalidade, cep,
        });

        // 5. Retorna sucesso
        res.status(201).json({ message: 'Psicólogo cadastrado com sucesso!', userId: newPsychologist.id });

    } catch (error) {
        console.error('Erro ao registrar psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: POST /api/psychologists/forgot-password
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

// Função auxiliar (você já a tem)
const parsePriceRange = (rangeString) => {
    if (!rangeString || typeof rangeString !== 'string') return { min: 0, max: 9999 };
    const numbers = rangeString.match(/\d+/g);
    if (!numbers || numbers.length === 0) return { min: 0, max: 9999 };
    const min = parseInt(numbers[0], 10);
    const max = numbers.length > 1 ? parseInt(numbers[1], 10) : min;
    return { min, max };
};

// ----------------------------------------------------------------------
// Rota: POST /api/psychologists/login
// ----------------------------------------------------------------------
exports.loginPsychologist = async (req, res) => {
    try {
        const { email, senha } = req.body;
        console.log(`[LOGIN_PSY] 1. Tentativa de login recebida para o e-mail: ${email}`);

        if (!email || !senha) {
            console.log(`[LOGIN_PSY] 2. Falha: E-mail ou senha não fornecidos na requisição.`);
            return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
        }

        const psychologist = await db.Psychologist.findOne({ where: { email: email } });

        if (!psychologist) {
            console.log(`[LOGIN_PSY] 2. Falha: Nenhum psicólogo encontrado com o e-mail ${email}.`);
            return res.status(401).json({ error: 'Email ou senha inválidos.' });
        }

        console.log(`[LOGIN_PSY] 2. Sucesso: Psicólogo ${email} encontrado. Comparando senhas...`);
        const isPasswordMatch = await bcrypt.compare(senha, psychologist.senha);

        if (isPasswordMatch) {
            console.log(`[LOGIN_PSY] 3. Sucesso: Senha correta para ${email}. Gerando token.`);
            res.status(200).json({
                id: psychologist.id,
                nome: psychologist.nome,
                email: psychologist.email,
                token: generateToken(psychologist.id)
            });
        } else {
            console.log(`[LOGIN_PSY] 3. Falha: Senha incorreta para o e-mail ${email}.`);
            res.status(401).json({ error: 'Email ou senha inválidos.' });
        }
    } catch (error) {
        console.error('Erro no login do psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/me (Rota Protegida)
// ----------------------------------------------------------------------
exports.getAuthenticatedPsychologistProfile = async (req, res) => {
    try {
        // 'req.psychologist' é anexado pelo seu middleware 'protect'
        if (!req.psychologist || !req.psychologist.id) {
            return res.status(401).json({ error: 'Psicólogo não autenticado.' });
        }

        const psychologistId = req.psychologist.id;

        const psychologist = await db.Psychologist.findByPk(psychologistId, {
            // Exclui campos sensíveis que o frontend não precisa ver
            attributes: { 
                exclude: ['senha', 'resetPasswordToken', 'resetPasswordExpires', 'cpf'] 
            }
        });

        if (!psychologist) {
            return res.status(404).json({ error: 'Perfil do psicólogo não encontrado.' });
        }

        res.status(200).json(psychologist);

    } catch (error) {
        console.error('Erro ao buscar perfil do psicólogo autenticado (/me):', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: POST /api/psychologists/check-demand
// ----------------------------------------------------------------------
exports.checkDemand = async (req, res) => {    
    try {
        const { nome, email, crp, genero_identidade, valor_sessao_faixa, temas_atuacao, praticas_afirmativas, abordagens_tecnicas } = req.body;

        // Validação básica dos dados recebidos
        if (!email || !crp || !genero_identidade || !valor_sessao_faixa || !temas_atuacao || !praticas_afirmativas) {
            return res.status(400).json({ error: 'Dados insuficientes para verificar a demanda.' });
        }

        // --- LÓGICA DE VERIFICAÇÃO DE DEMANDA (CORRIGIDA) ---
        const DEMAND_TARGET = 0; 
        const { min: psyMinPrice, max: psyMaxPrice } = parsePriceRange(valor_sessao_faixa);

        // 2. Define a cláusula para buscar PACIENTES compatíveis
        const whereClause = {
            valor_sessao_faixa: { [Op.ne]: null }, 
            temas_buscados: {
                [Op.overlap]: temas_atuacao
            },
            genero_profissional: {
                [Op.or]: [genero_identidade, 'Indiferente']
            }
        };

        // 3. Conta quantos pacientes existem com essas preferências
        const count = await db.Patient.count({ where: whereClause });

        console.log(`[CHECK DEMAND] Nicho verificado. Pacientes encontrados: ${count}. Alvo: ${DEMAND_TARGET}.`);

        if (count >= DEMAND_TARGET) {
            res.status(200).json({ status: 'approved', message: 'Há demanda para este perfil.' });
        } else {
            res.status(200).json({ status: 'waitlisted', message: 'Perfil adicionado à lista de espera.' });
        }
    } catch (error) {
        console.error('Erro ao verificar demanda:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: POST /api/psychologists/add-to-waitlist
// ----------------------------------------------------------------------
exports.addToWaitlist = async (req, res) => {
    try {
        const { nome, email, crp, genero_identidade, valor_sessao_faixa, temas_atuacao, praticas_afirmativas, abordagens_tecnicas } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'O e-mail é obrigatório para entrar na lista de espera.' });
        }

        const [waitlistEntry, created] = await db.WaitingList.findOrCreate({
            where: { email },
            defaults: {
                nome,
                email,
                crp,
                genero_identidade,
                valor_sessao_faixa,
                temas_atuacao,
                praticas_afirmativas,
                abordagens_tecnicas,
                status: 'pending'
            }
        });

        console.log(`[WAITLIST] E-mail ${email} ${created ? 'adicionado' : 'já estava'} na lista de espera.`);
        res.status(201).json({ message: 'E-mail adicionado à lista de espera com sucesso.' });
    } catch (error) {
        console.error('Erro ao adicionar à lista de espera:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao salvar na lista de espera.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/waiting-list (Rota Protegida)
// ----------------------------------------------------------------------
exports.getWaitingList = async (req, res) => {
    try {
        const waitingList = await db.WaitingList.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(waitingList);
    } catch (error) {
        console.error('Erro ao buscar lista de espera:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};


// ----------------------------------------------------------------------
// Rota: PUT /api/psychologists/me (Rota Protegida)
// ----------------------------------------------------------------------
exports.updatePsychologistProfile = async (req, res) => {
    try {        
        if (!req.psychologist || !req.psychologist.id) {
            return res.status(404).json({ error: 'Psicólogo não encontrado ou não autenticado.' });
        }

        const psychologistToUpdate = await db.Psychologist.findByPk(req.psychologist.id);
        if (!psychologistToUpdate) {
            return res.status(404).json({ error: 'Psicólogo não encontrado no banco de dados.' });
        }

        const {
            nome, email, crp, cpf, telefone, bio, fotoUrl,
            valor_sessao_numero, temas_atuacao, abordagens_tecnicas,
            genero_identidade, praticas_vivencias, disponibilidade_periodo
        } = req.body;

        if (!nome || !email || !crp) {
            return res.status(400).json({ error: 'Nome, email e CRP são obrigatórios.' });
        }

        if (email.toLowerCase() !== psychologistToUpdate.email.toLowerCase()) {
            const existingEmail = await db.Psychologist.findOne({ where: { email } });
            if (existingEmail) {
                return res.status(409).json({ error: 'Este email já está em uso por outra conta.' });
            }
        }

        if (cpf && cpf !== psychologistToUpdate.cpf) {
            const existingCpf = await db.Psychologist.findOne({ where: { cpf } });
            if (existingCpf) {
                return res.status(409).json({ error: 'Este CPF já está em uso por outra conta.' });
            }
        }

        const updatedPsychologist = await psychologistToUpdate.update({
            nome, email, crp, cpf, telefone, bio,
            valor_sessao_numero, temas_atuacao, abordagens_tecnicas,
            genero_identidade, praticas_vivencias, disponibilidade_periodo,
            slug: generateSlug(nome), 
            status: 'active' 
        });

        res.status(200).json({ message: 'Perfil atualizado com sucesso!', psychologist: updatedPsychologist });

    } catch (error) {
        console.error('Erro ao atualizar perfil do psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao atualizar perfil.' });
    }
};

// ----------------------------------------------------------------------
// Rota: POST /api/psychologists/waiting-list/invite
// ----------------------------------------------------------------------
exports.inviteFromWaitlist = async (req, res) => {
    try {
        const { waitingListId } = req.body;

        if (!waitingListId) {
            return res.status(400).json({ error: 'ID do candidato na lista de espera é obrigatório.' });
        }

        const candidate = await db.WaitingList.findOne({
            where: { id: waitingListId, status: 'pending' }
        });

        if (!candidate) {
            return res.status(404).json({ error: 'Candidato não encontrado ou já convidado.' });
        }

        const invitationToken = crypto.randomBytes(32).toString('hex');
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7); // Expira em 7 dias

        await candidate.update({
            status: 'invited',
            invitationToken: invitationToken,
            invitationExpiresAt: expirationDate,
        });

        const invitationLink = `http://127.0.0.1:5500/psi_registro.html?token=${invitationToken}&email=${candidate.email}`;
        await require('../services/emailService').sendInvitationEmail(candidate, invitationLink); // Placeholder

        res.status(200).json({ message: `Convite enviado com sucesso para ${candidate.email}.` });
    } catch (error) {
        console.error('Erro ao enviar convite manual:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: PUT /api/psychologists/me/password
// ----------------------------------------------------------------------
exports.updatePsychologistPassword = async (req, res) => {
    try {
        const { senha_atual, nova_senha } = req.body;

        if (!senha_atual || !nova_senha) {
            return res.status(400).json({ error: 'Todos os campos de senha são obrigatórios.' });
        }

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
// Rota: PUT /api/psychologists/me/complete-profile
// ----------------------------------------------------------------------
exports.completeSocialProfile = async (req, res) => {
    try {
        const psychologist = req.psychologist;

        if (!psychologist) {
            return res.status(404).json({ error: 'Psicólogo não encontrado ou não autenticado.' });
        }

        if (psychologist.crp) {
            return res.status(400).json({ error: 'Este perfil já está completo.' });
        }

        const { crp, telefone } = req.body;

        if (!crp) {
            return res.status(400).json({ error: 'O número do CRP é obrigatório.' });
        }

        await psychologist.update({
            crp,
            telefone,
            status: 'active' 
        });

        res.status(200).json({ message: 'Perfil completado com sucesso!' });
    } catch (error) {
        console.error('Erro ao completar perfil do psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/me/unread-count
// ----------------------------------------------------------------------
exports.getUnreadMessageCount = async (req, res) => {
    try {
        const psychologistId = req.psychologist.id;

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
// Rota: PUT /api/psychologists/me/photo
// ----------------------------------------------------------------------
exports.updateProfilePhoto = async (req, res) => {
    try {
        if (!req.psychologist || !req.psychologist.id) {
            return res.status(401).json({ error: 'Não autorizado, psicólogo não identificado.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo de imagem foi enviado.' });
        }

        const fotoUrl = req.file.path;
        const psychologistToUpdate = await db.Psychologist.findByPk(req.psychologist.id);

        if (!psychologistToUpdate) {
            return res.status(404).json({ error: 'Psicólogo não encontrado no banco de dados.' });
        }

        await psychologistToUpdate.update({ fotoUrl });

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
// Rota: DELETE /api/psychologists/me
// ----------------------------------------------------------------------
exports.deletePsychologistAccount = async (req, res) => {
    try {
        const { senha } = req.body;

        if (!senha) {
            return res.status(400).json({ error: 'A senha é obrigatória para excluir a conta.' });
        }

        const psychologistWithPassword = await db.Psychologist.findByPk(req.psychologist.id);

        const isMatch = await bcrypt.compare(senha, psychologistWithPassword.senha);
        if (!isMatch) {
            return res.status(401).json({ error: 'Senha incorreta. A conta não foi excluída.' });
        }

        await psychologistWithPassword.destroy();

        res.status(200).json({ message: 'Sua conta foi excluída com sucesso.' });

    } catch (error) {
        console.error('Erro ao excluir conta do psicólogo:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Função Auxiliar: Mapeia preferências do paciente
// ----------------------------------------------------------------------
const mapPatientPracticesToPsychologist = (patientPractices) => {
    if (!patientPractices) return [];
    const mapping = {
        "Que tenha uma perspectiva feminista": "Feminista",
        "Que faça parte da comunidade LGBTQIAPN+": "LGBTQIAPN+ friendly",
        "Que seja uma pessoa não-branca": "Antirracista"
    };
    return patientPractices
        .map(practice => mapping[practice])
        .filter(mapped => mapped); // Filtra valores indefinidos
};
// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/matches (Rota Protegida)
// ----------------------------------------------------------------------
exports.getPatientMatches = async (req, res) => {
    try {
        const patient = req.patient; 

        if (!patient) {
            return res.status(401).json({ error: 'Paciente não autenticado.' });
        }

        const patientPreferences = {
            valor_sessao_faixa: patient.valor_sessao_faixa,
            temas_buscados: patient.temas_buscados || [],
            abordagem_desejada: patient.abordagem_desejada || [],
            genero_profissional: patient.genero_profissional,
            praticas_afirmativas: patient.praticas_afirmativas || [],
        };

        if (!patientPreferences.valor_sessao_faixa && patientPreferences.temas_buscados.length === 0 && patientPreferences.abordagem_desejada.length === 0) {
            return res.status(200).json({
                message: 'Por favor, preencha o questionário para encontrar psicólogos compatíveis.',
                matchTier: 'none',
                results: []
            });
        }

        let psychologists = await db.Psychologist.findAll({
            attributes: { exclude: ['senha'] } 
        });

        const matchedPsychologists = [];
        const nearMatchedPsychologists = [];
        let compromiseText = "";

        const { min: patientMinPrice, max: patientMaxPrice } = parsePriceRange(patientPreferences.valor_sessao_faixa);
        const mappedPatientPractices = mapPatientPracticesToPsychologist(patientPreferences.praticas_afirmativas);

        psychologists.forEach(psy => {
            let score = 0;
            let matchDetails = [];

            // --- Gênero do Profissional ---
            if (patientPreferences.genero_profissional && patientPreferences.genero_profissional !== "Indiferente") {
                if (psy.genero_identidade === patientPreferences.genero_profissional) {
                    score += 10; 
                    matchDetails.push("Gênero do profissional");
                }
            } else {
                score += 5; 
            }

            // --- Faixa de Valor ---
            if (psy.valor_sessao_numero >= patientMinPrice && psy.valor_sessao_numero <= patientMaxPrice) {
                score += 10; 
                matchDetails.push("Faixa de valor");
            }

            // --- Temas Buscados ---
            if (patientPreferences.temas_buscados.length > 0 && psy.temas_atuacao && psy.temas_atuacao.length > 0) {
                const commonTemas = patientPreferences.temas_buscados.filter(tema => psy.temas_atuacao.includes(tema));
                score += commonTemas.length * 3; 
                if (commonTemas.length > 0) matchDetails.push("Temas de atuação");
            }

            // --- Abordagem Desejada ---
            if (patientPreferences.abordagem_desejada.length > 0 && psy.abordagens_tecnicas && psy.abordagens_tecnicas.length > 0) {
                const commonAbordagens = patientPreferences.abordagem_desejada.filter(abordagem => psy.abordagens_tecnicas.includes(abordagem));
                score += commonAbordagens.length * 3; 
                if (commonAbordagens.length > 0) matchDetails.push("Abordagem terapêutica");
            }

            // --- Práticas Afirmativas / Características do Profissional ---
            if (mappedPatientPractices.length > 0 && psy.praticas_vivencias && psy.praticas_vivencias.length > 0) {
                const commonPractices = mappedPatientPractices.filter(practice => psy.praticas_vivencias.includes(practice));
                score += commonPractices.length * 5; 
                if (commonPractices.length > 0) matchDetails.push("Práticas afirmativas");
            }

            psy.dataValues.score = score;
            psy.dataValues.matchDetails = matchDetails;
        });

        psychologists.sort((a, b) => b.dataValues.score - a.dataValues.score);

s       const IDEAL_MATCH_THRESHOLD = 20; 
        const NEAR_MATCH_THRESHOLD = 10;  

        const relevantPsychologists = psychologists.filter(psy => psy.dataValues.score > 0).sort((a, b) => b.dataValues.score - a.dataValues.score);

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

        if (remainingPsychologists.length > 0) {
            const topNearMatches = remainingPsychologists.filter(psy => psy.dataValues.score >= NEAR_MATCH_THRESHOLD).slice(0, 3);
            if (topNearMatches.length > 0) {
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
// Rota: POST /api/psychologists/match (Endpoint Público)
// ----------------------------------------------------------------------
exports.getAnonymousMatches = async (req, res) => {
    try {
        const patientAnswers = req.body;

        if (!patientAnswers || !patientAnswers.faixa_valor || !patientAnswers.temas) {
            return res.status(400).json({ error: 'Dados do questionário insuficientes para realizar o match.' });
        }

        const patientPreferences = {
            valor_sessao_faixa: patientAnswers.faixa_valor,
            temas_buscados: patientAnswers.temas || [],
            abordagem_desejada: patientAnswers.experiencia_desejada || [],
            genero_profissional: patientAnswers.pref_genero_prof,
            praticas_afirmativas: patientAnswers.caracteristicas_prof || [],
        };

        const matchResult = await findMatches(patientPreferences);

        res.status(200).json(matchResult);

    } catch (error) {
        console.error('Erro ao processar match anônimo:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao buscar recomendações.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/showcase
// ----------------------------------------------------------------------
exports.getShowcasePsychologists = async (req, res) => {
    try {
        const psychologists = await db.Psychologist.findAll({
            where: {
                status: 'active',
                fotoUrl: { [Op.ne]: null } 
            },
            order: db.sequelize.random(), 
            limit: 4, 
            attributes: ['id', 'nome', 'fotoUrl'] 
        });

        while (psychologists.length < 4) {
            psychologists.push({
                id: 0,
                nome: "Em breve",
                fotoUrl: "https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
            });
        }

        res.status(200).json(psychologists);
    } catch (error) {
  S     console.error('Erro ao buscar psicólogos para vitrine:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/slug/:slug (NOVA ROTA)
// ----------------------------------------------------------------------
exports.getProfileBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const psychologist = await db.Psychologist.findOne({
            where: { slug, status: 'active' }, // GARANTE QUE APENAS PERFIS ATIVOS SEJAM PÚBLICOS
            attributes: { exclude: ['senha', 'resetPasswordToken', 'resetPasswordExpires', 'cpf'] },
        });

        if (psychologist) {
            // Busca as avaliações separadamente para incluir no resultado
            const reviews = await db.Review.findAll({
                where: { psychologistId: psychologist.id, status: 'approved' }, // Apenas avaliações aprovadas
                include: [{
                    model: db.Patient,
                    as: 'patient',
                    attributes: ['nome']
                }],
                order: [['createdAt', 'DESC']]
            });

            // Calcula a média das avaliações
            const reviewCount = reviews.length;
            const averageRating = reviewCount > 0
                ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
                : 0;

            // Adiciona os dados calculados ao objeto de resposta
            const responseData = psychologist.toJSON();
            responseData.review_count = reviewCount;
            responseData.average_rating = parseFloat(averageRating.toFixed(1));
            responseData.reviews = reviews; // Adiciona as avaliações ao objeto de resposta

            res.status(200).json(responseData);
        } else {
            res.status(404).json({ error: 'Perfil não encontrado.' });
        }
    } catch (error) {
        console.error('Erro ao buscar perfil por slug:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
  s }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/:id
// ----------------------------------------------------------------------
exports.getPsychologistProfileById = async (req, res) => {
    try {
        const { id } = req.params;
        const psychologist = await db.Psychologist.findByPk(id, {
            attributes: { exclude: ['senha', 'resetPasswordToken', 'resetPasswordExpires', 'cpf'] }
        });
        if (psychologist) {
            res.status(200).json(psychologist);
        } else {
            res.status(404).json({ error: 'Perfil não encontrado.' });
        }
    } catch (error) {
        console.error('Erro ao buscar perfil por ID:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: PUT /api/psychologists/me/crp-document
// ----------------------------------------------------------------------
exports.uploadCrpDocument = async (req, res) => {
    try {
        if (!req.psychologist || !req.psychologist.id) {
            return res.status(401).json({ error: 'Não autorizado, psicólogo não identificado.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
        }

        const psychologistToUpdate = await db.Psychologist.findByPk(req.psychologist.id);

        const crpDocumentUrl = req.file.path;

        await psychologistToUpdate.update({
            crpDocumentUrl: crpDocumentUrl,
            status: 'pending' 
        });

        res.status(200).json({
            message: 'Documento enviado com sucesso!',
        });
    } catch (error) {
        console.error('Erro no upload do documento CRP:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao processar o arquivo.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/:id/reviews
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
s       res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};