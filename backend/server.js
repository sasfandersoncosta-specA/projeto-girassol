// backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Carrega o arquivo 'index.js' de dentro da pasta 'models/' para gerenciar o banco
const db = require('./models');

// Importa os arquivos de rota
const patientRoutes = require('./routes/patientRoutes');
const psychologistRoutes = require('./routes/psychologistRoutes');

const app = express();
const PORT = process.env.PORT || 3000; 

// Middlewares (Configurações essenciais)
app.use(cors()); // Permite requisições de origens diferentes (seu frontend)
app.use(express.json()); // Permite que o servidor entenda JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Permite entender dados de formulários

// Rota de Teste Simples
app.get('/', (req, res) => {
    res.json({ message: 'Bem-vindo à API Girassol! Status: OK' });
});

// Futuras Rotas da API
app.use('/api/patients', patientRoutes); // Todas as rotas de Pacientes (Registro, Login, Dados Pessoais)
app.use('/api/psychologists', psychologistRoutes); // Todas as rotas de Profissionais (Registro, Login, etc)

// Sincronização com o Banco
// db.sequelize.sync() lê os modelos e cria/atualiza as tabelas se necessário
db.sequelize.sync().then(() => {
    console.log("Banco de dados sincronizado com sucesso.");
}).catch(err => {
    // Se o banco falhar (geralmente por senha ou host incorreto), o servidor morre aqui
    console.error("Falha ao sincronizar o banco de dados: " + err.message);
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}. Acesse http://localhost:${PORT}`);
});