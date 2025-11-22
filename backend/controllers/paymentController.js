// backend/controllers/paymentController.js
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const db = require('../models');

// Configura o cliente com o seu token do .env
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// 1. CRIA O LINK DE PAGAMENTO (O usuário clica no botão e chama isso)
exports.createPreference = async (req, res) => {
    try {
        const { planType, cupom } = req.body; // <--- AGORA RECEBE O CUPOM
        const psychologistId = req.psychologist.id;

        // --- SISTEMA DE CUPOM MÁGICO (BYPASS) ---
        if (cupom && cupom.toUpperCase() === 'SOLVIP') {
            const psi = await db.Psychologist.findByPk(psychologistId);
            
            // Dá 30 dias grátis do plano SOL
            const hoje = new Date();
            const trintaDias = new Date(hoje.setDate(hoje.getDate() + 30));

            await psi.update({
                status: 'active',
                subscription_expires_at: trintaDias,
                plano: 'Sol' // Força o plano Sol
            });

            // Retorna um sinal especial para o frontend
            return res.json({ couponSuccess: true, message: 'Cupom VIP aplicado! Plano Sol ativado.' });
        }
        // ----------------------------------------

        // ... (O RESTO DO CÓDIGO DO MERCADO PAGO CONTINUA IGUAL ABAIXO) ...
        let title, price;
        // ... switch(planType) ...
        // Configuração dos preços
        switch (planType) {
            case 'semente': title = 'Plano Semente (Mensal)'; price = 49.00; break;
            case 'luz':     title = 'Plano Luz (Mensal)';     price = 99.00; break;
            case 'sol':     title = 'Plano Sol (Mensal)';     price = 149.00; break;
            default: return res.status(400).json({ error: 'Plano inválido' });
        }

        // ... const preference = new Preference(client); ...
        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [
                    {
                        id: planType,
                        title: title,
                        quantity: 1,
                        unit_price: price,
                        currency_id: 'BRL'
                    }
                ],
                // AQUI ESTÁ O TRUQUE: Enviamos o ID do psicólogo escondido na venda
                external_reference: String(psychologistId), 
                
                // Para onde o usuário volta depois de pagar
                back_urls: {
                    success: "https://projeto-girassol.onrender.com/psi/psi_dashboard.html?status=approved",
                    failure: "https://projeto-girassol.onrender.com/psi/psi_dashboard.html?status=failure",
                    pending: "https://projeto-girassol.onrender.com/psi/psi_dashboard.html?status=pending"
                },
                auto_return: "approved",
                
                // O Mercado Pago avisa seu servidor aqui (tem que ser URL pública)
                notification_url: "https://projeto-girassol.onrender.com/api/payments/webhook" 
            }
        });

        // ... res.json({ init_point: result.init_point });
        res.json({ init_point: result.init_point }); // Manda o link para o frontend

    } catch (error) {
        console.error('Erro MP:', error);
        res.status(500).json({ error: 'Erro ao gerar pagamento' });
    }
};

// 2. O WEBHOOK (Onde a mágica da liberação acontece)
exports.handleWebhook = async (req, res) => {
    // O MP manda o ID do pagamento na query ou no body
    const paymentId = req.query.id || req.query['data.id'];
    const topic = req.query.topic || req.query.type;

    try {
        if (topic === 'payment' || req.body.type === 'payment') {
            const payment = new Payment(client);
            // Consulta o status real no Mercado Pago
            const paymentData = await payment.get({ id: paymentId });

            const status = paymentData.status; 
            const psychologistId = paymentData.external_reference; // Recupera o ID que escondemos

            if (status === 'approved') {
                console.log(`[PAGAMENTO] Aprovado para Psi ID: ${psychologistId}`);

                const psi = await db.Psychologist.findByPk(psychologistId);
                
                if (psi) {
                    // Adiciona 30 dias de validade
                    const hoje = new Date();
                    const novaValidade = new Date(hoje.setDate(hoje.getDate() + 30));

                    await psi.update({
                        status: 'active',
                        subscription_expires_at: novaValidade,
                        plano: paymentData.additional_info?.items?.[0]?.id || 'premium'
                    });
                    
                    console.log(`[SUCESSO] ${psi.nome} ativado até ${novaValidade}`);
                }
            }
        }
        res.status(200).send('OK');
    } catch (error) {
        console.error('Erro Webhook:', error);
        res.status(500).send('Erro');
    }
};