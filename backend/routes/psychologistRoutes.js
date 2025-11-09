// Arquivo: backend/routes/psychologistRoutes.js (VERSÃO CORRIGIDA)

const express = require('express');
const router = express.Router();
const psychologistController = require('../controllers/psychologistController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfilePhoto, uploadCrpDocument } = require('../middleware/upload');

// ===============================================
// ROTAS PÚBLICAS (Não exigem login)
// ===============================================
router.post('/register', psychologistController.registerPsychologist);
router.post('/login', psychologistController.loginPsychologist);
router.post('/check-demand', psychologistController.checkDemand);
router.post('/add-to-waitlist', psychologistController.addToWaitlist);
router.get('/showcase', psychologistController.getShowcasePsychologists);
router.get('/slug/:slug', psychologistController.getProfileBySlug);
router.get('/:id/reviews', psychologistController.getPsychologistReviews);
// A rota /:id é movida para o final para não conflitar com /me

// ===============================================
// ROTAS PROTEGIDAS (Exigem login)
// ===============================================
router.use(protect); // Aplica o middleware a TODAS as rotas abaixo

// Rotas "ME" (do usuário logado)
router.get('/me', psychologistController.getAuthenticatedPsychologistProfile);
router.put('/me', psychologistController.updatePsychologistProfile);
router.put('/me/photo', uploadProfilePhoto.single('profilePhoto'), psychologistController.updateProfilePhoto);
router.put('/me/crp-document', uploadCrpDocument.single('crpDocument'), psychologistController.uploadCrpDocument);
router.get('/me/unread-count', psychologistController.getUnreadMessageCount);
router.put('/me/password', psychologistController.updatePsychologistPassword);
router.delete('/me', psychologistController.deletePsychologistAccount);

// Outras rotas protegidas (ex: matches)
router.get('/matches', psychologistController.getPatientMatches);
router.get('/waiting-list', psychologistController.getWaitingList);
router.post('/waiting-list/invite', psychologistController.inviteFromWaitlist);

// ===============================================
// ROTA PÚBLICA GENÉRICA (DEVE SER A ÚLTIMA DE TODAS)
// ===============================================
// Esta rota captura qualquer coisa que não foi pega acima (ex: /1, /23)
router.get('/:id', psychologistController.getPsychologistProfile);

module.exports = router;