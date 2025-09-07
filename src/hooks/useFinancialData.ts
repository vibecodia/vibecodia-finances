import { useState, useEffect, useMemo } from 'react';
import { Transaction, SavingsGoal, SavingsContribution, MonthlyBalance } from '../types';
import { getCurrentBrazilDate, getBrazilDateString } from '../utils/helpers';
import { format } from 'date-fns';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const useFinancialData = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyBalance[]>([]);

  const calculateMonthlyBalances = useMemo(() => {
    return () => {
      const balancesMap = new Map<string, { income: number; expenses: number; }>();

      transactions.forEach(transaction => {
        const monthKey = format(new Date(transaction.date), 'yyyy-MM');
        if (!balancesMap.has(monthKey)) {
          balancesMap.set(monthKey, { income: 0, expenses: 0 });
        }
        const currentMonthData = balancesMap.get(monthKey)!;
        if (transaction.type === 'income' && transaction.isPaid) {
          currentMonthData.income += transaction.amount;
        } else if (transaction.type === 'expense' && transaction.isPaid) {
          currentMonthData.expenses += transaction.amount;
        }
      });

      const sortedMonthKeys = Array.from(balancesMap.keys()).sort();
      const calculatedBalances: MonthlyBalance[] = [];
      let previousMonthBalance = 0;

      sortedMonthKeys.forEach(monthKey => {
        const data = balancesMap.get(monthKey)!;
        const balance = data.income - data.expenses;
        calculatedBalances.push({
          month: monthKey,
          income: data.income,
          expenses: data.expenses,
          balance: balance + previousMonthBalance,
          remainingBalanceFromPreviousMonth: previousMonthBalance,
        });
        previousMonthBalance = balance; // The balance for the next month's remaining
      });
      setMonthlyBalances(calculatedBalances);
    };
  }, [transactions]);



  useEffect(() => {
    const fetchData = async () => {
      try {
        const [transactionsRes, goalsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/transactions`),
          fetch(`${API_BASE_URL}/goals`),
        ]);

        if (!transactionsRes.ok || !goalsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const transactionsData = await transactionsRes.json();
        const goalsData = await goalsRes.json();

        setTransactions(transactionsData);
        setSavingsGoals(goalsData);
      } catch (error) {
        console.error('Error fetching financial data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    calculateMonthlyBalances();
  }, [transactions, calculateMonthlyBalances]);



  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transaction,
          createdAt: getCurrentBrazilDate().toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Failed to add transaction');
      const newTransaction = await response.json();
      setTransactions(prev => [newTransaction, ...prev]);
      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error; // Re-throw to propagate the error
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update transaction');
      const updatedTransaction = await response.json();
      setTransactions(prev => prev.map(transaction =>
        transaction.id === id ? updatedTransaction : transaction
      ));
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw new Error('Failed to update transaction');
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete transaction');
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const updatePaymentStatus = async (id: string, isPaid: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid }),
      });
      if (!response.ok) throw new Error('Failed to update payment status');
      const updatedTransaction = await response.json();
      
      setTransactions(prev => prev.map(transaction =>
        transaction.id === id ? updatedTransaction : transaction
      ));
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const addSavingsGoal = async (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...goal,
          createdAt: getCurrentBrazilDate().toISOString(),
          contributions: [],
        }),
      });
      if (!response.ok) throw new Error('Failed to add savings goal');
      const newGoal = await response.json();
      setSavingsGoals(prev => [newGoal, ...prev]);
    } catch (error) {
      console.error('Error adding savings goal:', error);
    }
  };

  const updateSavingsGoal = async (id: string, updates: Partial<SavingsGoal>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update savings goal');
      const updatedGoal = await response.json();
      setSavingsGoals(prev => prev.map(goal =>
        goal.id === id ? updatedGoal : goal
      ));
    } catch (error) {
      console.error('Error updating savings goal:', error);
    }
  };

  const addSavingsContribution = async (goalId: string, amount: number, date?: string) => {
    try {
      const goalToUpdate = savingsGoals.find(g => g.id === goalId);
      if (!goalToUpdate) throw new Error('Goal not found');

      const contribution: Omit<SavingsContribution, 'id' | 'createdAt'> = {
        amount,
        date: date || getBrazilDateString(),
      };

      const response = await fetch(`${API_BASE_URL}/goals/${goalId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contribution),
      });

      if (!response.ok) throw new Error('Failed to add savings contribution');
      const updatedGoal = await response.json();
      setSavingsGoals(prev => prev.map(goal =>
        goal.id === goalId ? updatedGoal : goal
      ));
    } catch (error) {
      console.error('Error adding savings contribution:', error);
    }
  };

  const updateSavingsContribution = async (goalId: string, contributionId: string, updates: Partial<SavingsContribution>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/goals/${goalId}/contributions/${contributionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update savings contribution');
      const updatedGoal = await response.json();
      setSavingsGoals(prev => prev.map(goal =>
        goal.id === goalId ? updatedGoal : goal
      ));
    } catch (error) {
      console.error('Error updating savings contribution:', error);
    }
  };

  const deleteSavingsContribution = async (goalId: string, contributionId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/goals/${goalId}/contributions/${contributionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete savings contribution');
      const updatedGoal = await response.json();
      setSavingsGoals(prev => prev.map(goal =>
        goal.id === goalId ? updatedGoal : goal
      ));
    } catch (error) {
      console.error('Error deleting savings contribution:', error);
    }
  };

  const deleteSavingsGoal = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete savings goal');
      setSavingsGoals(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error('Error deleting savings goal:', error);
    }
  };

  const importData = async (newTransactions: Transaction[], newSavingsGoals: SavingsGoal[]) => {
    // This function might need a dedicated backend endpoint for bulk import
    // For now, it will clear existing data and then add new data one by one
    await clearAllData();
    for (const transaction of newTransactions) {
        await addTransaction(transaction);
      }
      for (const goal of newSavingsGoals) {
      await addSavingsGoal(goal);
    }
  };

  const clearAllData = async () => {
    try {
      // Delete all transactions
      
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  };

  return {
    transactions,
    savingsGoals,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updatePaymentStatus,
    addSavingsGoal,
    updateSavingsGoal,
    addSavingsContribution,
    updateSavingsContribution,
    deleteSavingsContribution,
    deleteSavingsGoal,
    importData,
    clearAllData,
    monthlyBalances,
  };
};