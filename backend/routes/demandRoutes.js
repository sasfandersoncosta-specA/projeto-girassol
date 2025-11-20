const express = require('express');
const router = express.Router();
const demandController = require('../controllers/demandController');
const { protect, admin } = require('../middleware/authMiddleware'); // Importa os middlewares

// Rota POST para /api/demand/searches
// O prefixo '/api/demand' já foi definido no server.js, então aqui usamos '/searches'
router.post('/searches', demandController.recordSearch);

// Rota GET para /api/demand/ratings
// O admin usará esta rota para buscar as avaliações. AGORA PROTEGIDA.
router.get('/ratings', protect, admin, demandController.getRatings);

module.exports = router;