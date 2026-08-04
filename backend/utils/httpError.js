// Erro HTTP com status explícito, para ser encaminhado ao error handler
// centralizado (que responde com err.status e espalha err.extra no body).
export function httpError(status, message, extra) {
  const err = new Error(message);
  err.status = status;
  if (extra) err.extra = extra;
  return err;
}
