// backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Carrega o arquivo 'index.js' de dentro da pasta 'models/' para gerenciar o banco
const db = require('./models');

// Importa os arquivos de rota
const patientRoutes = require('./routes/patientRoutes');
const psychologistRoutes = require('./routes/psychologistRoutes');
const messageRoutes = require('./routes/messageRoutes'); // Adicionado

const app = express();

// Middlewares (Configurações essenciais)
app.use(cors()); // Permite requisições de origens diferentes (seu frontend)
app.use(express.json()); // Permite que o servidor entenda JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Permite entender dados de formulários

// Rota de Teste Simples
app.get('/', (req, res) => {
    res.json({ message: 'Bem-vindo à API Jano! Status: OK' });
});

// Futuras Rotas da API
app.use('/api/patients', patientRoutes); // Todas as rotas de Pacientes (Registro, Login, Dados Pessoais)
app.use('/api/psychologists', psychologistRoutes); // Todas as rotas de Profissionais (Registro, Login, etc)
app.use('/api/messaging', messageRoutes); // Adicionado

// Sincronização com o Banco
// db.sequelize.sync() lê os modelos e cria/atualiza as tabelas se necessário
const PORT = process.env.PORT || 3001;

db.sequelize.sync().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}. Banco de dados sincronizado.`);
    });
}).catch(err => {
    console.error('Não foi possível conectar ao banco de dados:', err);
});

// Removida a rota de reviews duplicada, se houver.
// Se você tiver um reviewRoutes, ele deve ser adicionado aqui:
// const reviewRoutes = require('./routes/reviewRoutes');
// app.use('/api/reviews', reviewRoutes);
// Forcando commit para deploy no Render.