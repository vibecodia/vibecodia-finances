const mongoose = require("mongoose");

class ConnectionManager {
  constructor(connMap) {
    this.connMap = connMap;        // { "123": "mongodb+srv://.../db123", ... }
    this.connections = new Map();  // cache das conexões mongoose
  }

  async getConnection(pin) {
    if (this.connections.has(pin)) {
      return this.connections.get(pin);
    }

    const uri = this.connMap[pin];
    if (!uri) {
      throw new Error(`Nenhum banco configurado para o PIN ${pin}`);
    }

    const conn = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 5000,
    }).asPromise();

    this.connections.set(pin, conn);
    return conn;
  }
}

module.exports = ConnectionManager;
