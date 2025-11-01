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

// Rota para adicionar à lista de espera (pública)
router.post('/add-to-waitlist', psychologistController.addToWaitlist);

// Rotas protegidas (exigem autenticação)
router.use(protect); // Aplica o middleware a todas as rotas abaixo

// Rotas para buscar dados (devem vir antes de /:id para evitar conflito)
router.get('/matches', psychologistController.getPatientMatches);

// Rotas para o perfil do psicólogo logado
router.get('/me', psychologistController.getPsychologistData);
router.put('/me', psychologistController.updatePsychologistProfile);

// Rota para upload da foto de perfil
router.put('/me/photo', upload.single('profilePhoto'), psychologistController.updateProfilePhoto);

// Rota para buscar a contagem de mensagens não lidas
router.get('/me/unread-count', psychologistController.getUnreadMessageCount);

// Rota para visualizar a lista de espera (Acesso PRIVADO)
router.get('/waiting-list', psychologistController.getWaitingList);

// Rota para convidar manualmente da lista de espera (Acesso PRIVADO)
router.post('/waiting-list/invite', psychologistController.inviteFromWaitlist);

// Rota para alterar a senha do psicólogo (Acesso PRIVADO)
router.put('/me/password', psychologistController.updatePsychologistPassword);

// Rota para EXCLUIR a conta do psicólogo (Acesso PRIVADO)
router.delete('/me', psychologistController.deletePsychologistAccount);

// Rotas públicas com parâmetro (devem vir por último)
router.get('/:id', psychologistController.getPsychologistProfile);
router.get('/:id/reviews', psychologistController.getPsychologistReviews);

module.exports = router;