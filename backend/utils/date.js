// Converte "yyyy-MM-dd" em Date local ao meio-dia (evita problemas de fuso
// horário na persistência). Extraído do server.js original sem alteração.
export const createLocalDateForStorage = (dateString) => {
  if (!dateString) return undefined;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); // Noon local time
};
