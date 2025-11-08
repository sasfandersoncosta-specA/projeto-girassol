const express = require('express');
const router = express.Router();
const psychologistController = require('../controllers/psychologistController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfilePhoto, uploadCrpDocument } = require('../middleware/upload');

// =================================================================
// ROTAS PÚBLICAS (Não exigem login)
// =================================================================
// A ordem importa: rotas mais específicas (como /showcase) vêm primeiro.

// Rotas POST públicas
router.post('/register', psychologistController.registerPsychologist);
router.post('/login', psychologistController.loginPsychologist);
router.post('/check-demand', psychologistController.checkDemand);
router.post('/add-to-waitlist', psychologistController.addToWaitlist);

// Rotas GET públicas específicas
router.get('/showcase', psychologistController.getShowcasePsychologists);
router.get('/matches', psychologistController.getPatientMatches);

// Rotas GET públicas com parâmetros (AS QUE ESTAVAM QUEBRADAS)
// Movidas para ANTES da barreira 'protect'
router.get('/slug/:slug', psychologistController.getProfileBySlug);
router.get('/:id/reviews', psychologistController.getPsychologistReviews);

// A rota /:id deve ser a ÚLTIMA rota pública com GET
router.get('/:id', psychologistController.getPsychologistProfileById);


// =================================================================
// BARREIRA DE AUTENTICAÇÃO
// NADA PÚBLICO PODE ESTAR ABAIXO DESTA LINHA
// =================================================================
router.use(protect); 

// =================================================================
// ROTAS PROTEGIDAS (Exigem login)
// =================================================================

// Rotas "ME" (protegidas)
router.get('/me', psychologistController.getAuthenticatedPsychologistProfile);
router.put('/me', psychologistController.updatePsychologistProfile);
router.put('/me/photo', uploadProfilePhoto.single('profilePhoto'), psychologistController.updateProfilePhoto);
router.put('/me/crp-document', uploadCrpDocument.single('crpDocument'), psychologistController.uploadCrpDocument);
router.get('/me/unread-count', psychologistController.getUnreadMessageCount);
router.put('/me/password', psychologistController.updatePsychologistPassword);
router.delete('/me', psychologistController.deletePsychologistAccount);
 
// Outras rotas protegidas (ex: admin)
router.get('/waiting-list', psychologistController.getWaitingList);
router.post('/waiting-list/invite', psychologistController.inviteFromWaitlist);

module.exports = router;