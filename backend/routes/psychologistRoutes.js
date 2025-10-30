const express = require('express');
const router = express.Router();
const psychologistController = require('../controllers/psychologistController');
const { protect } = require('../middleware/authMiddleware'); // Importa o "segurança"

// Rota 1: POST /api/psychologists/register
// (Usada pelo Insomnia para cadastrar novos profissionais)
router.post('/register', psychologistController.registerPsychologist);

// Rota 2: GET /api/psychologists/
// (Usada pelo patient.js na tela "Meus Matches")
// ATUALIZADO: Agora usa 'getMatches' e é protegida pelo 'protect'
router.get('/', protect, psychologistController.getMatches);

module.exports = router;