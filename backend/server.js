// backend/server.js

require('dotenv').config();
const express = require('express');
const http = require('http'); // 1. Importa o módulo http
const { initSocket } = require('./config/socket'); // 2. Importa nosso inicializador de socket
const cors = require('cors');

// Carrega o arquivo 'index.js' de dentro da pasta 'models/' para gerenciar o banco
const db = require('./models');

// Importa os arquivos de rota
const patientRoutes = require('./routes/patientRoutes');
const psychologistRoutes = require('./routes/psychologistRoutes');
const messageRoutes = require('./routes/messageRoutes'); // Adicionado
const demandRoutes = require('./routes/demandRoutes'); // Adicionado para salvar buscas
const adminRoutes = require('./routes/adminRoutes'); // Adicionado para o dashboard
const psychologistController = require('./controllers/psychologistController');
const seedTestData = require('./controllers/seed_test_data'); // Caminho corrigido

const app = express();
const server = http.createServer(app); // 3. Cria um servidor http a partir do app express

initSocket(server); // 4. Inicializa o Socket.IO com o servidor http

// Middlewares (Configurações essenciais)
app.use(cors()); // Permite requisições de origens diferentes (seu frontend)
app.use(express.json()); // Permite que o servidor entenda JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Permite entender dados de formulários

// Rota de Teste Simples
app.get('/', (req, res) => {
    res.json({ message: 'Bem-vindo à API Jano! Status: OK' });
});

// Rota para perfil público com URL amigável (deve vir antes das rotas da API)
app.get('/:slug', psychologistController.getProfileBySlug);

// Futuras Rotas da API
app.use('/api/patients', patientRoutes); // Todas as rotas de Pacientes (Registro, Login, Dados Pessoais)
app.use('/api/psychologists', psychologistRoutes); // Todas as rotas de Profissionais (Registro, Login, etc)
app.use('/api/messaging', messageRoutes); // Adicionado
app.use('/api/demand', demandRoutes); // Adicionado
app.use('/api/admin', adminRoutes); // Adicionado

// Sincronização com o Banco
// db.sequelize.sync() lê os modelos e cria/atualiza as tabelas se necessário
const PORT = process.env.PORT || 3001;
// Força a recriação do banco de dados se o ambiente NÃO for de produção.
// Isso garante que o schema esteja sempre atualizado durante o desenvolvimento.
const isDevelopment = process.env.NODE_ENV !== 'production';

// Em desenvolvimento, usamos { force: true } para recriar o banco a cada reinicialização,
// garantindo que o schema esteja sempre atualizado com os modelos.
// Em produção, usamos sync() sem 'force' para não perder dados.
const startServer = async () => {
    if (isDevelopment) {
        await db.sequelize.sync({ force: true });
        console.log('Banco de dados sincronizado com { force: true }');
        await seedTestData();
    }

    server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}.`)); // 5. Inicia o servidor http
};

startServer().catch(err => console.error('Falha ao iniciar o servidor:', err));