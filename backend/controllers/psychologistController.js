const db = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize'); // Importa os Operadores do Sequelize

// ----------------------------------------------------------------------
// Rota: POST /api/psychologists/register (Cadastro)
// ----------------------------------------------------------------------
exports.registerPsychologist = async (req, res) => {
    try {
        const { 
            nome, crp, email, senha, 
            valor_sessao_numero, 
            temas_atuacao, 
            abordagens_tecnicas, 
            genero_identidade, 
            praticas_vivencias, 
            disponibilidade_periodo 
        } = req.body;

        if (!nome || !crp || !email || !senha) {
            return res.status(400).json({ error: 'Nome, CRP, email e senha são obrigatórios.' });
        }

        const existingPsychologist = await db.Psychologist.findOne({ 
            where: { [Op.or]: [{ email: email }, { crp: crp }] }
        });

        if (existingPsychologist) {
            return res.status(409).json({ error: 'Este email ou CRP já está cadastrado.' });
        }

        // bcrypt.hash já gera o salt e faz o hash de forma segura
        const hashedPassword = await bcrypt.hash(senha, 10);

        const newPsychologist = await db.Psychologist.create({
            nome,
            crp,
            email,
            senha: hashedPassword,
            valor_sessao_numero: valor_sessao_numero || null,
            temas_atuacao: temas_atuacao || [],
            abordagens_tecnicas: abordagens_tecnicas || [],
            genero_identidade: genero_identidade || null,
            praticas_vivencias: praticas_vivencias || [],
            disponibilidade_periodo: disponibilidade_periodo || []
        });

        res.status(201).json({
            id: newPsychologist.id,
            nome: newPsychologist.nome,
            crp: newPsychologist.crp,
            email: newPsychologist.email,
            message: 'Profissional cadastrado com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao registrar profissional:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/matches (O MATCH com PONTUAÇÃO)
// ----------------------------------------------------------------------
exports.getMatches = async (req, res) => {
    try {
        const patient = req.patient; // Dados do paciente logado, fornecidos pelo middleware
        if (!patient) {
            return res.status(401).json({ error: 'Paciente não autenticado.' });
        }

        // Pega os IDs dos psicólogos favoritos do paciente logado
        const favoritePsychologists = await patient.getFavorites({ attributes: ['id'] });
        const favoriteIds = new Set(favoritePsychologists.map(fav => fav.id));
        
        // 1. Busca inicial: Filtra apenas por critérios essenciais (valor)
        const initialFilter = {};
        if (patient.valor_sessao_faixa) {
            const maxValorString = patient.valor_sessao_faixa.split(' - R$ ')[1] || patient.valor_sessao_faixa.split('Até R$ ')[1];
            const maxValor = parseFloat(maxValorString);
            if (!isNaN(maxValor)) {
                initialFilter.valor_sessao_numero = { [Op.lte]: maxValor };
            }
        }

        const psychologists = await db.Psychologist.findAll({
            where: initialFilter,
            attributes: [
                'id',
                'nome',
                'crp',
                // Adicione aqui os campos que você quer retornar para o card
                'fotoUrl', // Exemplo: se você tiver um campo de foto
                'bio',     // Exemplo: se tiver uma bio curta
                'valor_sessao_numero',
                'temas_atuacao',
                'abordagens_tecnicas',
                'genero_identidade',
                'praticas_vivencias',
                'disponibilidade_periodo'
            ]
        });

        // 2. Sistema de Pontuação
        const scoredPsychologists = psychologists.map(psy => {
            let score = 0;
            let perfectMatchCriteria = 0;
            const totalCriteria = 5; // Temas, Abordagem, Gênero, Práticas, Disponibilidade

            // Critério 1: Temas (Peso 3)
            if (patient.temas_buscados?.some(tema => psy.temas_atuacao?.includes(tema))) {
                score += 3;
                perfectMatchCriteria++;
            }

            // Critério 2: Abordagem (Peso 2)
            const abordagensDesejadas = patient.abordagem_desejada?.split(',').map(a => a.trim()) || [];
            if (abordagensDesejadas.length === 0 || abordagensDesejadas.includes("Não tenho certeza") || abordagensDesejadas.some(a => psy.abordagens_tecnicas?.includes(a))) {
                score += 2;
                perfectMatchCriteria++;
            }

            // Critério 3: Gênero (Peso 2)
            const generosDesejados = patient.genero_profissional?.split(',').map(g => g.trim()) || [];
            if (generosDesejados.length === 0 || generosDesejados.includes("Indiferente") || generosDesejados.some(g => psy.genero_identidade?.includes(g))) {
                score += 2;
                perfectMatchCriteria++;
            }

            // Critério 4: Práticas Afirmativas (Peso 2)
            if (!patient.praticas_afirmativas || patient.praticas_afirmativas.length === 0 || patient.praticas_afirmativas.some(p => psy.praticas_vivencias?.includes(p))) {
                score += 2;
                perfectMatchCriteria++;
            }

            // Critério 5: Disponibilidade (Peso 1)
            if (patient.disponibilidade_periodo?.some(p => psy.disponibilidade_periodo?.includes(p))) {
                score += 1;
                perfectMatchCriteria++;
            }

            // Adiciona a flag 'isFavorited' ao objeto do psicólogo
            const isFavorited = favoriteIds.has(psy.id);

            return { ...psy.get({ plain: true }), score, perfectMatchCriteria, totalCriteria, isFavorited };
        });

        // 3. Ordena os resultados pela pontuação (do maior para o menor)
        const sortedPsychologists = scoredPsychologists.sort((a, b) => b.score - a.score);

        // 4. Monta a resposta final para o frontend
        const topResults = sortedPsychologists.slice(0, 3); // Pega os 3 melhores
        let matchTier = 'none';
        let compromiseText = '';

        if (topResults.length > 0) {
            // Se o melhor resultado atende a todos os critérios, é 'ideal'
            if (topResults[0].perfectMatchCriteria === topResults[0].totalCriteria) {
                matchTier = 'ideal';
            } else {
                matchTier = 'near';
                compromiseText = "Ótima combinação nos <strong>temas de interesse</strong> e <strong>abordagem</strong>."; // Exemplo
            }
        }

        res.status(200).json({
            matchTier: matchTier,
            results: topResults,
            compromiseText: compromiseText
        });

    } catch (error) {
        console.error('Erro ao buscar matches:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao buscar matches.' });
    }
};


// ----------------------------------------------------------------------
// Rota: GET /api/psychologists/:id (Busca um psicólogo específico)
// ----------------------------------------------------------------------
exports.getPsychologistById = async (req, res) => {
    try {
        const psychologistId = req.params.id;

        const psychologist = await db.Psychologist.findByPk(psychologistId, {
            // Exclui a senha e outros campos sensíveis que não devem ir para o frontend
            attributes: { exclude: ['senha'] }
        });

        if (psychologist) {
            res.status(200).json(psychologist);
        } else {
            res.status(404).json({ error: 'Psicólogo não encontrado.' });
        }

    } catch (error) {
        console.error('Erro ao buscar psicólogo por ID:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};


// Futuramente: exports.loginPsychologist, etc.