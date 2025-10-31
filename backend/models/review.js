'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Uma Avaliação (Review) pertence a um Paciente
      this.belongsTo(models.Patient, {
        foreignKey: 'patientId',
        as: 'patient'
      });
      // Uma Avaliação (Review) pertence a um Psicólogo
      this.belongsTo(models.Psychologist, {
        foreignKey: 'psychologistId',
        as: 'psychologist'
      });
    }
  }
  Review.init({
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    patientId: { // Chave estrangeira para o Paciente que fez a avaliação
      type: DataTypes.INTEGER,
      allowNull: false
    },
    psychologistId: { // Chave estrangeira para o Psicólogo avaliado
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Review',
  });
  return Review;
};