import { format, endOfMonth } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';

import { useVerification } from '../contexts/VerificationContext';
import { Transaction, SavingsGoal, SavingsContribution, MonthlyBalance } from '../types';
import { getCurrentBrazilDate, getBrazilDateString } from '../utils/helpers';
import { saveToSyncQueue, registerBackgroundSync } from '../utils/db';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'https://finances.vibecodia.com.br/api';

export const useFinancialData = () => {
  const { pin, isInitializing } = useVerification();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    'x-pin': pin || '',
  }), [pin]);

  const fetchData = async () => {
    if (isInitializing) {
      return; // Wait for verification context to initialize
    }
    if (!pin) {
      setTransactions([]);
      setSavingsGoals([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [transactionsRes, goalsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/transactions`, { headers }),
        fetch(`${API_BASE_URL}/goals`, { headers }),
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
      setTransactions([]);
      setSavingsGoals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshGoals = async () => {
    if (isInitializing || !pin) return;
    try {
      const goalsRes = await fetch(`${API_BASE_URL}/goals`, { headers });
      if (!goalsRes.ok) return;
      const goalsData = await goalsRes.json();
      setSavingsGoals(goalsData);
    } catch {
      return;
    }
  };

  const calculateMonthlyBalances = useMemo(() => {
    return () => {
      const now = getCurrentBrazilDate();
      const todayStr = format(now, 'yyyy-MM-dd');

      const balancesMap = new Map<string, { income: number; expenses: number }>();

      transactions.forEach(transaction => {
        const tDate = transaction.date.slice(0, 10); // sem new Date(), sem risco de fuso
        const monthKey = tDate.slice(0, 7);          // "yyyy-MM" direto da string

        if (!balancesMap.has(monthKey)) {
          balancesMap.set(monthKey, { income: 0, expenses: 0 });
        }

        if (!transaction.isPaid) return;

        // Só conta se a transação é <= data efetiva do mês
        // Para meses passados: último dia do mês. Para mês atual: hoje.
        const [year, month] = monthKey.split('-').map(Number);
        const lastDayOfMonth = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
        const effectiveDate = lastDayOfMonth < todayStr ? lastDayOfMonth : todayStr;

        if (tDate > effectiveDate) return;

        const data = balancesMap.get(monthKey)!;
        if (transaction.type === 'income') {
          data.income += transaction.amount;
        } else if (transaction.type === 'expense') {
          data.expenses += transaction.amount;
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
        previousMonthBalance = balance + previousMonthBalance;
      });

      setMonthlyBalances(calculatedBalances);
    };
  }, [transactions]);

  useEffect(() => {
    fetchData();
  }, [pin, headers, isInitializing]);

  useEffect(() => {
    calculateMonthlyBalances();
  }, [transactions, calculateMonthlyBalances]);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!pin) throw new Error('PIN not verified');
    
    const idempotencyKey = crypto.randomUUID();
    const url = `${API_BASE_URL}/transactions`;
    const body = JSON.stringify({
      ...transaction,
      idempotencyKey,
      createdAt: getCurrentBrazilDate().toISOString(),
    });
    const requestHeaders = {
      ...headers,
      'X-Idempotency-Key': idempotencyKey,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body,
      });
      if (!response.ok) {
        let message = 'Falha ao adicionar transação';
        try {
          const body = await response.json();
          if (body?.message) message = body.message;
        } catch {
          message = 'Falha ao adicionar transação';
        }
        throw new Error(message);
      }
      const newTransaction = await response.json();
      setTransactions(prev => [newTransaction, ...prev]);
      if (newTransaction?.category === 'Aporte' && newTransaction?.savingsGoalId) {
        refreshGoals();
      }
      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      
      // Se falhar por rede (offline), enfileiramos no IndexedDB
      if (!navigator.onLine || (error instanceof TypeError && error.message === 'Failed to fetch')) {
        await saveToSyncQueue({
          url,
          method: 'POST',
          headers: requestHeaders,
          body,
        });
        await registerBackgroundSync();
        
        // Simular sucesso localmente para UX
        const tempTransaction: Transaction = {
          ...transaction,
          id: `temp-${idempotencyKey}`,
          createdAt: getCurrentBrazilDate().toISOString(),
          updatedAt: getCurrentBrazilDate().toISOString(),
          status: 'active'
        } as Transaction;
        
        setTransactions(prev => [tempTransaction, ...prev]);
        return tempTransaction;
      }
      
      throw error;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!pin) throw new Error('PIN not verified');
    const url = `${API_BASE_URL}/transactions/${id}`;
    const method = 'PUT';
    const body = JSON.stringify(updates);
    
    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
      });
      if (!response.ok) throw new Error('Failed to update transaction');
      const updatedTransaction = await response.json();
      setTransactions(prev => prev.map(transaction =>
        transaction.id === id ? updatedTransaction : transaction
      ));
      // Refresh both because update might sync with goals
      fetchData();
    } catch (error) {
      console.error('Error updating transaction:', error);
      
      // Se falhar por rede (offline), enfileiramos no IndexedDB
      if (!navigator.onLine || (error instanceof TypeError && error.message === 'Failed to fetch')) {
        await saveToSyncQueue({
          url,
          method,
          headers,
          body,
        });
        await registerBackgroundSync();
        
        // Atualizar localmente para UX
        setTransactions(prev => prev.map(transaction =>
          transaction.id === id ? { ...transaction, ...updates } as Transaction : transaction
        ));
        return;
      }
      
      throw new Error('Failed to update transaction');
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!pin) throw new Error('PIN not verified');
    const url = `${API_BASE_URL}/transactions/${id}`;
    const method = 'DELETE';
    
    try {
      const response = await fetch(url, {
        method,
        headers,
      });
      if (!response.ok) throw new Error('Failed to delete transaction');
      
      // Em vez de remover, marcamos como deletado para que o card de atividades
      // possa mostrar o efeito visual de "riscado" por alguns segundos.
      setTransactions(prev => prev.map(t => 
        t.id === id ? { ...t, status: 'deleted', deletedAt: new Date().toISOString() } : t
      ));
      // Refresh both transactions and goals because deleting a transaction 
      // might affect savings contributions and goal progress
      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      
      // Se falhar por rede (offline), enfileiramos no IndexedDB
      if (!navigator.onLine || (error instanceof TypeError && error.message === 'Failed to fetch')) {
        await saveToSyncQueue({
          url,
          method,
          headers,
          body: '',
        });
        await registerBackgroundSync();
        
        // Atualizar localmente para UX
        setTransactions(prev => prev.map(t => 
          t.id === id ? { ...t, status: 'deleted', deletedAt: new Date().toISOString() } : t
        ));
        return;
      }
      
      throw new Error('Failed to delete transaction');
    }
  };

  const updatePaymentStatus = async (id: string, isPaid: boolean) => {
    if (!pin) throw new Error('PIN not verified');
    const url = `${API_BASE_URL}/transactions/${id}`;
    const method = 'PUT';
    const body = JSON.stringify({ isPaid });

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
      });
      if (!response.ok) throw new Error('Failed to update payment status');
      const updatedTransaction = await response.json();
      
      setTransactions(prev => prev.map(transaction =>
        transaction.id === id ? updatedTransaction : transaction
      ));
      if (updatedTransaction?.category === 'Aporte' && updatedTransaction?.savingsGoalId) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      
      // Se falhar por rede (offline), enfileiramos no IndexedDB
      if (!navigator.onLine || (error instanceof TypeError && error.message === 'Failed to fetch')) {
        await saveToSyncQueue({
          url,
          method,
          headers,
          body,
        });
        await registerBackgroundSync();
        
        // Atualizar localmente para UX
        setTransactions(prev => prev.map(transaction =>
          transaction.id === id ? { ...transaction, isPaid } as Transaction : transaction
        ));
        return;
      }
    }
  };

  const addSavingsGoal = async (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!pin) throw new Error('PIN not verified');
    try {
      const response = await fetch(`${API_BASE_URL}/goals`, {
        method: 'POST',
        headers,
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
    if (!pin) throw new Error('PIN not verified');
    try {
      const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update savings goal');
      const updatedGoal = await response.json();

      // If we are restoring, also restore contributions in local state
      if (updates.status === 'active') {
        setSavingsGoals(prev => prev.map(g => 
          g.id === id ? { 
            ...updatedGoal, 
            status: 'active', 
            deletedAt: undefined,
            contributions: (g.contributions || []).map(c => ({
              ...c,
              status: 'active',
              deletedAt: undefined
            }))
          } : g
        ));
      } else {
        setSavingsGoals(prev => prev.map(g => (g.id === id ? { ...g, ...updatedGoal } : g)));
      }
    } catch (error) {
      console.error('Error updating savings goal:', error);
    }
  };
  const addSavingsContribution = async (goalId: string, amount: number, date?: string) => {
    if (!pin) throw new Error('PIN not verified');
    try {
      const goalToUpdate = savingsGoals.find(g => g.id === goalId);
      if (!goalToUpdate) throw new Error('Goal not found');

      const contribution: Omit<SavingsContribution, 'id' | 'createdAt' | 'updatedAt'> = {
        amount,
        date: date || getBrazilDateString(),
      };

      const response = await fetch(`${API_BASE_URL}/goals/${goalId}/contributions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(contribution),
      });

      if (!response.ok) throw new Error('Failed to add savings contribution');
      const updatedGoal = await response.json();
      setSavingsGoals(prev => prev.map(goal =>
        goal.id === goalId ? updatedGoal : goal
      ));
      // Refresh transactions since a new one was created
      fetchData();
    } catch (error) {
      console.error('Error adding savings contribution:', error);
    }
  };

  const updateSavingsContribution = async (goalId: string, contributionId: string, updates: Partial<SavingsContribution>) => {
    if (!pin) throw new Error('PIN not verified');
    try {
      const response = await fetch(`${API_BASE_URL}/goals/${goalId}/contributions/${contributionId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update savings contribution');
      const updatedGoal = await response.json();
      setSavingsGoals(prev => prev.map(goal =>
        goal.id === goalId ? updatedGoal : goal
      ));
      // Refresh transactions since one was updated
      fetchData();
    } catch (error) {
      console.error('Error updating savings contribution:', error);
    }
  };

  const deleteSavingsContribution = async (goalId: string, contributionId: string) => {
    if (!pin) throw new Error('PIN not verified');
    try {
      const response = await fetch(`${API_BASE_URL}/goals/${goalId}/contributions/${contributionId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) throw new Error('Failed to delete savings contribution');
      const updatedGoal = await response.json();
      setSavingsGoals(prev => prev.map(goal =>
        goal.id === goalId ? updatedGoal : goal
      ));
      // Refresh transactions since one was deleted
      fetchData();
    } catch (error) {
      console.error('Error deleting savings contribution:', error);
    }
  };

  const deleteSavingsGoal = async (id: string) => {
    if (!pin) throw new Error('PIN not verified');
    try {
      const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) throw new Error('Failed to delete savings goal');
      
      // Soft delete in local state
      const now = new Date().toISOString();
      setSavingsGoals(prev => prev.map(g => 
        g.id === id ? { 
          ...g, 
          status: 'deleted', 
          deletedAt: now,
          contributions: (g.contributions || []).map(c => ({
            ...c,
            status: 'deleted',
            deletedAt: c.status === 'deleted' ? c.deletedAt : now
          }))
        } : g
      ));
      // Refresh transactions since all related transactions were deleted
      fetchData();
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
    isLoading,
  };
};
