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
const paymentRoutes = require('./routes/paymentRoutes');

// Controllers
const demandController = require('./controllers/demandController');
const seedTestData = require('./controllers/seed_test_data');

const app = express();

console.log('[DEPLOY_SYNC] Versão Final Prioritária - v3.1');
const server = http.createServer(app);

initSocket(server);

// --- MIDDLEWARES ---
app.use(cors());

// Isso permite que a gente pegue o 'rawBody' apenas na rota do webhook
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.text({ type: 'application/json' }));
app.use(express.urlencoded({ extended: true }));

// =============================================================
// 🚨 ROTAS DE EMERGÊNCIA (DESATIVADAS PARA PRODUÇÃO) 🚨
// =============================================================

/* // COMENTE TUDO ISTO AQUI PARA NINGUÉM ACESSAR:

app.get('/api/fix-activate-psis', async (req, res) => { ... });

app.get('/fix-db-columns', async (req, res) => { ... });

app.get('/api/fix-vip-all', async (req, res) => { ... });

app.get('/api/fix-reset-payment', async (req, res) => { ... });
*/

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
app.use('/api/payments', paymentRoutes);

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
    // ⚠️ PATCH DE COLUNAS AUSENTES (para garantir que a Redefinição de Senha funcione)
    try {
        console.log('Verificando colunas resetPasswordToken...');
        await db.sequelize.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Psychologists' AND column_name='resetPasswordToken') THEN
                    ALTER TABLE "Psychologists" ADD COLUMN "resetPasswordToken" VARCHAR(255);
                    ALTER TABLE "Psychologists" ADD COLUMN "resetPasswordExpires" TIMESTAMP WITH TIME ZONE;
                    RAISE NOTICE 'Colunas de Redefinição de Senha adicionadas com sucesso!';
                END IF;
            END $$;
        `);
    } catch (e) {
        console.warn('Não foi possível verificar/adicionar colunas (Pode ser erro de permissão ou já existem). Prosseguindo...');
    }
    // FIM DO PATCH

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