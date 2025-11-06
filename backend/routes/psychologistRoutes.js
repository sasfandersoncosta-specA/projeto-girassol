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
// ROTAS PROTEGIDAS (Exigem login)
// =MUDANÇA DE ORDEM==============================
router.use(protect); // Aplica o middleware a todas as rotas abaixo

// Rotas "ME" (devem vir primeiro na seção protegida para não conflitarem com /:id)
router.get('/me', psychologistController.getPsychologistData);
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

// ===============================================
// ROTAS PÚBLICAS GENÉRICAS (Devem ir por último)
// ===============================================
// (Movidas de cima para baixo, para não conflitarem com /me ou /showcase)
router.get('/slug/:slug', psychologistController.getProfileBySlug);
router.get('/:id', psychologistController.getPsychologistProfile);
router.get('/:id/reviews', psychologistController.getPsychologistReviews);

module.exports = router;