// backend/cron/demandMonitor.js

const { Op } = require('sequelize');
const db = require('../models');
const { sendInvitationEmail } = require('./backend/services/emailService');
const crypto = require('crypto');

const LIQUIDITY_TARGET = 8; // Número-alvo de profissionais por nicho

/**
 * Identifica os "bolsões de demanda" mais comuns na lista de espera.
 * Em um sistema real, isso poderia ser cruzado com dados de busca de pacientes.
 * Para este exemplo, vamos focar nos perfis mais repetidos na lista de espera.
 */
async function findDemandGaps() {
    console.log('CRON: Iniciando verificação de gaps de demanda...');

    // 1. Busca todos os perfis pendentes
    const pendingProfiles = await db.WaitingList.findAll({
        where: { status: 'pending' },
    });

    // 2. Cria uma lista de nichos únicos em memória para evitar consultas repetidas
    const uniqueNiches = new Map();
    pendingProfiles.forEach(profile => {
        // Cria uma chave única para o nicho (preço + temas + práticas)
        const nicheKey = `${profile.valor_sessao_faixa}|${[...profile.temas_atuacao].sort().join(',')}|${[...profile.praticas_afirmativas].sort().join(',')}`;
        if (!uniqueNiches.has(nicheKey)) {
            uniqueNiches.set(nicheKey, {
                valor_sessao_faixa: profile.valor_sessao_faixa,
                temas_atuacao: profile.temas_atuacao,
                praticas_afirmativas: profile.praticas_afirmativas,
            });
        }
    });

    // 3. Itera sobre os nichos únicos e verifica a demanda para cada um
    for (const niche of uniqueNiches.values()) {
        // Para cada nicho identificado, verifica a oferta atual de psicólogos ativos
        const activePsychologistsCount = await db.Psychologist.count({
            where: {
                status: 'active',
                valor_sessao_faixa: niche.valor_sessao_faixa,
                temas_atuacao: { [Op.contains]: niche.temas_atuacao },
                praticas_vivencias: { [Op.contains]: niche.praticas_afirmativas }
            }
        });

        console.log(`CRON: Nicho [${niche.valor_sessao_faixa}] - Ativos: ${activePsychologistsCount} | Alvo: ${LIQUIDITY_TARGET}`);

        // Se a oferta atual for menor que o alvo, há uma vaga!
        if (activePsychologistsCount < LIQUIDITY_TARGET) {
            console.log(`CRON: Gap de liquidez encontrado! Iniciando processo de convite.`);
            await inviteNextInLine(niche);
        }
    }
    console.log('CRON: Verificação de gaps de demanda finalizada.');
}

/**
 * Encontra o próximo profissional na fila para um nicho específico e envia o convite.
 * @param {object} niche - O nicho com gap de demanda.
 */
async function inviteNextInLine(niche) {
    // Lógica FIFO: Encontra o profissional mais antigo na lista de espera para este nicho
    const candidate = await db.WaitingList.findOne({
        where: {
            status: 'pending',
            valor_sessao_faixa: niche.valor_sessao_faixa,
            temas_atuacao: niche.temas_atuacao,
            praticas_afirmativas: niche.praticas_afirmativas, // CORRIGIDO para corresponder ao modelo
        },
        order: [['createdAt', 'ASC']] // First-In
    });

    if (candidate) {
        const invitationToken = crypto.randomBytes(32).toString('hex');
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7); // Expira em 7 dias

        await candidate.update({
            status: 'invited',
            invitationToken: invitationToken,
            invitationExpiresAt: expirationDate,
        });

        const invitationLink = `http://127.0.0.1:5500/psi_registro.html?token=${invitationToken}`;
        await sendInvitationEmail(candidate, invitationLink);
        console.log(`CRON: Convite enviado para ${candidate.email}.`);
    }
}

// Exporta a função principal para que possa ser chamada pelo agendador
module.exports = { findDemandGaps };