// backend/server.js

require('dotenv').config();
const express = require('express');
const http = require('http'); // 1. Importa o módulo http
const path = require('path'); // Adicionado para lidar com caminhos de arquivo
const { initSocket } = require('./config/socket'); // 2. Importa nosso inicializador de socket
const cors = require('cors');

// Carrega o arquivo 'index.js' de dentro da pasta 'models/' para gerenciar o banco
const db = require('./models');

// Importa os arquivos de rota
const patientRoutes = require('./routes/patientRoutes');
const psychologistRoutes = require('./routes/psychologistRoutes');
const messageRoutes = require('./routes/messageRoutes'); // Adicionado
const demandRoutes = require('./routes/demandRoutes'); // Adicionado para salvar buscas
const usuarioRoutes = require('./routes/usuarioRoutes'); // Adicionado conforme solicitado
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

// --- ROTAS DA API ---
// Todas as requisições que começam com /api/ são tratadas aqui primeiro.
app.use('/api/patients', patientRoutes); // Todas as rotas de Pacientes (Registro, Login, Dados Pessoais)
app.use('/api/psychologists', psychologistRoutes); // Todas as rotas de Profissionais (Registro, Login, etc)
app.use('/api/messaging', messageRoutes); // Adicionado
app.use('/api/demand', demandRoutes); // Adicionado
app.use('/api/usuarios', usuarioRoutes); // Adicionado conforme solicitado
app.use('/api/admin', adminRoutes); // Adicionado

// --- SERVIR ARQUIVOS ESTÁTICOS (FRONT-END) ---
// Esta linha deve vir DEPOIS das rotas da API.
app.use(express.static(path.join(__dirname, '..')));

// --- ROTA DE PERFIL PÚBLICO (SLUG) ---
// Esta rota deve vir DEPOIS de `express.static` e ANTES do catch-all.
// Ela captura URLs de primeiro nível (ex: /dr-anderson) que não são arquivos estáticos.
app.get('/:slug', psychologistController.getProfileBySlug);

// --- ROTAS DE FRONT-END (Catch-all) ---
// Esta rota deve ser a ÚLTIMA. Ela captura qualquer requisição GET que não foi
// tratada pelas rotas da API ou pelos arquivos estáticos.
app.get(/(.*)/, (req, res) => {
  // CORREÇÃO: O caminho para o index.html deve subir um nível a partir da pasta 'backend'.
  // O arquivo está na raiz do projeto, não em 'backend/public/'.
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

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
        // CORREÇÃO: Removido { force: true } para garantir a persistência dos dados.
        await db.sequelize.sync(); // A opção { force: true } foi removida.
        console.log('Banco de dados sincronizado (sem forçar).');
        await seedTestData();
    }

    server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}.`)); // 5. Inicia o servidor http
};

startServer().catch(err => console.error('Falha ao iniciar o servidor:', err));