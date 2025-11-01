const db = require('../models');

/**
 * Funções auxiliares movidas do controller para o service.
 */
const parsePriceRange = (rangeString) => {
    if (!rangeString) return { min: 0, max: Infinity };
    if (rangeString === "Até R$ 50") return { min: 0, max: 50 };
    if (rangeString === "R$ 51 - R$ 90") return { min: 51, max: 90 };
    if (rangeString === "R$ 91 - R$ 150") return { min: 91, max: 150 };
    if (rangeString === "Acima de R$ 150") return { min: 151, max: Infinity };
    return { min: 0, max: Infinity };
};

const mapPatientPracticesToPsychologist = (patientPractices) => {
    if (!patientPractices || patientPractices.length === 0) return [];
    const mapping = {
        "Que faça parte da comunidade LGBTQIAPN+": "LGBTQIAPN+ friendly",
        "Que seja uma pessoa não-branca (racializada) / prática antirracista": "Antirracista",
        "Que tenha uma perspectiva feminista": "Feminista",
        "Que entenda de neurodiversidade (TDAH, Autismo, etc.)": "Neurodiversidade",
    };
    return patientPractices.map(p => mapping[p]).filter(p => p);
};

/**
 * Função principal que encapsula toda a lógica de match.
 * @param {object} patientPreferences - As preferências do paciente.
 * @returns {object} - Um objeto com { matchTier, results, compromiseText? }.
 */
const findMatches = async (patientPreferences) => {
    // 1. Busca todos os psicólogos ativos
    let psychologists = await db.Psychologist.findAll({
        where: { status: 'active' },
        attributes: { exclude: ['senha'] }
    });

    // 2. Prepara dados para o cálculo
    const { min: patientMinPrice, max: patientMaxPrice } = parsePriceRange(patientPreferences.valor_sessao_faixa);
    const mappedPatientPractices = mapPatientPracticesToPsychologist(patientPreferences.praticas_afirmativas);

    // 3. Calcula a pontuação para cada psicólogo
    psychologists.forEach(psy => {
        let score = 0;
        let matchDetails = [];

        // Critério 1: Gênero do Profissional (Filtro Rígido)
        if (patientPreferences.genero_profissional && patientPreferences.genero_profissional !== "Indiferente") {
            if (psy.genero_identidade === patientPreferences.genero_profissional) {
                score += 10;
                matchDetails.push("Gênero do profissional");
            } else {
                score -= 1000; // Penalidade alta para desqualificar
            }
        }

        // Critério 2: Faixa de Valor
        if (psy.valor_sessao_numero >= patientMinPrice && psy.valor_sessao_numero <= patientMaxPrice) {
            score += 10;
            matchDetails.push("Faixa de valor");
        }

        // Critério 3: Temas Buscados
        if (patientPreferences.temas_buscados?.length > 0 && psy.temas_atuacao?.length > 0) {
            const commonTemas = patientPreferences.temas_buscados.filter(tema => psy.temas_atuacao.includes(tema));
            score += commonTemas.length * 3;
            if (commonTemas.length > 0) matchDetails.push("Temas de atuação");
        }

        // Critério 4: Abordagem Terapêutica
        if (patientPreferences.abordagem_desejada?.length > 0 && psy.abordagens_tecnicas?.length > 0) {
            const commonAbordagens = patientPreferences.abordagem_desejada.filter(abordagem => psy.abordagens_tecnicas.includes(abordagem));
            score += commonAbordagens.length * 3;
            if (commonAbordagens.length > 0) matchDetails.push("Abordagem terapêutica");
        }

        // Critério 5: Práticas Afirmativas
        if (mappedPatientPractices.length > 0 && psy.praticas_vivencias?.length > 0) {
            const commonPractices = mappedPatientPractices.filter(practice => psy.praticas_vivencias.includes(practice));
            score += commonPractices.length * 5;
            if (commonPractices.length > 0) matchDetails.push("Práticas afirmativas");
        }

        psy.dataValues.score = score;
        psy.dataValues.matchDetails = matchDetails;
    });

    // 4. Filtra e ordena os resultados
    const relevantPsychologists = psychologists
        .filter(psy => psy.dataValues.score > 0)
        .sort((a, b) => b.dataValues.score - a.dataValues.score);

    // 5. Define os "tiers" de match e retorna o resultado
    const IDEAL_MATCH_THRESHOLD = 20;
    const idealMatches = relevantPsychologists.filter(psy => psy.dataValues.score >= IDEAL_MATCH_THRESHOLD);

    if (idealMatches.length > 0) {
        return {
            matchTier: 'ideal',
            results: idealMatches.slice(0, 3)
        };
    }

    if (relevantPsychologists.length > 0) {
        return {
            matchTier: 'near',
            results: relevantPsychologists.slice(0, 3),
            compromiseText: "Não encontramos um perfil 100% compatível, mas estes profissionais se aproximam do que você busca."
        };
    }

    return {
        matchTier: 'none',
        results: []
    };
};

module.exports = {
    findMatches
};