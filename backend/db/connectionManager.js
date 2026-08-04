import mongoose from 'mongoose';

/**
 * Gerencia conexões MongoDB por PIN — uma conexão por banco, com cache.
 * Cada PIN mapeia para um URI em MONGO_CONN_MAP (env).
 *
 * Mantém a mesma lógica que existia inline no server.js original:
 * - cria a conexão de forma preguiçosa no primeiro acesso;
 * - registra eventos 'connected'/'error' por PIN;
 * - lança erro com a mesma mensagem para PIN inválido.
 * Adiciona closeAll() para o graceful shutdown.
 */
export default class ConnectionManager {
  constructor(connMap) {
    this.connMap = connMap;
    this.connections = new Map();
  }

  getConnection(pin) {
    const uri = this.connMap[pin];
    if (!uri) {
      throw new Error(`PIN inválido ou banco não configurado: ${pin}`);
    }

    if (!this.connections.has(pin)) {
      const conn = mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 5000,
      });

      conn.on('connected', () => {
        console.log(`MongoDB conectado para PIN ${pin}`);
      });

      conn.on('error', (err) => {
        console.error(`Erro na conexão do banco (${pin}):`, err);
      });

      this.connections.set(pin, conn);
    }

    return this.connections.get(pin);
  }

  async closeAll() {
    await Promise.all([...this.connections.values()].map((conn) => conn.close()));
    this.connections.clear();
  }
}
