require('dotenv').config();
const path = require('path');

module.exports = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'chave-secreta-desenvolvimento',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  mediaDir: path.resolve(__dirname, '..', '..', 'uploads', 'media'),
};
