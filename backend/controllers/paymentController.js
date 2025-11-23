// backend/controllers/paymentController.js
const db = require('../models');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// 1. CRIA A INTENÇÃO DE PAGAMENTO (PaymentIntent)
exports.createPreference = async (req, res) => {
    try {
        const { planType, cupom } = req.body;
        const psychologistId = req.psychologist.id;

        // --- LÓGICA DO CUPOM VIP (Mantida) ---
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

        // --- DEFINIÇÃO DE VALORES (Em Centavos) ---
        let amount;
        switch (planType) {
            case 'semente': amount = 4900; break; // R$ 49,00
            case 'luz':     amount = 9900; break; // R$ 99,00
            case 'sol':     amount = 14900; break; // R$ 149,00
            default: return res.status(400).json({ error: 'Plano inválido' });
        }

        // Cria a Intenção na Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'brl',
            automatic_payment_methods: { enabled: true }, // Habilita Cartão, Boleto, Pix automaticamente
            metadata: {
                psychologistId: String(psychologistId),
                planType: planType
            }
        });

        // Retorna o "Segredo" para o Frontend desenhar o formulário
        res.json({ 
            clientSecret: paymentIntent.client_secret 
        });

    } catch (error) {
        console.error('Erro Stripe:', error);
        res.status(500).json({ error: 'Erro ao criar pagamento' });
    }
};

// 2. WEBHOOK (Confirmação de Segurança)
exports.handleWebhook = async (req, res) => {
    const event = req.body;

    // Monitora se o pagamento deu certo
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { psychologistId, planType } = paymentIntent.metadata;

        console.log(`[STRIPE] Pagamento Aprovado: Psi ${psychologistId} - Plano ${planType}`);

        try {
            const psi = await db.Psychologist.findByPk(psychologistId);
            if (psi) {
                const hoje = new Date();
                const novaValidade = new Date(hoje.setDate(hoje.getDate() + 30));
                const planoFormatado = planType.charAt(0).toUpperCase() + planType.slice(1);

                await psi.update({
                    status: 'active',
                    subscription_expires_at: novaValidade,
                    plano: planoFormatado
                });
            }
        } catch (err) {
            console.error('Erro ao atualizar banco:', err);
        }
    }

    res.json({received: true});
};