// backend/routes/qnaRoutes.js
const express = require('express');
const router = express.Router();
const qnaController = require('../controllers/qnaController');
const authMiddleware = require('../middleware/authMiddleware'); // Middleware para proteger rotas

// Rota para um usuário anônimo criar uma nova pergunta
router.post('/questions', qnaController.createQuestion);

// Rota para buscar todas as perguntas e respostas aprovadas
router.get('/questions', qnaController.getApprovedQuestions);
// Rota para um psicólogo logado responder a uma pergunta
// A rota é protegida para garantir que apenas psicólogos autenticados possam responder.
router.post('/questions/:questionId/answers', authMiddleware.protect, authMiddleware.isPsychologist, qnaController.createAnswer);

module.exports = router;