// Logger mínimo, centralizado, para que futuramente seja trocado por
// pino/winston sem alterar os pontos de uso. Mensagens preservadas do
// código original (comportamento de log neutro).
export const logger = {
  info: (...args) => console.log(...args),
  debug: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};
