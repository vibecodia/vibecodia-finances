import { format, endOfMonth } from "date-fns";
import { useState, useEffect, useMemo, useCallback } from "react";

import { useCategoriesContext } from "../contexts/CategoriesContext";
import { useVerification } from "../contexts/VerificationContext";
import { Transaction, SavingsGoal, MonthlyBalance } from "../types";
import { getCurrentBrazilDate } from "../utils/helpers";

import { useSavingsGoals } from "./useSavingsGoals";
import { useTransactions } from "./useTransactions";

export const useFinancialData = () => {
  const { pin, isGuest, isInitializing } = useVerification();
  const { categories } = useCategoriesContext();
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyBalance[]>([]);

  const goalsHook = useSavingsGoals({
    pin,
    isGuest,
    isInitializing,
    onGoalsChange: () => {
      transactionsHook.fetchTransactions();
    },
  });

  const transactionsHook = useTransactions({
    pin,
    isGuest,
    isInitializing,
    categories,
    onTransactionChange: () => {
      goalsHook.refreshGoals();
    },
  });

  const calculateMonthlyBalances = useCallback(() => {
    const now = getCurrentBrazilDate();
    const todayStr = format(now, "yyyy-MM-dd");

    const balancesMap = new Map<
      string,
      { income: number; expenses: number }
    >();

    transactionsHook.transactions.forEach((transaction) => {
      const tDate = transaction.date.slice(0, 10);
      const monthKey = tDate.slice(0, 7);

      if (!balancesMap.has(monthKey)) {
        balancesMap.set(monthKey, { income: 0, expenses: 0 });
      }

      if (!transaction.isPaid) return;

      const [year, month] = monthKey.split("-").map(Number);
      const lastDayOfMonth = format(
        endOfMonth(new Date(year, month - 1, 1)),
        "yyyy-MM-dd",
      );
      const effectiveDate =
        lastDayOfMonth < todayStr ? lastDayOfMonth : todayStr;

      if (tDate > effectiveDate) return;

      const data = balancesMap.get(monthKey)!;
      if (transaction.type === "income") {
        data.income += transaction.amount;
      } else if (transaction.type === "expense") {
        data.expenses += transaction.amount;
      }
    });

    const sortedMonthKeys = Array.from(balancesMap.keys()).sort();
    const calculatedBalances: MonthlyBalance[] = [];
    let previousMonthBalance = 0;

    sortedMonthKeys.forEach((monthKey) => {
      const data = balancesMap.get(monthKey)!;
      const balance = data.income - data.expenses;
      calculatedBalances.push({
        month: monthKey,
        income: data.income,
        expenses: data.expenses,
        balance: balance + previousMonthBalance,
        remainingBalanceFromPreviousMonth: previousMonthBalance,
      });
      previousMonthBalance = balance + previousMonthBalance;
    });

    setMonthlyBalances(calculatedBalances);
  }, [transactionsHook.transactions]);

  useEffect(() => {
    calculateMonthlyBalances();
  }, [calculateMonthlyBalances]);

  const importData = async (
    newTransactions: Transaction[],
    newSavingsGoals: SavingsGoal[],
  ) => {
    await clearAllData();
    for (const transaction of newTransactions) {
      await transactionsHook.addTransaction(transaction);
    }
    for (const goal of newSavingsGoals) {
      await goalsHook.addSavingsGoal(goal);
    }
  };

  const clearAllData = async () => {
    try {
      // Clear data logic if needed
    } catch (error) {
      console.error("Error clearing all data:", error);
    }
  };

  const isLoading = useMemo(
    () => transactionsHook.isLoading || goalsHook.isLoading,
    [transactionsHook.isLoading, goalsHook.isLoading],
  );

  const hasLoaded = useMemo(
    () => transactionsHook.hasLoaded || goalsHook.hasLoaded,
    [transactionsHook.hasLoaded, goalsHook.hasLoaded],
  );

  const isSlowConnection = useMemo(
    () => transactionsHook.isSlowConnection || goalsHook.isSlowConnection,
    [transactionsHook.isSlowConnection, goalsHook.isSlowConnection],
  );

  const error = useMemo(
    () => transactionsHook.error || goalsHook.error,
    [transactionsHook.error, goalsHook.error],
  );

  const refetch = useCallback(async () => {
    await Promise.all([
      transactionsHook.fetchTransactions(),
      goalsHook.fetchGoals(),
    ]);
  }, [transactionsHook, goalsHook]);

  return {
    transactions: transactionsHook.transactions,
    savingsGoals: goalsHook.savingsGoals,
    addTransaction: transactionsHook.addTransaction,
    updateTransaction: transactionsHook.updateTransaction,
    deleteTransaction: transactionsHook.deleteTransaction,
    updatePaymentStatus: transactionsHook.updatePaymentStatus,
    addSavingsGoal: goalsHook.addSavingsGoal,
    updateSavingsGoal: goalsHook.updateSavingsGoal,
    archiveSavingsGoal: goalsHook.archiveSavingsGoal,
    unarchiveSavingsGoal: goalsHook.unarchiveSavingsGoal,
    deleteSavingsGoal: goalsHook.deleteSavingsGoal,
    addSavingsContribution: goalsHook.addSavingsContribution,
    updateSavingsContribution: goalsHook.updateSavingsContribution,
    deleteSavingsContribution: goalsHook.deleteSavingsContribution,
    restoreSavingsContribution: goalsHook.restoreSavingsContribution,
    importData,
    clearAllData,
    monthlyBalances,
    isLoading,
    hasLoaded,
    isSlowConnection,
    error,
    refetch,
  };
};
