const express = require('express');
const router = express.Router();
const demandController = require('../controllers/demandController');

// Rota para registrar uma nova busca anônima de demanda
router.post('/searches', demandController.recordSearch);

module.exports = router;