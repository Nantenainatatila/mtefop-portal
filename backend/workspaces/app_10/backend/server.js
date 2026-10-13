const env = require('./config/env');
const app = require('./app');
const { pool, testConnection } = require('./config/db');

async function start() {
  try {
    await testConnection();
    console.log('✔ Connexion MySQL établie');
  } catch (err) {
    console.error('✖ Impossible de se connecter à MySQL :', err.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`✔ API MTEFOP Congés démarrée sur http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} reçu, arrêt du serveur...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});

start();
