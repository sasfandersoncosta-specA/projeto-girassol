'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class WaitingList extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  WaitingList.init({
    nome: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    crp: {
      type: DataTypes.STRING,
      allowNull: true, // Pode ser nulo se o pré-cadastro não exigir
      unique: true
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending' // pending, invited, registered
    },
    invitationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    invitationExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Campos do perfil para análise de demanda
    valor_sessao_faixa: DataTypes.STRING,
    temas_atuacao: DataTypes.ARRAY(DataTypes.STRING),
    abordagens_tecnicas: DataTypes.ARRAY(DataTypes.STRING),
    genero_identidade: DataTypes.STRING,
    praticas_afirmativas: DataTypes.ARRAY(DataTypes.STRING),

  }, {
    sequelize,
    modelName: 'WaitingList',
  });
  return WaitingList;
};