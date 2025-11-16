// backend/models/question.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Question extends Model {
    static associate(models) {
      this.hasMany(models.Answer, { as: 'answers', foreignKey: 'questionId' });
    }
  }

  Question.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending_review', 'approved', 'answered', 'rejected'),
      defaultValue: 'pending_review',
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Question',
    tableName: 'questions',
    timestamps: true, // Adiciona createdAt e updatedAt
  });

  return Question;
};