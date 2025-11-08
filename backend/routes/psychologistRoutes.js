const express = require('express');
const router = express.Router();
const psychologistController = require('../controllers/psychologistController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfilePhoto, uploadCrpDocument } = require('../middleware/upload');

// =================================================================
// ROTAS PÚBLICAS (NÃO EXIGEM LOGIN)
// =================================================================
// Rotas POST
router.post('/register', psychologistController.registerPsychologist);
router.post('/login', psychologistController.loginPsychologist);
router.post('/check-demand', psychologistController.checkDemand);
router.post('/add-to-waitlist', psychologistController.addToWaitlist);

// Rotas GET públicas (as mais específicas vêm primeiro)
router.get('/showcase', psychologistController.getShowcasePsychologists);
router.get('/slug/:slug', psychologistController.getProfileBySlug);
router.get('/:id/reviews', psychologistController.getPsychologistReviews);

// =================================================================
// ROTAS PROTEGIDAS (EXIGEM LOGIN)
// =================================================================
// O 'protect' é adicionado como o segundo argumento em cada uma.

// Rotas "ME" (protegidas)
router.get('/me', protect, psychologistController.getAuthenticatedPsychologistProfile);
router.put('/me', protect, psychologistController.updatePsychologistProfile);
router.put('/me/photo', protect, uploadProfilePhoto.single('profilePhoto'), psychologistController.updateProfilePhoto);
router.put('/me/crp-document', protect, uploadCrpDocument.single('crpDocument'), psychologistController.uploadCrpDocument);
router.get('/me/unread-count', protect, psychologistController.getUnreadMessageCount);
router.put('/me/password', protect, psychologistController.updatePsychologistPassword);
router.delete('/me', protect, psychologistController.deletePsychologistAccount);
 
// Outras rotas protegidas (ex: admin, rotas de paciente logado)
router.get('/waiting-list', protect, psychologistController.getWaitingList);
router.post('/waiting-list/invite', protect, psychologistController.inviteFromWaitlist);

// Esta rota '/matches' precisa de um paciente logado, portanto DEVE ser protegida.
// O seu comentário dizia que era pública, mas seu controller prova que é privada.
router.get('/matches', protect, psychologistController.getPatientMatches);

// =================================================================
// ROTA PÚBLICA GENÉRICA (DEVE SER A ÚLTIMA DE TODAS)
// =================================================================
// Esta rota captura qualquer coisa que não foi pega acima (ex: /1, /23, /etc.)
// Ela é pública e não tem 'protect'.
router.get('/:id', psychologistController.getPsychologistProfileById);

module.exports = router;