require('dotenv').config({ path: '../.env' }); // Carrega as variáveis de ambiente
const db = require('../models'); // Este caminho continua correto a partir da pasta 'scripts'
const bcrypt = require('bcryptjs');

async function seedTestData() {
    // Função Auxiliar: Gera um slug a partir de um nome
    const generateSlug = (name) => {
        return name
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres não alfanuméricos
            .replace(/\s+/g, '-');
    };
    try {
        // Sincroniza o banco de dados (cria tabelas se não existirem)
        // CUIDADO: db.sequelize.sync({ force: true }) apagaria todos os dados existentes!
        // Use apenas db.sequelize.sync() para criar/atualizar tabelas sem apagar dados.
        await db.sequelize.sync();
        console.log("Banco de dados sincronizado.");

        // --- 1. Criar um Paciente de Teste ---
        const patientPassword = await bcrypt.hash('password123', 10);
        const patientData = {
            nome: "Paciente Teste",
            email: "paciente.teste@girassol.com",
            senha: patientPassword,
            telefone: "(11) 98765-4321",
            valor_sessao_faixa: "R$ 91 - R$ 150", // Para match de preço
            temas_buscados: ["Ansiedade", "Estresse", "Relacionamentos"], // Para match de temas
            abordagem_desejada: ["Psicanálise", "Terapia Humanista"], // Para match de abordagem
            genero_profissional: "Feminino", // Para match de gênero
            praticas_afirmativas: ["Que tenha uma perspectiva feminista", "Que faça parte da comunidade LGBTQIAPN+"], // Para match de práticas
            disponibilidade_periodo: ["Manhã", "Noite"]
        };

        let patient = await db.Patient.findOne({ where: { email: patientData.email } });
        if (patient) {
            await patient.update(patientData);
            console.log("Paciente de teste atualizado:", patient.email);
        } else {
            patient = await db.Patient.create(patientData);
            console.log("Paciente de teste criado:", patient.email);
        }

        // --- 2. Criar um Psicólogo de Teste ---
        const psychologistPassword = await bcrypt.hash('password123', 10);
        const psychologistData = {
            nome: "Dra. Ana Psicóloga",
            crp: "06/123456",
            email: "ana.psicologa@girassol.com",
            senha: psychologistPassword,
            slug: generateSlug("Dra. Ana Psicóloga"),
            status: 'active', // Garante que o psicólogo esteja ativo para buscas
            valor_sessao_numero: 120.00, // Dentro da faixa do paciente
            temas_atuacao: ["Ansiedade", "Estresse", "Depressão", "Relacionamentos"], // Inclui temas do paciente
            abordagens_tecnicas: ["Psicanálise", "Terapia Humanista", "Terapia Cognitivo-Comportamental"], // Inclui abordagens do paciente
            genero_identidade: "Feminino", // Corresponde ao gênero preferido do paciente
            praticas_vivencias: ["Feminista", "LGBTQIAPN+ friendly", "Antirracista"], // Inclui práticas do paciente
            disponibilidade_periodo: ["Manhã", "Tarde", "Noite"], 
            bio: "Psicóloga com foco em terapia individual para adultos, oferecendo um espaço de escuta e acolhimento.",
            fotoUrl: "https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
        };

        let psychologist = await db.Psychologist.findOne({ where: { email: psychologistData.email } });
        if (psychologist) {
            // Se o psicólogo já existe, atualiza os dados MAS NÃO a senha,
            // para garantir que a senha de teste permaneça a mesma.
            const { senha, ...updateData } = psychologistData;
            await psychologist.update(updateData);
            console.log("Psicólogo de teste atualizado:", psychologist.email);
        } else {
            psychologist = await db.Psychologist.create(psychologistData);
            console.log("Psicólogo de teste criado:", psychologist.email);
        }

        // --- 3. Criar um segundo Psicólogo (menos compatível) ---
        const psychologist2Data = {
            nome: "Dr. Carlos Terapeuta",
            crp: "06/654321",
            email: "carlos.terapeuta@girassol.com",
            senha: await bcrypt.hash('password123', 10),
            slug: generateSlug("Dr. Carlos Terapeuta"),
            status: 'active',
            valor_sessao_numero: 70.00, // Fora da faixa principal do paciente, mas pode ser um "near match"
            temas_atuacao: ["Carreira", "Estresse"], // Apenas um tema em comum
            abordagens_tecnicas: ["Terapia Cognitivo-Comportamental"], // Nenhuma abordagem em comum com o paciente
            genero_identidade: "Masculino", // Não corresponde ao gênero preferido
            praticas_vivencias: [], // Nenhuma prática afirmativa em comum
            disponibilidade_periodo: ["Tarde"],
            bio: "Terapeuta focado em desenvolvimento de carreira e gestão de estresse.",
            fotoUrl: "https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
        };

        let psychologist2 = await db.Psychologist.findOne({ where: { email: psychologist2Data.email } });
        if (psychologist2) {
            // CORRIGIDO: Remove a senha do objeto de atualização para preservar a original
            const { senha, ...updateData2 } = psychologist2Data;
            await psychologist2.update(updateData2);
            console.log("Segundo psicólogo de teste atualizado:", psychologist2.email);
        } else {
            psychologist2 = await db.Psychologist.create(psychologist2Data);
            console.log("Segundo psicólogo de teste criado:", psychologist2.email);
        }

        console.log("Dados de teste criados/atualizados com sucesso!");

    } catch (error) {
        console.error("Erro ao popular o banco de dados:", error);
        // Se estamos executando este script diretamente, encerramos o processo com erro.
        if (require.main === module) {
            process.exit(1);
        }
    }
}

// Executa a função de seed apenas se este arquivo for o ponto de entrada principal
if (require.main === module) {
    seedTestData().finally(() => {
        // Não fechamos a conexão para não interferir com o nodemon
        console.log("Processo de seed finalizado.");
    });
}