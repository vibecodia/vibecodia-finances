import { Transaction, SavingsGoal } from "../../types";

const GUEST_TRANSACTIONS_KEY = "guest_transactions";
const GUEST_GOALS_KEY = "guest_goals";

export const guestStorageAdapter = {
  getTransactions(): Transaction[] {
    try {
      const stored = localStorage.getItem(GUEST_TRANSACTIONS_KEY);
      return stored ? (JSON.parse(stored) as Transaction[]) : [];
    } catch (error) {
      console.error("Erro ao ler transações do modo convidado:", error);
      return [];
    }
  },

  saveTransactions(transactions: Transaction[]): void {
    try {
      localStorage.setItem(GUEST_TRANSACTIONS_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error("Erro ao salvar transações do modo convidado:", error);
    }
  },

  getGoals(): SavingsGoal[] {
    try {
      const stored = localStorage.getItem(GUEST_GOALS_KEY);
      return stored ? (JSON.parse(stored) as SavingsGoal[]) : [];
    } catch (error) {
      console.error("Erro ao ler metas do modo convidado:", error);
      return [];
    }
  },

  saveGoals(goals: SavingsGoal[]): void {
    try {
      localStorage.setItem(GUEST_GOALS_KEY, JSON.stringify(goals));
    } catch (error) {
      console.error("Erro ao salvar metas do modo convidado:", error);
    }
  },

  clearAll(): void {
    try {
      localStorage.removeItem(GUEST_TRANSACTIONS_KEY);
      localStorage.removeItem(GUEST_GOALS_KEY);
    } catch (error) {
      console.error("Erro ao limpar dados do modo convidado:", error);
    }
  },
};
