// backend/routes/qnaRoutes.js
const express = require('express');
const router = express.Router();
const qnaController = require('../controllers/qnaController');
const { protect } = require('../middleware/authMiddleware'); // Seu middleware de proteção Psi

// Rota para listar perguntas (Protegida para Psis logados)
router.get('/', protect, qnaController.getQuestions);

// Rota para responder
router.post('/:id/answer', protect, qnaController.answerQuestion);

module.exports = router;