// Seed das categorias padrão. Fonte de verdade dos defaults que antes viviam
// hardcoded no frontend:
//   - frontend/src/utils/helpers.ts → EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS
//   - frontend/src/components/FallingItems.tsx → CATEGORY_EMOJIS
//   - frontend/src/components/TransactionForm.tsx → sugestões de "Rendimentos"
//   - backend/services/sefaz.js → "Mercado", "Pets" (categorias do scanner)
//
// A ordem dos índices ("order") preserva a ordem original das listas, e os
// emojis vêm do CATEGORY_EMOJIS original.

const EXPENSE_DEFAULTS = [
  { name: 'Moradia', code: 'moradia', emoji: '🏠', color: '#8B5CF6', order: 0 },
  { name: 'Dívidas', code: 'dividas', emoji: '💸', color: '#EF4444', order: 1 },
  { name: 'Educação', code: 'educacao', emoji: '📚', color: '#3B82F6', order: 2 },
  { name: 'Serviços', code: 'servicos', emoji: '🛠️', color: '#6B7280', order: 3 },
  { name: 'Saúde', code: 'saude', emoji: '🏥', color: '#10B981', order: 4 },
  { name: 'Internet', code: 'internet', emoji: '🌐', color: '#06B6D4', order: 5 },
  { name: 'Transporte', code: 'transporte', emoji: '🚗', color: '#F59E0B', order: 6 },
  { name: 'Entretenimento', code: 'entretenimento', emoji: '🎬', color: '#EC4899', order: 7 },
  { name: 'Alimentação', code: 'alimentacao', emoji: '🍎', color: '#F97316', order: 8 },
  { name: 'Utilidades', code: 'utilidades', emoji: '💡', color: '#EAB308', order: 9 },
  { name: 'Beleza', code: 'beleza', emoji: '💄', color: '#D946EF', order: 10 },
  { name: 'Compras', code: 'compras', emoji: '🛍️', color: '#F43F5E', order: 11 },
  { name: 'Consumo', code: 'consumo', emoji: '🛒', color: '#84CC16', order: 12 },
  {
    name: 'Aporte', code: 'aporte', emoji: '📈', color: '#22C55E', order: 13,
    isSavingsContribution: true, isSystem: true,
    descriptionTemplate: 'Aporte: ${goal.name}',
  },
  { name: 'Outros', code: 'outros', emoji: '✨', color: '#9CA3AF', order: 14 },
  { name: 'Patrimônio', code: 'patrimonio', emoji: '🏠', color: '#0EA5E9', order: 15 },
  { name: 'Mercado', code: 'mercado', emoji: '🛒', color: '#22C55E', order: 16 },
  { name: 'Pets', code: 'pets', emoji: '🐾', color: '#A855F7', order: 17 },
];

const INCOME_DEFAULTS = [
  { name: 'Salário', code: 'salario', emoji: '💵', color: '#22C55E', order: 0 },
  { name: 'Vale', code: 'vale', emoji: '🎟️', color: '#F59E0B', order: 1 },
  { name: 'Reembolsos', code: 'reembolsos', emoji: '🔙', color: '#3B82F6', order: 2 },
  { name: 'Aluguéis', code: 'alugueis', emoji: '🏠', color: '#8B5CF6', order: 3 },
  { name: 'Premiação', code: 'premiacao', emoji: '🏆', color: '#EAB308', order: 4 },
  { name: 'Déc.Terceiro', code: 'decimo_terceiro', emoji: '🎄', color: '#EF4444', order: 5 },
  { name: 'Férias', code: 'ferias', emoji: '🏖️', color: '#06B6D4', order: 6 },
  {
    name: 'Rendimentos', code: 'rendimentos', emoji: '📊', color: '#F97316', order: 7,
    isPassiveIncome: true,
    descriptionSuggestions: [
      'Rendimentos simples',
      'Rendimento semanal cofrinhos',
      'Rendimento quinzenal cofrinhos',
      'Rendimento mensal cofrinhos',
    ],
  },
  {
    name: 'Resgate de Meta', code: 'resgate_meta', emoji: '🎯', color: '#10B981', order: 8,
    isSavingsWithdrawal: true, isSystem: true,
    descriptionTemplate: 'Resgate: ${goal.name}',
  },
];

const PAYMENT_METHOD_DEFAULTS = [
  { name: 'PIX', code: 'pix', emoji: '💠', color: '#14B8A6', order: 0 },
  { name: 'XP', code: 'xp', emoji: '📈', color: '#8B5CF6', order: 1 },
  { name: 'C6 Bank', code: 'c6_bank', emoji: '🏦', color: '#EF4444', order: 2 },
  { name: 'Bradesco T', code: 'bradesco_t', emoji: '🏦', color: '#3B82F6', order: 3 },
  { name: 'Bradesco R', code: 'bradesco_r', emoji: '🏦', color: '#3B82F6', order: 4 },
  { name: 'Nubank', code: 'nubank', emoji: '💜', color: '#A855F7', order: 5 },
  { name: 'Vero Card', code: 'vero_card', emoji: '💳', color: '#0EA5E9', order: 6, isBenefit: true, includeInBalance: true },
  { name: 'Flash', code: 'flash', emoji: '⚡', color: '#F59E0B', order: 7, isBenefit: true, includeInBalance: true },
  { name: 'Saldo em Conta', code: 'saldo_conta', emoji: '💰', color: '#22C55E', order: 8, isSystem: true },
  { name: 'Cartão Alimentação', code: 'cartao_alimentacao', emoji: '🍽️', color: '#F97316', order: 9, isBenefit: true, includeInBalance: true },
];

export const DEFAULT_CATEGORIES = [
  ...EXPENSE_DEFAULTS.map((c) => ({ ...c, type: 'expense' })),
  ...INCOME_DEFAULTS.map((c) => ({ ...c, type: 'income' })),
  ...PAYMENT_METHOD_DEFAULTS.map((c) => ({ ...c, type: 'payment_method' })),
];

// Constrói o mapa code → default para lookups rápidos (categoria de aporte,
// meio de pagamento de benefício, etc.) sem consultar o banco.
export const DEFAULT_CATEGORY_BY_CODE = new Map(
  DEFAULT_CATEGORIES.map((c) => [c.code, c]),
);
