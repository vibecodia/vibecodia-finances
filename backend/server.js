import webpush from 'web-push';

import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { registerCronJobs } from './cron/jobs.js';
import ConnectionManager from './db/connectionManager.js';

const { port, vapid, dbConnMap } = loadEnv();

// Configuração Web Push
if (!vapid.publicKey || !vapid.privateKey) {
  console.error('❌ ERRO: VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY devem estar no .env');
}

webpush.setVapidDetails(
  'mailto:contato@vibecodia.com.br',
  vapid.publicKey,
  vapid.privateKey
);

const connectionManager = new ConnectionManager(dbConnMap);

const app = createApp({
  connectionManager,
  vapidPublicKey: vapid.publicKey,
  dbConnMap,
});

registerCronJobs(connectionManager, Object.keys(dbConnMap));

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown: fecha o servidor HTTP e todas as conexões MongoDB.
function shutdown(signal) {
  console.log(`${signal} recebido. Encerrando servidor...`);
  server.close(async () => {
    try {
      await connectionManager.closeAll();
      console.log('Conexões MongoDB fechadas. Até logo!');
      process.exit(0);
    } catch (err) {
      console.error('Erro ao fechar conexões MongoDB:', err);
      process.exit(1);
    }
  });
  // Timeout de segurança para não travar o encerramento
  setTimeout(() => {
    console.error('Timeout no graceful shutdown. Forçando saída.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
