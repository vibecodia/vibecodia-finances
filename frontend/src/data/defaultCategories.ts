import { Category } from "../types";

// Defaults das categorias. Espelha o seed do backend (backend/db/seed/categories.js),
// que é a fonte de verdade. Este arquivo existe APENAS para:
//   - bootstrap do modo guest (offline, localStorage)
//   - cache local antes de a API responder no modo autenticado
// As flags e emojis vêm das listas que eram hardcoded
// (EXPENSE_CATEGORIES/INCOME_CATEGORIES/PAYMENT_METHODS + CATEGORY_EMOJIS).

type DefaultSeed = Omit<Category, "id" | "status"> & { order: number };

const EXPENSE_DEFAULTS: DefaultSeed[] = [
  { name: "Moradia", code: "moradia", type: "expense", emoji: "🏠", color: "#8B5CF6", order: 0 },
  { name: "Dívidas", code: "dividas", type: "expense", emoji: "💸", color: "#EF4444", order: 1 },
  { name: "Educação", code: "educacao", type: "expense", emoji: "📚", color: "#3B82F6", order: 2 },
  { name: "Serviços", code: "servicos", type: "expense", emoji: "🛠️", color: "#6B7280", order: 3 },
  { name: "Saúde", code: "saude", type: "expense", emoji: "🏥", color: "#10B981", order: 4 },
  { name: "Internet", code: "internet", type: "expense", emoji: "🌐", color: "#06B6D4", order: 5 },
  { name: "Transporte", code: "transporte", type: "expense", emoji: "🚗", color: "#F59E0B", order: 6 },
  { name: "Entretenimento", code: "entretenimento", type: "expense", emoji: "🎬", color: "#EC4899", order: 7 },
  { name: "Alimentação", code: "alimentacao", type: "expense", emoji: "🍎", color: "#F97316", order: 8 },
  { name: "Utilidades", code: "utilidades", type: "expense", emoji: "💡", color: "#EAB308", order: 9 },
  { name: "Beleza", code: "beleza", type: "expense", emoji: "💄", color: "#D946EF", order: 10 },
  { name: "Compras", code: "compras", type: "expense", emoji: "🛍️", color: "#F43F5E", order: 11 },
  { name: "Consumo", code: "consumo", type: "expense", emoji: "🛒", color: "#84CC16", order: 12 },
  {
    name: "Aporte", code: "aporte", type: "expense", emoji: "📈", color: "#22C55E", order: 13,
    isSavingsContribution: true, isSystem: true, descriptionTemplate: "Aporte: ${goal.name}",
  },
  { name: "Outros", code: "outros", type: "expense", emoji: "✨", color: "#9CA3AF", order: 14 },
  { name: "Patrimônio", code: "patrimonio", type: "expense", emoji: "🏠", color: "#0EA5E9", order: 15 },
  { name: "Mercado", code: "mercado", type: "expense", emoji: "🛒", color: "#22C55E", order: 16 },
  { name: "Pets", code: "pets", type: "expense", emoji: "🐾", color: "#A855F7", order: 17 },
];

const INCOME_DEFAULTS: DefaultSeed[] = [
  { name: "Salário", code: "salario", type: "income", emoji: "💵", color: "#22C55E", order: 0 },
  { name: "Vale", code: "vale", type: "income", emoji: "🎟️", color: "#F59E0B", order: 1 },
  { name: "Reembolsos", code: "reembolsos", type: "income", emoji: "🔙", color: "#3B82F6", order: 2 },
  { name: "Aluguéis", code: "alugueis", type: "income", emoji: "🏠", color: "#8B5CF6", order: 3 },
  { name: "Premiação", code: "premiacao", type: "income", emoji: "🏆", color: "#EAB308", order: 4 },
  { name: "Déc.Terceiro", code: "decimo_terceiro", type: "income", emoji: "🎄", color: "#EF4444", order: 5 },
  { name: "Férias", code: "ferias", type: "income", emoji: "🏖️", color: "#06B6D4", order: 6 },
  {
    name: "Rendimentos", code: "rendimentos", type: "income", emoji: "📊", color: "#F97316", order: 7,
    isPassiveIncome: true,
    descriptionSuggestions: [
      "Rendimentos simples",
      "Rendimento semanal cofrinhos",
      "Rendimento quinzenal cofrinhos",
      "Rendimento mensal cofrinhos",
    ],
  },
  {
    name: "Resgate de Meta", code: "resgate_meta", type: "income", emoji: "🎯", color: "#10B981", order: 8,
    isSavingsWithdrawal: true, isSystem: true, descriptionTemplate: "Resgate: ${goal.name}",
  },
];

const PAYMENT_METHOD_DEFAULTS: DefaultSeed[] = [
  { name: "PIX", code: "pix", type: "payment_method", emoji: "💠", color: "#14B8A6", order: 0 },
  { name: "XP", code: "xp", type: "payment_method", emoji: "📈", color: "#8B5CF6", order: 1 },
  { name: "C6 Bank", code: "c6_bank", type: "payment_method", emoji: "🏦", color: "#EF4444", order: 2 },
  { name: "Bradesco T", code: "bradesco_t", type: "payment_method", emoji: "🏦", color: "#3B82F6", order: 3 },
  { name: "Bradesco R", code: "bradesco_r", type: "payment_method", emoji: "🏦", color: "#3B82F6", order: 4 },
  { name: "Nubank", code: "nubank", type: "payment_method", emoji: "💜", color: "#A855F7", order: 5 },
  { name: "Vero Card", code: "vero_card", type: "payment_method", emoji: "💳", color: "#0EA5E9", order: 6, isBenefit: true, includeInBalance: true },
  { name: "Flash", code: "flash", type: "payment_method", emoji: "⚡", color: "#F59E0B", order: 7, isBenefit: true, includeInBalance: true },
  { name: "Saldo em Conta", code: "saldo_conta", type: "payment_method", emoji: "💰", color: "#22C55E", order: 8, isSystem: true },
  { name: "Cartão Alimentação", code: "cartao_alimentacao", type: "payment_method", emoji: "🍽️", color: "#F97316", order: 9, isBenefit: true, includeInBalance: true },
];

export const DEFAULT_CATEGORIES: Category[] = [
  ...EXPENSE_DEFAULTS,
  ...INCOME_DEFAULTS,
  ...PAYMENT_METHOD_DEFAULTS,
].map((c) => ({ ...c, id: `cat-${c.code}`, status: "active" as const }));

export const DEFAULT_CATEGORY_BY_CODE = new Map(
  DEFAULT_CATEGORIES.map((c) => [c.code, c]),
);
