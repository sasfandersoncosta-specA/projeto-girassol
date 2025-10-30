const db = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ----------------------------------------------------------------------
// Função Auxiliar: Gera o Token JWT
// ----------------------------------------------------------------------
const generateToken = (id) => {
    // Assina o token com o ID do paciente e o segredo do .env
    return jwt.sign({ id, type: 'patient' }, process.env.JWT_SECRET, {
        expiresIn: '30d', // O token expira em 30 dias
    });
};

// ----------------------------------------------------------------------
// Rota: POST /api/patients/register
// ----------------------------------------------------------------------
exports.registerPatient = async (req, res) => {
    try {
        // 1. Simplificado para receber apenas os dados do formulário de registro
        const { nome_completo, email, senha } = req.body;

        if (!nome_completo || !email || !senha) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
        }

        const existingPatient = await db.Patient.findOne({ where: { email: email } });
        if (existingPatient) {
            return res.status(409).json({ error: 'Este email já está cadastrado.' });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);

        const newPatient = await db.Patient.create({
            nome: nome_completo,
            email,
            senha: hashedPassword,
            // Os outros campos serão preenchidos pela rota de respostas do questionário
        });

        res.status(201).json({
            id: newPatient.id,
            nome_completo: newPatient.nome, // Retorna 'nome_completo'
            email: newPatient.email,
            token: generateToken(newPatient.id), // Envia o token no registro
            message: 'Paciente cadastrado com sucesso!',
        });

    } catch (error) {
        console.error('Erro ao registrar paciente:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: PUT /api/patients/answers (Rota Protegida)
// DESCRIÇÃO: Salva ou atualiza as respostas do questionário para o paciente logado.
// ----------------------------------------------------------------------
exports.updatePatientAnswers = async (req, res) => {
    try {
        // O middleware de autenticação já nos deu o paciente em `req.patient`
        const patient = req.patient;

        if (!patient) {
            return res.status(404).json({ error: 'Paciente não encontrado ou não autenticado.' });
        }

        // 2. Pega os dados do corpo da requisição (vindos do questionario.js)
        const {
            telefone,
            valor_sessao_faixa,
            temas_buscados,
            abordagem_desejada,
            genero_profissional,
            praticas_afirmativas,
            disponibilidade_periodo
        } = req.body;

        // 3. Atualiza os campos do paciente no banco de dados
        await patient.update({
            telefone: telefone || patient.telefone,
            valor_sessao_faixa: valor_sessao_faixa || patient.valor_sessao_faixa,
            temas_buscados: temas_buscados || patient.temas_buscados,
            abordagem_desejada: abordagem_desejada || patient.abordagem_desejada,
            genero_profissional: genero_profissional || patient.genero_profissional,
            praticas_afirmativas: praticas_afirmativas || patient.praticas_afirmativas,
            disponibilidade_periodo: disponibilidade_periodo || patient.disponibilidade_periodo,
        });

        res.status(200).json({ message: 'Respostas do questionário salvas com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar respostas do paciente:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao salvar respostas.' });
    }
};

// ----------------------------------------------------------------------
// Rota: POST /api/patients/login
// ----------------------------------------------------------------------
exports.loginPatient = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
        }

        const patient = await db.Patient.findOne({ where: { email: email } });

        if (patient && (await bcrypt.compare(senha, patient.senha))) {
            res.status(200).json({
                id: patient.id,
                nome_completo: patient.nome, // Envia a coluna 'nome' como 'nome_completo'
                email: patient.email,
                token: generateToken(patient.id) 
            });
        } else {
            res.status(401).json({ error: 'Email ou senha inválidos.' });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/patients/me (Rota Protegida)
// ----------------------------------------------------------------------
exports.getPatientData = async (req, res) => {
    try {
        if (req.patient) {
            const patientData = {
                id: req.patient.id,
                nome_completo: req.patient.nome, // Envia a coluna 'nome' como 'nome_completo'
                email: req.patient.email,
                telefone: req.patient.telefone,
                valor_sessao_faixa: req.patient.valor_sessao_faixa,
                temas_buscados: req.patient.temas_buscados,
                abordagem_desejada: req.patient.abordagem_desejada,
                genero_profissional: req.patient.genero_profissional,
                praticas_afirmativas: req.patient.praticas_afirmativas,
                disponibilidade_periodo: req.patient.disponibilidade_periodo
            };
            res.status(200).json(patientData);
        } else {
            res.status(404).json({ error: 'Paciente não encontrado.' });
        }
    } catch (error) {
        console.error('Erro ao buscar dados do paciente:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/patients/me/reviews (Rota Protegida)
// DESCRIÇÃO: Busca todas as avaliações feitas pelo paciente logado.
// ----------------------------------------------------------------------
exports.getPatientReviews = async (req, res) => {
    try {
        const patientId = req.patient.id;

        const reviews = await db.Review.findAll({
            where: { patientId },
            // Inclui os dados do psicólogo que foi avaliado
            include: [{
                model: db.Psychologist,
                as: 'psychologist',
                attributes: ['nome', 'crp', 'fotoUrl'] // Pega apenas os dados necessários
            }],
            order: [['createdAt', 'DESC']] // Ordena da mais recente para a mais antiga
        });

        res.status(200).json(reviews);

    } catch (error) {
        console.error('Erro ao buscar avaliações do paciente:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: POST /api/patients/me/favorites (Rota Protegida)
// DESCRIÇÃO: Adiciona ou remove um psicólogo dos favoritos do paciente.
// ----------------------------------------------------------------------
exports.toggleFavorite = async (req, res) => {
    try {
        const patient = req.patient;
        const { psychologistId } = req.body;

        if (!psychologistId) {
            return res.status(400).json({ error: 'ID do psicólogo é obrigatório.' });
        }

        const psychologist = await db.Psychologist.findByPk(psychologistId);
        if (!psychologist) {
            return res.status(404).json({ error: 'Psicólogo não encontrado.' });
        }

        // O Sequelize nos dá métodos mágicos como `hasPsychologist` e `removePsychologist`
        const isFavorited = await patient.hasFavorite(psychologist);

        if (isFavorited) {
            await patient.removeFavorite(psychologist);
            res.status(200).json({ message: 'Profissional removido dos favoritos.', favorited: false });
        } else {
            await patient.addFavorite(psychologist);
            res.status(200).json({ message: 'Profissional adicionado aos favoritos.', favorited: true });
        }

    } catch (error) {
        console.error('Erro ao alternar favorito:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/patients/me/favorites (Rota Protegida)
// DESCRIÇÃO: Busca a lista de psicólogos favoritos do paciente logado.
// ----------------------------------------------------------------------
exports.getFavorites = async (req, res) => {
    try {
        const patient = req.patient;
        const favorites = await patient.getFavorites({ attributes: { exclude: ['senha'] } });
        res.status(200).json(favorites);
    } catch (error) {
        console.error('Erro ao buscar favoritos:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: PUT /api/patients/me (Rota Protegida)
// DESCRIÇÃO: Atualiza os dados pessoais (nome, email) do paciente logado.
// ----------------------------------------------------------------------
exports.updatePatientDetails = async (req, res) => {
    try {
        const patient = req.patient;
        const { nome_completo, email } = req.body;

        if (!nome_completo || !email) {
            return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
        }

        // Verifica se o novo email já está em uso por outro usuário
        if (email.toLowerCase() !== patient.email.toLowerCase()) {
            const existingPatient = await db.Patient.findOne({ where: { email } });
            if (existingPatient) {
                return res.status(409).json({ error: 'Este email já está em uso por outra conta.' });
            }
        }

        patient.nome = nome_completo;
        patient.email = email;
        await patient.save();

        res.status(200).json({ message: 'Dados atualizados com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar dados do paciente:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: PUT /api/patients/me/password (Rota Protegida)
// DESCRIÇÃO: Atualiza a senha do paciente logado.
// ----------------------------------------------------------------------
exports.updatePatientPassword = async (req, res) => {
    try {
        const { senha_atual, nova_senha } = req.body;

        if (!senha_atual || !nova_senha) {
            return res.status(400).json({ error: 'Todos os campos de senha são obrigatórios.' });
        }

        // O middleware nos dá `req.patient` sem a senha. Precisamos buscar o usuário novamente.
        const patientWithPassword = await db.Patient.findByPk(req.patient.id);

        const isMatch = await bcrypt.compare(senha_atual, patientWithPassword.senha);
        if (!isMatch) {
            return res.status(401).json({ error: 'A senha atual está incorreta.' });
        }

        patientWithPassword.senha = await bcrypt.hash(nova_senha, 10);
        await patientWithPassword.save();

        res.status(200).json({ message: 'Senha alterada com sucesso!' });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: DELETE /api/patients/me (Rota Protegida)
// DESCRIÇÃO: Exclui a conta do paciente logado após confirmar a senha.
// ----------------------------------------------------------------------
exports.deletePatientAccount = async (req, res) => {
    try {
        const { senha } = req.body;

        if (!senha) {
            return res.status(400).json({ error: 'A senha é obrigatória para excluir a conta.' });
        }

        // Busca o paciente novamente para ter acesso ao hash da senha
        const patientWithPassword = await db.Patient.findByPk(req.patient.id);

        const isMatch = await bcrypt.compare(senha, patientWithPassword.senha);
        if (!isMatch) {
            return res.status(401).json({ error: 'Senha incorreta. A conta não foi excluída.' });
        }

        // Se a senha estiver correta, exclui o paciente
        await patientWithPassword.destroy();

        res.status(200).json({ message: 'Sua conta foi excluída com sucesso.' });

    } catch (error) {
        console.error('Erro ao excluir conta do paciente:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};