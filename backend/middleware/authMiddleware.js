// backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const db = require('../models');

// O Middleware de proteção principal
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Extrai o token do cabeçalho (formato "Bearer TOKEN")
            token = req.headers.authorization.split(' ')[1];

            // 2. Verifica e decodifica o token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Anexa o usuário à requisição com base no tipo
            if (decoded.type === 'patient') {
                // Busca o paciente pelo ID do token, excluindo a senha
                req.patient = await db.Patient.findByPk(decoded.id, {
                    attributes: { exclude: ['senha'] }
                });
            } else if (decoded.type === 'psychologist') {
                // Busca o psicólogo pelo ID do token, excluindo a senha
                req.psychologist = await db.Psychologist.findByPk(decoded.id, {
                    attributes: { exclude: ['senha'] }
                });
            }

            if (!req.patient && !req.psychologist) {
                 return res.status(401).json({ error: 'Não autorizado, usuário não encontrado.' });
            }

            next(); // Continua para a próxima função (o controller da rota)

        } catch (error) {
            console.error(error);
            return res.status(401).json({ error: 'Não autorizado, token inválido.' });
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Não autorizado, nenhum token fornecido.' });
    }
};

module.exports = { protect };