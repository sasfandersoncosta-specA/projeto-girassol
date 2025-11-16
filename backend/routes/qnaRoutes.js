// backend/routes/qnaRoutes.js
const express = require('express');
const router = express.Router();
const qnaController = require('../controllers/qnaController');

// Rota para um usuário anônimo criar uma nova pergunta
router.post('/questions', qnaController.createQuestion);

// Rota para buscar todas as perguntas e respostas aprovadas
router.get('/questions', qnaController.getApprovedQuestions);


module.exports = router;