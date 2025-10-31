const express = require('express');
const router = express.Router();
const psychologistController = require('../controllers/psychologistController');
const { protect } = require('../middleware/authMiddleware'); // Importa o Middleware
const upload = require('../config/upload'); // Importa a configuração de upload

// Rotas públicas de autenticação
router.post('/register', psychologistController.registerPsychologist);
router.post('/login', psychologistController.loginPsychologist);

// Rota para o pré-cadastro e verificação de demanda
router.post('/check-demand', psychologistController.checkDemand);

// Rota para buscar psicólogos compatíveis com o paciente logado (deve vir antes de /:id)
router.get('/matches', protect, psychologistController.getPatientMatches);

// Rotas públicas (não exigem autenticação)
router.get('/:id', psychologistController.getPsychologistProfile);
router.get('/:id/reviews', psychologistController.getPsychologistReviews);

// Rotas protegidas (exigem autenticação)
router.use(protect); // Aplica o middleware a todas as rotas abaixo

// Rotas para o perfil do psicólogo logado
router.get('/me', psychologistController.getPsychologistData);
router.put('/me', psychologistController.updatePsychologistProfile);

// Rota para upload da foto de perfil
router.put('/me/photo', upload.single('profilePhoto'), psychologistController.updateProfilePhoto);

// Rota para buscar a contagem de mensagens não lidas
router.get('/me/unread-count', psychologistController.getUnreadMessageCount);

// Rota para visualizar a lista de espera (Acesso PRIVADO)
router.get('/waiting-list', psychologistController.getWaitingList);

// Rota para alterar a senha do psicólogo (Acesso PRIVADO)
router.put('/me/password', psychologistController.updatePsychologistPassword);

// Rota para EXCLUIR a conta do psicólogo (Acesso PRIVADO)
router.delete('/me', psychologistController.deletePsychologistAccount);

module.exports = router;