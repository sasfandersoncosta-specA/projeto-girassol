// backend/server.js (O ÚNICO E VERDADEIRO)

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

// Importação de Controllers (Necessário para rotas diretas aqui)
const demandController = require('./controllers/demandController');
const seedTestData = require('./controllers/seed_test_data');

const app = express();

console.log('[DEPLOY_SYNC] Versão Final Integrada - v3.0 (Exit Survey + Admin)');
const server = http.createServer(app);

initSocket(server);

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
// IMPORTANTE: Permite ler JSON enviado via sendBeacon (Blob)
app.use(express.text({ type: 'application/json' }));
app.use(express.urlencoded({ extended: true }));

// --- PERMITIR ACESSO ÀS FOTOS DE PERFIL ---
// Isso diz ao servidor: "Se alguém pedir /uploads, mostre o arquivo que está na pasta uploads"
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROTAS DA API ---
app.use('/api/patients', patientRoutes);
app.use('/api/psychologists', psychologistRoutes);
app.use('/api/messaging', messageRoutes);
app.use('/api/demand', demandRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/qna', qnaRoutes);

// --- ROTA ADMIN: FEEDBACKS DE USUÁRIOS ---
app.get('/api/admin/feedbacks', demandController.getRatings);

// --- ROTA ADMIN: PESQUISAS DE SAÍDA (PSI) ---
app.get('/api/admin/exit-surveys', async (req, res) => {
    try {
        // Verifica se a tabela existe antes de tentar ler
        try {
            await db.sequelize.query('SELECT 1 FROM "ExitSurveys" LIMIT 1');
        } catch (e) {
            return res.json({ stats: { total: 0, media: 0, principal_motivo: '-' }, list: [] });
        }

        const [stats] = await db.sequelize.query(`
            SELECT 
                COUNT(*) as total,
                AVG(avaliacao)::numeric(10,1) as media,
                mode() WITHIN GROUP (ORDER BY motivo) as principal_motivo
            FROM "ExitSurveys"
        `);
        
        const [list] = await db.sequelize.query(`
            SELECT * FROM "ExitSurveys" ORDER BY "createdAt" DESC LIMIT 50
        `);
        
        res.json({ stats: stats[0] || {}, list: list || [] });
    } catch (error) {
        console.error("Erro Admin Exit:", error);
        res.status(500).json({ error: "Erro interno" });
    }
});

// --- ROTAS DE EMERGÊNCIA (DATABASE FIXES) ---

// 1. Cria colunas para Avaliação do Usuário (DemandSearches)
app.get('/fix-db-columns', async (req, res) => {
    try {
        await db.sequelize.query(`
            ALTER TABLE "DemandSearches" ADD COLUMN IF NOT EXISTS rating INTEGER;
            ALTER TABLE "DemandSearches" ADD COLUMN IF NOT EXISTS feedback TEXT;
        `);
        res.send('<h1 style="color: green;">SUCESSO: Colunas de Busca criadas!</h1>');
    } catch (error) {
        res.status(500).send('ERRO: ' + error.message);
    }
});

// 2. Cria tabela para Saída de Psicólogos (ExitSurveys)
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

// --- SERVIR ARQUIVOS ESTÁTICOS (FRONT-END) ---
app.use(express.static(path.join(__dirname, '..')));

app.get('/:slug', (req, res, next) => {
    const reservedPaths = ['api', 'assets', 'css', 'js', 'patient', 'psi', 'fix-db-columns', 'fix-db-exit'];
    if (reservedPaths.some(p => req.params.slug.startsWith(p)) || req.params.slug.includes('.')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '..', 'perfil_psicologo.html'));
});

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Inicialização do Servidor
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

// --- ROTA DE EMERGÊNCIA: ATIVAR TODOS OS PSICÓLOGOS ---
app.get('/fix-activate-psis', async (req, res) => {
    try {
        // Atualiza TODOS os psicólogos para status 'active'
        await db.sequelize.query(`UPDATE "Psychologists" SET status = 'active'`);
        res.send('<h1 style="color: green;">SUCESSO! Todos os psicólogos estão ativos e visíveis.</h1>');
    } catch (error) {
        res.status(500).send('ERRO: ' + error.message);
    }
});