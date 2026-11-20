const { Sequelize } = require('sequelize');
const databaseConfig = require('../config/database');
const env = require('../config/env');

const dbConfig = databaseConfig[env.nodeEnv] || databaseConfig.development;
const sequelize = new Sequelize(dbConfig);

const models = {
  User: require('./User')(sequelize),
  Category: require('./Category')(sequelize),
  Product: require('./Product')(sequelize),
  ProductImage: require('./ProductImage')(sequelize),
  ProductOption: require('./ProductOption')(sequelize),
  ProductCategory: require('./ProductCategory')(sequelize),
};

// Registra associações entre os modelos carregados
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

module.exports = {
  sequelize,
  Sequelize,
  ...models,
};
