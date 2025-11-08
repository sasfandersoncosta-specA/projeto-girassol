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
// Rota de Match (pode ser acessada por usuários logados ou anônimos)
router.get('/matches', psychologistController.getPatientMatches);

// ===============================================
// ROTAS PROTEGIDAS (Exigem login)
// ===============================================
router.use(protect); // Aplica o middleware a TODAS as rotas abaixo

// Rotas "ME" (devem vir primeiro para não conflitarem com /:id)
router.get('/me', psychologistController.getAuthenticatedPsychologistProfile);
router.put('/me', psychologistController.updatePsychologistProfile);
router.put('/me/photo', uploadProfilePhoto.single('profilePhoto'), psychologistController.updateProfilePhoto);
router.put('/me/crp-document', uploadCrpDocument.single('crpDocument'), psychologistController.uploadCrpDocument);
router.get('/me/unread-count', psychologistController.getUnreadMessageCount);
router.put('/me/password', psychologistController.updatePsychologistPassword);
router.delete('/me', psychologistController.deletePsychologistAccount);
 
// Outras rotas protegidas
router.get('/waiting-list', psychologistController.getWaitingList);
router.post('/waiting-list/invite', psychologistController.inviteFromWaitlist);

// ===============================================
// ROTAS PÚBLICAS COM PARÂMETROS (Devem vir por último)
// ===============================================
router.get('/slug/:slug', psychologistController.getProfileBySlug);
router.get('/:id/reviews', psychologistController.getPsychologistReviews);
// IMPORTANTE: A rota /:id deve ser a ÚLTIMA para não capturar rotas como /me, /matches, etc.
router.get('/:id', psychologistController.getPsychologistProfileById);

module.exports = router;