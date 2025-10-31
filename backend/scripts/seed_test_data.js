require('dotenv').config({ path: '../.env' }); // Carrega as variáveis de ambiente
const db = require('../models');
const bcrypt = require('bcryptjs');

async function seedTestData() {
    try {
        // A opção { force: true } apaga todas as tabelas e as recria do zero.
        // Isso resolve o problema de conversão de tipo de coluna. Use apenas em desenvolvimento.
        await db.sequelize.sync({ force: true });
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
            telefone: "11999998888", // CAMPO ADICIONADO
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
            await psychologist.update(psychologistData);
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
            telefone: "11977776666", // CAMPO ADICIONADO
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
            await psychologist2.update(psychologist2Data);
            console.log("Segundo psicólogo de teste atualizado:", psychologist2.email);
        } else {
            psychologist2 = await db.Psychologist.create(psychologist2Data);
            console.log("Segundo psicólogo de teste criado:", psychologist2.email);
        }

        console.log("Dados de teste criados/atualizados com sucesso!");

    } catch (error) {
        console.error("Erro ao popular o banco de dados:", error);
    }
}

seedTestData();