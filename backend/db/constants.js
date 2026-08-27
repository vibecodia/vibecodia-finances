// Constantes compartilhadas dos enums de schema.
// Extraídas dos enums hardcoded do schema Transaction e Category para um único
// ponto de verdade — permite alterar a lista em um só lugar sem tocar no modelo.

export const TRANSACTION_TYPES = ['income', 'expense'];
export const RECURRENCE_TYPES = ['none', 'weekly', 'monthly', 'yearly'];
export const TRANSACTION_STATUS = ['active', 'deleted'];

// Discrimina o que um documento Category representa: categoria de despesa,
// categoria de receita ou meio de pagamento.
export const CATEGORY_TYPES = ['expense', 'income', 'payment_method'];
export const CATEGORY_STATUS = ['active', 'deleted'];

// Tipos de movimentação vinculada à meta (aporte / resgate)
export const SAVINGS_CONTRIBUTION_TYPES = ['deposit', 'withdrawal'];
