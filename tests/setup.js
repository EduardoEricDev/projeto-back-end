const fs = require('fs');
const path = require('path');
const { sequelize, Sequelize } = require('../src/models');
const env = require('../src/config/env');

const migrationsDir = path.resolve(__dirname, '..', 'src', 'database', 'migrations');

async function resetDatabase() {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.dropAllTables();

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js'))
    .sort();

  for (const file of migrationFiles) {
    const migration = require(path.join(migrationsDir, file));
    await migration.up(queryInterface, Sequelize);
  }
}

function cleanupMediaDir() {
  if (fs.existsSync(env.mediaDir)) {
    fs.rmSync(env.mediaDir, { recursive: true, force: true });
  }
}

async function closeDatabase() {
  cleanupMediaDir();
  await sequelize.close();
}

module.exports = {
  resetDatabase,
  cleanupMediaDir,
  closeDatabase,
};
