require('dotenv').config();

const commonDefine = {
  underscored: true,
};

module.exports = {
  development: {
    dialect: process.env.DB_DIALECT || 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'drip_store',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    logging: false,
    define: commonDefine,
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: commonDefine,
  },
  production: {
    dialect: process.env.DB_DIALECT || 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    logging: false,
    define: commonDefine,
  },
};
