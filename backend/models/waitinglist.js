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
      // No momento, não precisa de associações.
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
      unique: true, // Evita que o mesmo email seja adicionado várias vezes
      validate: {
        isEmail: true
      }
    },
    crp: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true // Evita que o mesmo CRP seja adicionado várias vezes
    },
    temas_atuacao: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'WaitingList',
  });
  return WaitingList;
};