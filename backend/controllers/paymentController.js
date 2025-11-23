// backend/controllers/paymentController.js
const db = require('../models');
// Certifique-se que STRIPE_SECRET_KEY está no seu .env
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// 1. CRIA A INTENÇÃO DE PAGAMENTO (PaymentIntent) - MANTIDO IGUAL
exports.createPreference = async (req, res) => {
    try {
        const { planType, cupom } = req.body;
        const psychologistId = req.psychologist.id;

        // Lógica do Cupom VIP
        if (cupom && cupom.toUpperCase() === 'SOLVIP') {
            const psi = await db.Psychologist.findByPk(psychologistId);
            const hoje = new Date();
            const trintaDias = new Date(hoje.setDate(hoje.getDate() + 30));

            await psi.update({
                status: 'active',
                subscription_expires_at: trintaDias,
                plano: 'Sol'
            });
            return res.json({ couponSuccess: true, message: 'Cupom VIP aplicado!' });
        }

        let amount;
        switch (planType) {
            case 'semente': amount = 4900; break; 
            case 'luz':     amount = 9900; break; 
            case 'sol':     amount = 14900; break; 
            default: return res.status(400).json({ error: 'Plano inválido' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'brl',
            automatic_payment_methods: { enabled: true },
            metadata: {
                psychologistId: String(psychologistId),
                planType: planType
            }
        });

        res.json({ clientSecret: paymentIntent.client_secret });

    } catch (error) {
        console.error('Erro Stripe:', error);
        res.status(500).json({ error: 'Erro ao criar pagamento' });
    }
};

// 2. WEBHOOK COM SEGURANÇA (A CORREÇÃO)
exports.handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // AQUI ESTÁ A MUDANÇA: Validamos se o evento veio mesmo da Stripe
        // Nota: req.rawBody é necessário aqui (veja instrução abaixo sobre o server.js)
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { psychologistId, planType } = paymentIntent.metadata;

        console.log(`[STRIPE] Pagamento Aprovado e Verificado: Psi ${psychologistId}`);

        try {
            const psi = await db.Psychologist.findByPk(psychologistId);
            if (psi) {
                const hoje = new Date();
                const novaValidade = new Date(hoje.setDate(hoje.getDate() + 30));
                // Capitaliza a primeira letra (sol -> Sol)
                const planoFormatado = planType.charAt(0).toUpperCase() + planType.slice(1);

                await psi.update({
                    status: 'active',
                    subscription_expires_at: novaValidade,
                    plano: planoFormatado
                });
            }
        } catch (err) {
            console.error('Erro ao atualizar banco:', err);
            // Retornamos 200 mesmo com erro no banco para a Stripe não ficar tentando reenviar infinitamente
            return res.json({received: true}); 
        }
    }

    res.json({received: true});
};