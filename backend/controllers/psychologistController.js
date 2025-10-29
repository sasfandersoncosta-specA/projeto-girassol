const db = require('../models');
const bcrypt = require('bcryptjs');

// ----------------------------------------------------------------------
// Rota: POST /api/psychologists/register
// ----------------------------------------------------------------------
exports.registerPsychologist = async (req, res) => {
    try {
        // Pega os dados do corpo da requisição (o JSON)
        const { nome, crp, email, senha, abordagem, especialidades, cidade, online } = req.body;

        // 1. Validação simples
        if (!nome || !crp || !email || !senha || !abordagem) {
            return res.status(400).json({ error: 'Nome, CRP, email, senha e abordagem são obrigatórios.' });
        }

        // 2. Verifica se o email ou CRP já existem no banco
        const existingPsychologist = await db.Psychologist.findOne({ 
            where: { [db.Sequelize.Op.or]: [{ email: email }, { crp: crp }] }
        });

        if (existingPsychologist) {
            return res.status(409).json({ error: 'Este email ou CRP já está cadastrado.' });
        }

        // 3. Hashear a senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senha, salt);

        // 4. Cria o novo profissional no banco de dados
        const newPsychologist = await db.Psychologist.create({
            nome,
            crp,
            email,
            senha: hashedPassword, // Salva a senha hasheada
            abordagem,
            especialidades: especialidades || null, // Permite null se não for fornecido
            cidade: cidade || null,
            online: online !== undefined ? online : false // Garante que seja false se não for fornecido
        });

        // 5. Responde com sucesso (Status 201 = "Criado")
        res.status(201).json({
            id: newPsychologist.id,
            nome: newPsychologist.nome,
            crp: newPsychologist.crp,
            email: newPsychologist.email,
            message: 'Profissional cadastrado com sucesso!'
        });

    } catch (error) {
        // Erro interno do servidor (ex: falha na conexão com o banco)
        console.error('Erro ao registrar profissional:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/
// ----------------------------------------------------------------------
exports.listPsychologists = async (req, res) => {
    try {
        // Busca todos os profissionais no banco de dados
        const psychologists = await db.Psychologist.findAll({
            // Exclui a senha por segurança antes de enviar para o frontend
            attributes: { exclude: ['senha', 'createdAt', 'updatedAt'] }
        });

        // Retorna a lista de profissionais
        res.status(200).json(psychologists);

    } catch (error) {
        console.error('Erro ao listar profissionais:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao listar profissionais.' });
    }
};

// Futuramente: exports.loginPsychologist, exports.getPsychologistProfile, etc