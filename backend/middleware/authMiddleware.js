// backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const db = require('../models');

// O Middleware de proteção principal
exports.protect = async (req, res, next) => {
    let token;

    // 1. Tenta pegar o token do header de autorização (Bearer Token)
    // O frontend envia: Authorization: Bearer <token_aqui>
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Pega o token da string (remove 'Bearer ')
            token = req.headers.authorization.split(' ')[1];

            // 2. Verifica (Decodifica) o token usando a mesma chave secreta usada para criá-lo
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Busca o paciente no banco pelo ID do token
            // Usando .select('-senha') para não retornar a senha
            const patient = await db.Patient.findByPk(decoded.id, {
                attributes: { exclude: ['senha'] } // Exclui o campo 'senha'
            });

            if (!patient) {
                return res.status(401).json({ error: 'Paciente não encontrado.' });
            }

            // 4. Anexa o objeto paciente na requisição (req) para que a próxima função (o Controller) possa usá-lo
            req.patient = patient; 

            // Passa para o próximo middleware/controller
            next();

        } catch (error) {
            console.error('Erro de Autenticação/Token inválido:', error.message);
            // 401 Unauthorized (Não autorizado)
            res.status(401).json({ error: 'Não autorizado, token falhou ou expirou.' });
        }
    }

    if (!token) {
        // Se não houver token no header
        res.status(401).json({ error: 'Não autorizado, nenhum token fornecido.' });
    }
};