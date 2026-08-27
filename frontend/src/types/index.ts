export type PaymentMethod = string;

// Categoria / meio de pagamento gerenciável. No modo autenticado vem do banco
// (coleção Category); no modo guest é persistido em localStorage. As flags
// substituem os checks por string ("Aporte" → isSavingsContribution, etc.).
export interface Category {
  _id?: string;
  id?: string;
  name: string;
  code: string;
  type: "expense" | "income" | "payment_method";
  isSavingsContribution?: boolean;
  isSavingsWithdrawal?: boolean;
  isPassiveIncome?: boolean;
  isBenefit?: boolean;
  includeInBalance?: boolean; // Cartão de benefício: contar no saldo quando o mestre global está desligado?
  isSystem?: boolean;
  emoji?: string;
  color?: string;
  descriptionTemplate?: string;
  descriptionSuggestions?: string[];
  order?: number;
  status?: "active" | "deleted";
}

// `category` e `paymentMethod` podem ser o nome legado (string, modo guest /
// dados antigos) ou o documento populado (modo autenticado).
export interface Transaction {
  _id?: string; // Adicionado para o MongoDB
  id: string; // Mantido para compatibilidade
  type: "expense" | "income";
  amount: number;
  description: string;
  category: string | Category;
  date: string;
  dueDate?: string; // Data de vencimento para gastos pendentes
  isPaid: boolean; // Status de pagamento
  recurrence: "none" | "weekly" | "monthly" | "yearly";
  paymentMethod?: string | Category; // Adicionado para despesas
  createdAt: string;
  updatedAt: string;
  notes?: any; // Adicionado para o campo de notas (pode ser string ou objeto estruturado)
  imageUrl?: string; // Link para o recibo/imagem
  savingsGoalId?: string; // ID da meta vinculada
  savingsGoalContributionId?: string; // ID da contribuição original
  status?: "active" | "deleted"; // Adicionado para Soft Delete
  deletedAt?: string; // Adicionado para Soft Delete
}

export interface SavingsContribution {
  _id?: string;
  id: string;
  amount: number;
  date: string; // Data da movimentação
  type?: "deposit" | "withdrawal"; // "deposit" = aporte, "withdrawal" = resgate
  isPaid?: boolean;
  transactionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  status?: "active" | "deleted"; // Adicionado para Soft Delete
  deletedAt?: string; // Adicionado para Soft Delete
}

export interface SavingsGoal {
  _id?: string; // Adicionado para o MongoDB
  id: string; // Mantido para compatibilidade
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  contributions: SavingsContribution[]; // Histórico de aportes
  createdAt: string;
  updatedAt: string;
  status?: "active" | "deleted"; // Adicionado para Soft Delete
  deletedAt?: string; // Adicionado para Soft Delete
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  unpaidExpenses?: number;
  goalsImpact?: number;
}

export interface MonthlyBalance {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  remainingBalanceFromPreviousMonth: number;
}

export interface CategoryData {
  category: string;
  code?: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface PendingPayment {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  category: string;
  isOverdue: boolean;
  daysUntilDue: number | null; // Alterado para permitir null
}
