const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// Rota pública para login do admin
router.post('/login', adminController.loginAdmin);

// Aplica proteção para garantir que apenas admins logados acessem
router.use(protect);
router.use(admin);

// Rota para buscar as estatísticas da Visão Geral
router.get('/stats', adminController.getDashboardStats);

// Rota para buscar e atualizar os dados do admin logado
router.get('/me', adminController.getAdminData);
router.put('/me', adminController.updateAdminData);
router.put('/me/password', adminController.updateAdminPassword);

// Rota para buscar todos os psicólogos para a página de gerenciamento
router.get('/psychologists', adminController.getAllPsychologists);

// Rota para buscar todos os pacientes
router.get('/patients', adminController.getAllPatients);

// Rota para buscar todas as avaliações (reviews)
router.get('/reviews', adminController.getAllReviews);

// Rota para buscar os logs do sistema
router.get('/logs', adminController.getSystemLogs);

// Rota para buscar todas as mensagens
router.get('/messages', adminController.getAllMessages);

// Rota para enviar mensagens em massa (broadcast)
router.post('/broadcast', adminController.sendBroadcastMessage);

// Rota para o admin responder a uma conversa específica
router.post('/reply', adminController.sendReply);

// Rota para deletar uma conversa
router.delete('/conversations/:id', adminController.deleteConversation);

module.exports = router;