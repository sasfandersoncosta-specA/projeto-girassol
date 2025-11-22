// backend/server.js (VERSÃO PRIORITÁRIA)

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { initSocket } = require('./config/socket');
const cors = require('cors');

// Banco de Dados
const db = require('./models');

// Importação de Rotas
const patientRoutes = require('./routes/patientRoutes');
const psychologistRoutes = require('./routes/psychologistRoutes');
const messageRoutes = require('./routes/messageRoutes');
const demandRoutes = require('./routes/demandRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const qnaRoutes = require('./routes/qnaRoutes');

// Controllers
const demandController = require('./controllers/demandController');
const seedTestData = require('./controllers/seed_test_data');

const app = express();

console.log('[DEPLOY_SYNC] Versão Final Prioritária - v3.1');
const server = http.createServer(app);

initSocket(server);

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'application/json' }));
app.use(express.urlencoded({ extended: true }));

// =============================================================
// 🚨 ROTAS DE EMERGÊNCIA (PRIORIDADE MÁXIMA) 🚨
// (Estão aqui no topo para garantir que nada as bloqueie)
// =============================================================

// 1. Ativar Psicólogos (A que você precisa agora)
app.get('/api/fix-activate-psis', async (req, res) => {
    try {
        await db.sequelize.query(`UPDATE "Psychologists" SET status = 'active'`);
        res.send('<h1 style="color: green;">SUCESSO! Todos os psicólogos estão ativos e visíveis.</h1>');
    } catch (error) {
        res.status(500).send('ERRO: ' + error.message);
    }
});

// 2. Criar Colunas de Busca
app.get('/fix-db-columns', async (req, res) => {
    try {
        await db.sequelize.query(`
            ALTER TABLE "DemandSearches" ADD COLUMN IF NOT EXISTS rating INTEGER;
            ALTER TABLE "DemandSearches" ADD COLUMN IF NOT EXISTS feedback TEXT;
        `);
        res.send('<h1 style="color: green;">SUCESSO: Colunas criadas!</h1>');
    } catch (error) {
        res.status(500).send('ERRO: ' + error.message);
    }
});

// 3. Criar Tabela de Saída
app.get('/fix-db-exit', async (req, res) => {
    try {
        await db.sequelize.query(`
            CREATE TABLE IF NOT EXISTS "ExitSurveys" (
                "id" SERIAL PRIMARY KEY,
                "psychologistId" INTEGER,
                "motivo" VARCHAR(255),
                "avaliacao" INTEGER,
                "sugestao" TEXT,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        res.send('<h1 style="color: green;">SUCESSO: Tabela ExitSurveys criada!</h1>');
    } catch (error) {
        res.status(500).send('ERRO: ' + error.message);
    }
});

// 4. Adicionar validade da assinatura do psicólogo
app.get('/fix-add-subscription', async (req, res) => {
    try {
        await db.sequelize.query(`
            ALTER TABLE "Psychologists" 
            ADD COLUMN IF NOT EXISTS "subscription_expires_at" TIMESTAMP WITH TIME ZONE;
        `);
        res.send('<h1 style="color: blue;">Pronto! Coluna de validade criada.</h1>');
    } catch (error) {
        res.status(500).send('Erro: ' + error.message);
    }
});

// 5. BOMBA ATÔMICA (Versão SQL Puro - Ignora o Model)
app.get('/api/fix-vip-all', async (req, res) => {
    try {
        // SQL Direto: Funciona mesmo se o model estiver desatualizado
        await db.sequelize.query(`
            UPDATE "Psychologists" 
            SET "subscription_expires_at" = NOW() + INTERVAL '1 year',
                "status" = 'active'
        `);
        res.send('<h1 style="color: green;">SUCESSO REAL! SQL executado direto no banco.</h1>');
    } catch (error) {
        res.status(500).send('ERRO: ' + error.message);
    }
});

// 6. CRIAÇÃO DAS COLUNAS DE REDES SOCIAIS QUE FALTAM
app.get('/api/fix-add-socials', async (req, res) => {
    try {
        await db.sequelize.query(`
            ALTER TABLE "Psychologists" 
            ADD COLUMN IF NOT EXISTS "facebook_url" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "tiktok_url" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "x_url" VARCHAR(255);
        `);
        res.send('<h1 style="color: green;">SUCESSO! Colunas Facebook, TikTok e X criadas.</h1>');
    } catch (error) {
        res.status(500).send('ERRO: ' + error.message);
    }
});

// =============================================================
// ROTAS DA APLICAÇÃO
// =============================================================

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/patients', patientRoutes);
app.use('/api/psychologists', psychologistRoutes);
app.use('/api/messaging', messageRoutes);
app.use('/api/demand', demandRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/qna', qnaRoutes);

// Rotas Específicas do Admin
app.get('/api/admin/feedbacks', demandController.getRatings);
app.get('/api/admin/exit-surveys', async (req, res) => {
    try {
        try { await db.sequelize.query('SELECT 1 FROM "ExitSurveys" LIMIT 1'); } 
        catch (e) { return res.json({ stats: {}, list: [] }); }

        const [stats] = await db.sequelize.query(`SELECT COUNT(*) as total, AVG(avaliacao)::numeric(10,1) as media FROM "ExitSurveys"`);
        const [list] = await db.sequelize.query(`SELECT * FROM "ExitSurveys" ORDER BY "createdAt" DESC LIMIT 50`);
        res.json({ stats: stats[0], list });
    } catch (error) { res.status(500).json({ error: "Erro interno" }); }
});

// =============================================================
// FRONTEND E CATCH-ALL (DEVE SER O ÚLTIMO)
// =============================================================
app.use(express.static(path.join(__dirname, '..')));

app.get('/:slug', (req, res, next) => {
    const reserved = ['api', 'assets', 'css', 'js', 'patient', 'psi', 'fix-db'];
    if (reserved.some(p => req.params.slug.startsWith(p)) || req.params.slug.includes('.')) return next();
    res.sendFile(path.join(__dirname, '..', 'perfil_psicologo.html'));
});

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Inicialização
const PORT = process.env.PORT || 3001;
const startServer = async () => {
    if (process.env.NODE_ENV !== 'production') {
        await db.sequelize.sync({ alter: true });
        console.log('Banco de dados sincronizado (DEV).');
        await seedTestData();
    } else {
        await db.sequelize.sync();
        console.log('Banco de dados sincronizado (PROD).');
    }
    server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}.`));
};

startServer().catch(err => console.error('Falha ao iniciar o servidor:', err));