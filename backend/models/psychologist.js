'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Psychologist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Um Psicólogo pode ter muitas Avaliações (Reviews)
      this.hasMany(models.Review, {
        foreignKey: 'psychologistId',
        as: 'reviews'
      });

      // Um Psicólogo pode ser favoritado por muitos Pacientes (relação N:M)
      this.belongsToMany(models.Patient, {
        through: 'PatientFavorites', // Mesmo nome da tabela de junção
        as: 'favoritedBy'
      });
    }
  }
  Psychologist.init({
    // --- CAMPOS ANTIGOS (Mantidos) ---
    nome: {
      type: DataTypes.STRING,
      allowNull: false
    },
    crp: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    senha: {
      type: DataTypes.STRING,
      allowNull: false
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fotoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // --- CAMPOS NOVOS (Do Questionário) ---
    // (Os campos 'abordagem', 'especialidades', 'cidade', 'online' foram removidos)
    valor_sessao_numero: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    temas_atuacao: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    },
    abordagens_tecnicas: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    },
    genero_identidade: {
      type: DataTypes.STRING,
      allowNull: true
    },
    praticas_vivencias: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    },
    disponibilidade_periodo: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Psychologist',
  });
  return Psychologist;
};