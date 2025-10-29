const db = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc Registrar um novo paciente
// @route POST /api/patients/register
// @access Público
exports.registerPatient = async (req, res) => {
    const { nome_completo, email, senha } = req.body;

    // 1. Verificar se todos os campos estão preenchidos
    if (!nome_completo || !email || !senha) {
        return res.status(400).json({ error: 'Por favor, preencha todos os campos.' });
    }

    try {
        // 2. Verificar se o paciente já existe
        const patientExists = await db.Patient.findOne({ where: { email } });

        if (patientExists) {
            return res.status(400).json({ error: 'Paciente já registrado.' });
        }

        // 3. Criptografar a senha (usando 10 rounds de salt)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senha, salt);

        // 4. Criar o novo paciente no banco
        const patient = await db.Patient.create({
            nome_completo,
            email,
            senha: hashedPassword, // Salva a senha criptografada
        });

        if (patient) {
            // Sucesso: Retorna o ID e o token
            res.status(201).json({
                id: patient.id,
                nome_completo: patient.nome_completo,
                token: generateToken(patient.id),
            });
        } else {
            // Erro na criação
            res.status(400).json({ error: 'Dados do paciente inválidos.' });
        }
    } catch (error) {
        console.error('Erro no registro do paciente:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};


// @desc Autenticar (logar) um paciente
// @route POST /api/patients/login
// @access Público
exports.loginPatient = async (req, res) => {
    const { email, senha } = req.body;

    // 1. Verificar se o paciente existe
    const patient = await db.Patient.findOne({ where: { email } });

    // 2. Verificar senha e existência
    if (patient && (await bcrypt.compare(senha, patient.senha))) {
        // Sucesso: Retorna o token
        res.json({
            id: patient.id,
            nome_completo: patient.nome_completo,
            email: patient.email,
            token: generateToken(patient.id),
        });
    } else {
        // Falha na autenticação
        res.status(401).json({ error: 'Email ou senha inválidos.' });
    }
};


// @desc Obter dados do paciente logado
// @route GET /api/patients/me
// @access Privado (Requer JWT/Token)
exports.getPatientData = async (req, res) => {
    // Graças ao Middleware 'protect', o objeto do paciente já está em req.patient
    // O Middleware já removeu a senha por segurança.
    const patient = req.patient; 

    // O status 200 OK e os dados do paciente são enviados.
    res.status(200).json({
        id: patient.id,
        nome_completo: patient.nome_completo,
        email: patient.email,
        // Você pode adicionar outros campos de dados aqui, como 'status'
    });
};


// Função utilitária para gerar o Token JWT
const generateToken = (id) => {
    // O JWT_SECRET é definido no seu arquivo .env
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', // Expira em 30 dias
    });
};
