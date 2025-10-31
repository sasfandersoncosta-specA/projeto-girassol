'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];
const db = {};

// Cria um objeto de opções de configuração para o Sequelize.
const sequelizeOptions = { ...config, dialect: 'postgres' };

let sequelize;
if (config.use_env_variable) {
  // Se for produção, adiciona as opções de SSL.
  if (env === 'production') {
    sequelizeOptions.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false // Necessário para o Render
      }
    };
  }
  sequelize = new Sequelize(process.env[config.use_env_variable], sequelizeOptions);
} else {
  // A mesma lógica se aplica aqui.
  sequelize = new Sequelize(sequelizeOptions);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// AQUI ESTÁ A CORREÇÃO: Este bloco percorre todos os modelos
// e chama a função 'associate' se ela existir, criando as relações.
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
