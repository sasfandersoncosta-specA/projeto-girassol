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
const psychologistController = require('./controllers/psychologistController'); // Adicionado para a rota de slug
const seedTestData = require('./scripts/seed_test_data'); // Importa a função de seed

const app = express();

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

// Sincronização com o Banco
// db.sequelize.sync() lê os modelos e cria/atualiza as tabelas se necessário
const PORT = process.env.PORT || 3001;
// Força a recriação do banco de dados se o ambiente NÃO for de produção.
// Isso garante que o schema esteja sempre atualizado durante o desenvolvimento.
const isDevelopment = process.env.NODE_ENV !== 'production';

// Em desenvolvimento, usamos { force: true } para recriar o banco a cada reinicialização,
// garantindo que o schema esteja sempre atualizado com os modelos.
// Em produção, usamos sync() sem 'force' para não perder dados.
db.sequelize.sync({ force: isDevelopment }).then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}.`);
        if (isDevelopment) {
            // Após sincronizar, popula o banco com dados de teste
            console.log('Populando o banco de dados com dados de teste...');
            seedTestData();
            console.log('Banco de dados sincronizado com { force: true }');
        }
    });
}).catch(err => {
    console.error('Não foi possível conectar ao banco de dados:', err);
});