import { Transaction, SavingsGoal } from '../types';
import { getCurrentBrazilDate, calculateGoalsImpact } from './helpers';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface BalanceData {
  totalBalance: number;           // Saldo real total (apenas transações pagas até hoje)
  currentMonthBalance: number;    // Resultado do mês atual
  previousBalance: number;        // Saldo acumulado de meses anteriores
  projectedBalance: number;       // Saldo incluindo pendentes do mês atual
  pendingBalance: number;         // Apenas transações pendentes do mês atual
  goalsImpact: number;           // Impacto das metas no mês atual
  adjustedBalance: number;        // Saldo total ajustado pelas metas
}

/**
 * Calcula todos os tipos de saldo de forma consistente
 * 
 * Esta função resolve o problema de saldo incorreto quando vira o mês
 */
export const calculateBalances = (
  transactions: Transaction[], 
  savingsGoals: SavingsGoal[] = [],
  currentMonth: Date = getCurrentBrazilDate()
): BalanceData => {
  const now = getCurrentBrazilDate();
  const currentDate = format(now, 'yyyy-MM-dd');
  const startOfCurrentMonth = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endOfCurrentMonth = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  // 1. SALDO TOTAL ACUMULADO (transações pagas até hoje)
  const paidTransactions = transactions.filter(t => {
    return t.isPaid && t.date <= currentDate;
  });
  
  const paidIncomes = paidTransactions.filter(t => t.type === 'income');
  const paidExpenses = paidTransactions.filter(t => t.type === 'expense');
  
  const totalIncome = paidIncomes.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = paidExpenses.reduce((sum, t) => sum + t.amount, 0);
  
  const totalBalance = totalIncome - totalExpenses;
  
  // 2. SALDO DO MÊS ATUAL (transações pagas do mês selecionado)
  const currentMonthTransactions = transactions.filter(t => {
    return t.date >= startOfCurrentMonth && 
           t.date <= endOfCurrentMonth && 
           t.isPaid;
  });
  
  const currentMonthBalance = currentMonthTransactions
    .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
  
  // 3. SALDO DE MESES ANTERIORES
  const previousBalance = totalBalance - currentMonthBalance;
  
  // 4. TRANSAÇÕES PENDENTES DO MÊS ATUAL
  const pendingTransactions = transactions.filter(t => {
    return t.date >= startOfCurrentMonth && 
           t.date <= endOfCurrentMonth && 
           !t.isPaid;
  });
  
  const pendingBalance = pendingTransactions
    .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
  
  // 5. SALDO PROJETADO (total + pendentes do mês)
  const projectedBalance = totalBalance + pendingBalance;
  
  // 6. IMPACTO DAS METAS
  const goalsImpact = calculateGoalsImpact(savingsGoals, currentMonth);
  
  // 7. SALDO AJUSTADO PELAS METAS
  const adjustedBalance = totalBalance - goalsImpact;
  
  return {
    totalBalance,
    currentMonthBalance,
    previousBalance,
    projectedBalance,
    pendingBalance,
    goalsImpact,
    adjustedBalance
  };
};

/**
 * Calcula o saldo remanescente considerando o histórico completo
 * Esta é a função principal que resolve o problema da virada do mês
 */
export const calculateRemainingBalance = (
  transactions: Transaction[],
  currentMonth: Date = getCurrentBrazilDate()
): number => {
  const balances = calculateBalances(transactions, [], currentMonth);
  return balances.totalBalance;
};

/**
 * Função de debug para acompanhar os cálculos
 */
export const debugBalances = (
  transactions: Transaction[], 
  savingsGoals: SavingsGoal[] = [],
  currentMonth: Date = getCurrentBrazilDate()
): void => {
  calculateBalances(transactions, savingsGoals, currentMonth);
};
