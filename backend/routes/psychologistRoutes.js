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

// ROTA PÚBLICA /SHOWCASE (Estava faltando)
router.get('/showcase', psychologistController.getShowcasePsychologists);

// ===============================================
// ROTAS PÚBLICAS GENÉRICAS (Devem vir ANTES do 'protect')
// ===============================================
router.get('/slug/:slug', psychologistController.getProfileBySlug);
router.get('/:id', psychologistController.getPsychologistProfile);
router.get('/:id/reviews', psychologistController.getPsychologistReviews);

// ===============================================
// ROTAS PROTEGIDAS (Exigem login)
// =MUDANÇA DE ORDEM==============================
router.use(protect); // Aplica o middleware a todas as rotas abaixo

// Rotas "ME" (devem vir primeiro na seção protegida para não conflitarem com /:id)
router.get('/me', psychologistController.getPsychologistProfile);
router.put('/me', psychologistController.updatePsychologistProfile);
router.put('/me/photo', uploadProfilePhoto.single('profilePhoto'), psychologistController.updateProfilePhoto);
router.put('/me/crp-document', uploadCrpDocument.single('crpDocument'), psychologistController.uploadCrpDocument);
router.get('/me/unread-count', psychologistController.getUnreadMessageCount);
router.put('/me/password', psychologistController.updatePsychologistPassword);
router.delete('/me', psychologistController.deletePsychologistAccount);

// Outras rotas protegidas
router.get('/matches', psychologistController.getPatientMatches);
router.get('/waiting-list', psychologistController.getWaitingList);
router.post('/waiting-list/invite', psychologistController.inviteFromWaitlist);

module.exports = router;