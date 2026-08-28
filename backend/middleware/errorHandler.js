import mongoose from 'mongoose';

// 404 JSON para rotas /api não encontradas.
// O original devolvia o index.html (SPA) até para /api/* desconhecido;
// agora rotas de API inexistentes retornam 404 estruturado, e o catch-all SPA
// continua valendo para todo o restante.
export function notFoundApiHandler(req, res, next) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'Rota não encontrada' });
  }
  next();
}

// Error handler centralizado — SEMPRE registrado por último (4 args).
// O Express 5 encaminha automaticamente promises rejeitadas dos handlers
// async para cá (validação do context7, layer.js), então as rotas não
// precisam mais de try/catch.
// Mapeia erros de cliente do Mongoose para 400; demais erros para 500.
// Shape padronizado em { message } — o frontend lê body.message.
export function errorHandler(err, req, res, _next) {
  const isClientError =
    err instanceof mongoose.Error.ValidationError ||
    err instanceof mongoose.Error.CastError ||
    err instanceof mongoose.Error.DocumentNotFoundError;

  const status = err.status || (isClientError ? 400 : 500);

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    message: err.message || 'Erro interno do servidor',
    ...(err.extra || {}),
  });
}
