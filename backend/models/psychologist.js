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
      // define association here
    }
  }
  Psychologist.init({
    nome: DataTypes.STRING,
    crp: DataTypes.STRING,
    email: DataTypes.STRING,
    senha: DataTypes.STRING,
    abordagem: DataTypes.STRING,
    especialidades: DataTypes.STRING,
    cidade: DataTypes.STRING,
    online: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Psychologist',
  });
  return Psychologist;
};