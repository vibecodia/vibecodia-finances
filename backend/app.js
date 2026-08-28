import path from 'path';
import { fileURLToPath } from 'url';

import cors from 'cors';
import express from 'express';

import { errorHandler, notFoundApiHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Monta a aplicação Express.
// Ordem (padrão Express, validado no context7):
//   1. middlewares globais
//   2. rotas de API (SEMPRE antes do catch-all SPA)
//   3. 404 JSON para /api não encontrado
//   4. catch-all SPA
//   5. error handler centralizado (SEMPRE por último, 4 args)
export function createApp({ connectionManager, vapidPublicKey, dbConnMap }) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api', apiRouter({
    connectionManager,
    vapidPublicKey,
    hasPin: (pin) => Object.prototype.hasOwnProperty.call(dbConnMap, pin),
  }));

  // 404 JSON para rotas /api não encontradas
  app.use(notFoundApiHandler);

  // ---------- Catch-all SPA (SEMPRE POR ÚLTIMO, exceto error handler) ----------
  // O express.static de backend/dist do original apontava para um diretório
  // inexistente (o frontend é servido pelo Vite) — foi removido. O catch-all
  // que serve o index.html é preservado.
  app.use((req, res) => {
    console.log('🎯 Catch-all handler acionado para:', req.url);
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });

  // Error handler centralizado — sempre o último
  app.use(errorHandler);

  return app;
}
