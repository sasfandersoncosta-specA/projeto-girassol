const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { protect } = require('../middleware/authMiddleware'); // Importa o Middleware

// Rota de Registro: /api/patients/register (Acesso Público)
router.post('/register', patientController.registerPatient);

// Rota de Login: /api/patients/login (Acesso Público)
router.post('/login', patientController.loginPatient);

// Rota de Dados do Paciente Logado: /api/patients/me (Acesso PRIVADO)
// O middleware 'protect' é executado ANTES do controller. 
// Ele garante que o token JWT seja válido.
router.get('/me', protect, patientController.getPatientData);

module.exports = router;
