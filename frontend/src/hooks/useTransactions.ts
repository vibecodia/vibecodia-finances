import { useState, useEffect, useCallback, useMemo } from "react";

import { guestStorageAdapter } from "../services/storage/guestStorageAdapter";
import { Transaction, Category } from "../types";
import { isSavingsContribution } from "../utils/categoryUtils";
import { getCurrentBrazilDate } from "../utils/helpers";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export interface UseTransactionsOptions {
  pin: string | null;
  isGuest: boolean;
  isInitializing: boolean;
  categories?: Category[];
  onTransactionChange?: () => void;
}

export const useTransactions = ({
  pin,
  isGuest,
  isInitializing,
  categories = [],
  onTransactionChange,
}: UseTransactionsOptions) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-pin": pin || "",
    }),
    [pin],
  );

  const fetchTransactions = useCallback(async () => {
    if (isInitializing) return;

    if (isGuest) {
      setIsLoading(true);
      setIsSlowConnection(false);
      setError(null);
      try {
        const stored = guestStorageAdapter.getTransactions();
        setTransactions(stored);
        setHasLoaded(true);
      } catch (err) {
        console.error("Error reading guest transactions:", err);
        setError("Erro ao ler transações locais.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!pin) {
      setTransactions([]);
      setIsLoading(false);
      setHasLoaded(false);
      setIsSlowConnection(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Guardrail de conexão lenta: se demorar mais de 3.5s, ativa o aviso amigável
    const slowTimer = setTimeout(() => {
      setIsSlowConnection(true);
    }, 3500);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 12000); // 12s de timeout máximo

    try {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        headers,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Falha ao carregar transações");
      const data = await response.json();
      setTransactions(data);
      setHasLoaded(true);
      setError(null);
    } catch (err: unknown) {
      const isAbort =
        err instanceof Error && err.name === "AbortError";
      const message = isAbort
        ? "Tempo limite de conexão excedido. A rede pode estar instável."
        : err instanceof Error
          ? err.message
          : "Erro ao conectar com o servidor.";
      console.error("Error fetching transactions:", err);
      setError(message);
      if (!hasLoaded) {
        setTransactions([]);
      }
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(timeoutId);
      setIsSlowConnection(false);
      setIsLoading(false);
    }
  }, [hasLoaded, headers, isGuest, isInitializing, pin]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = async (
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ) => {
    if (!pin && !isGuest) throw new Error("PIN not verified");

    if (isGuest) {
      const newTransaction: Transaction = {
        ...transaction,
        id: crypto.randomUUID(),
        createdAt: getCurrentBrazilDate().toISOString(),
        updatedAt: getCurrentBrazilDate().toISOString(),
      };
      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);
      guestStorageAdapter.saveTransactions(updatedTransactions);

      if (
        isSavingsContribution(newTransaction.category, categories) &&
        newTransaction.savingsGoalId
      ) {
        onTransactionChange?.();
      }
      return newTransaction;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...transaction,
          createdAt: getCurrentBrazilDate().toISOString(),
        }),
      });
      if (!response.ok) {
        let message = "Falha ao adicionar transação";
        try {
          const body = await response.json();
          if (body?.message) message = body.message;
        } catch {
          message = "Falha ao adicionar transação";
        }
        throw new Error(message);
      }
      const newTransaction = await response.json();
      setTransactions((prev) => [newTransaction, ...prev]);
      if (
        isSavingsContribution(newTransaction?.category, categories) &&
        newTransaction?.savingsGoalId
      ) {
        onTransactionChange?.();
      }
      return newTransaction;
    } catch (error) {
      console.error("Error adding transaction:", error);
      throw error;
    }
  };

  const updateTransaction = async (
    id: string,
    updates: Partial<Transaction>,
  ) => {
    if (!pin && !isGuest) throw new Error("PIN not verified");

    if (isGuest) {
      const updatedTransactions = transactions.map((t) =>
        t.id === id
          ? {
              ...t,
              ...updates,
              updatedAt: getCurrentBrazilDate().toISOString(),
            }
          : t,
      );
      setTransactions(updatedTransactions);
      guestStorageAdapter.saveTransactions(updatedTransactions);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update transaction");
      const updatedTransaction = await response.json();
      setTransactions((prev) =>
        prev.map((transaction) =>
          transaction.id === id ? updatedTransaction : transaction,
        ),
      );
      fetchTransactions();
    } catch (error) {
      console.error("Error updating transaction:", error);
      throw new Error("Failed to update transaction");
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!pin && !isGuest) throw new Error("PIN not verified");

    if (isGuest) {
      const updatedTransactions: Transaction[] = transactions.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "deleted",
              deletedAt: getCurrentBrazilDate().toISOString(),
            }
          : t,
      );
      setTransactions(updatedTransactions);
      guestStorageAdapter.saveTransactions(updatedTransactions);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) throw new Error("Failed to delete transaction");

      setTransactions((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: "deleted", deletedAt: new Date().toISOString() }
            : t,
        ),
      );
      fetchTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  const updatePaymentStatus = async (id: string, isPaid: boolean) => {
    if (!pin && !isGuest) throw new Error("PIN not verified");

    if (isGuest) {
      const updatedTransactions = transactions.map((t) =>
        t.id === id
          ? { ...t, isPaid, updatedAt: getCurrentBrazilDate().toISOString() }
          : t,
      );
      setTransactions(updatedTransactions);
      guestStorageAdapter.saveTransactions(updatedTransactions);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ isPaid }),
      });
      if (!response.ok) throw new Error("Failed to update payment status");
      const updatedTransaction = await response.json();

      setTransactions((prev) =>
        prev.map((transaction) =>
          transaction.id === id ? updatedTransaction : transaction,
        ),
      );
      if (
        isSavingsContribution(updatedTransaction?.category, categories) &&
        updatedTransaction?.savingsGoalId
      ) {
        onTransactionChange?.();
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
    }
  };

  return {
    transactions,
    isLoading,
    hasLoaded,
    isSlowConnection,
    error,
    fetchTransactions,
    setTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updatePaymentStatus,
  };
};
