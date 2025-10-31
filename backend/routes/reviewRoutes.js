const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// Rota para criar uma nova avaliação.
// Apenas pacientes logados podem criar. O middleware 'protect' garante isso.
router.post('/', protect, reviewController.createReview);

module.exports = router;