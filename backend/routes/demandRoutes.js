const express = require('express');
const router = express.Router();
const demandController = require('../controllers/demandController');

// Rota POST para /api/demand/searches
// O prefixo '/api/demand' já foi definido no server.js, então aqui usamos '/searches'
router.post('/searches', demandController.recordSearch);

module.exports = router;