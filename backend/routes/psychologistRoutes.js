// backend/routes/psychologistRoutes.js

const express = require('express');
const router = express.Router();
const { registerPsychologist, listPsychologists } = require('../controllers/psychologistController');
const { protect } = require('../middleware/authMiddleware'); // Importa o middleware de proteção

// Rota de Cadastro de Profissional (Não precisa de proteção, pois é a criação)
router.post('/register', registerPsychologist);

// Rota de Listagem de Profissionais (PRECISA de proteção: só paciente logado pode ver)
// Esta rota é o "catálogo" de matches
router.get('/', protect, listPsychologists);

module.exports = router;