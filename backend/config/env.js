import dotenv from 'dotenv';

// Carrega e valida a configuração a partir do .env.
// Extraído do server.js original: parse do MONGO_CONN_MAP com process.exit(1)
// em caso de erro e exposição das chaves VAPID.
export function loadEnv() {
  dotenv.config();

  let dbConnMap = {};
  try {
    dbConnMap = JSON.parse(process.env.MONGO_CONN_MAP || '{}');
  } catch (err) {
    console.error('Erro ao parsear MONGO_CONN_MAP:', err);
    process.exit(1);
  }

  return {
    port: process.env.PORT || 3001,
    vapid: {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    },
    dbConnMap,
  };
}
