// Resolve a conexão MongoDB pelo PIN informado no header `x-pin` ou query `pin`
// e anexa em `req.conn`. Mantém exatamente as mesmas respostas 400 do original.
export function dbMiddleware(connectionManager) {
  return function dbMiddleware(req, res, next) {
    const pin = req.header('x-pin') || req.query.pin;
    if (!pin) return res.status(400).json({ error: 'PIN obrigatório no header ou query' });
    try {
      req.conn = connectionManager.getConnection(pin);
      next();
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };
}
