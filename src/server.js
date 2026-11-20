const app = require('./app');
const env = require('./config/env');
const { sequelize } = require('./models');

async function startServer() {
  try {
    await sequelize.authenticate();
    app.listen(env.port, () => {
      console.log(`Servidor rodando na porta ${env.port}`);
      console.log(`Documentação Swagger em http://localhost:${env.port}/api-docs`);
    });
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error.message);
    process.exit(1);
  }
}

startServer();
