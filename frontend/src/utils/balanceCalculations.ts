import { format, startOfMonth, endOfMonth, isBefore } from 'date-fns';

import { Transaction, SavingsGoal } from '../types';

import { getCurrentBrazilDate } from './helpers';

/**
 * Calcula o impacto total acumulado de todas as contribuições para metas
 * Considera apenas contribuições com data <= effectiveDate (YYYY-MM-DD)
 */
const calculateTotalGoalsImpact = (savingsGoals: SavingsGoal[] = [], effectiveDate: string): number => {
  return savingsGoals.reduce((total, goal) => {
    const goalTotal = goal.contributions.reduce((sum, contribution) => {
      const cDate = contribution.date.slice(0, 10);
      return sum + (cDate <= effectiveDate ? contribution.amount : 0);
    }, 0);
    return total + goalTotal;
  }, 0);
};

export interface BalanceData {
  totalBalance: number;        // Saldo real acumulado até a data efetiva
  currentMonthBalance: number; // Resultado do mês selecionado
  previousBalance: number;     // Saldo acumulado até o fim do mês anterior
  projectedBalance: number;    // Saldo incluindo pendentes do mês selecionado
  pendingBalance: number;      // Apenas transações pendentes do mês selecionado
  adjustedBalance: number;     // Saldo total ajustado pelas metas
}

/**
 * Calcula todos os tipos de saldo de forma consistente.
 *
 * Correção principal: quando currentMonth é um mês passado, a data efetiva
 * é o último dia daquele mês — não "hoje". Isso garante que o saldo fechado
 * de meses anteriores seja fiel ao que era naquele momento.
 */
export const calculateBalances = (
  transactions: Transaction[],
  savingsGoals: SavingsGoal[] = [],
  currentMonth: Date = getCurrentBrazilDate()
): BalanceData => {
  const now = getCurrentBrazilDate();
  const todayStr = format(now, 'yyyy-MM-dd');
  const endOfCurrentMonthDate = endOfMonth(currentMonth);

  // Data efetiva: se o mês visualizado já passou, fecha no último dia dele.
  // Se for o mês atual (ou futuro), usa hoje.
  const effectiveDate = isBefore(endOfCurrentMonthDate, now)
    ? format(endOfCurrentMonthDate, 'yyyy-MM-dd')
    : todayStr;

  const startOfCurrentMonth = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endOfCurrentMonthStr = format(endOfCurrentMonthDate, 'yyyy-MM-dd');

  // 1. SALDO TOTAL ACUMULADO (transações pagas até a data efetiva)
  const paidTransactions = transactions.filter(t => {
    const tDate = t.date.slice(0, 10);
    return t.isPaid && tDate <= effectiveDate;
  });

  const totalIncome = paidTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = paidTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = totalIncome - totalExpenses;

  // 2. SALDO DO MÊS SELECIONADO (transações pagas dentro do mês)
  const currentMonthTransactions = transactions.filter(t => {
    const tDate = t.date.slice(0, 10);
    return tDate >= startOfCurrentMonth &&
           tDate <= endOfCurrentMonthStr &&
           t.isPaid;
  });

  const currentMonthBalance = currentMonthTransactions
    .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

  // 3. SALDO DE MESES ANTERIORES
  const previousBalance = totalBalance - currentMonthBalance;

  // 4. TRANSAÇÕES PENDENTES DO MÊS SELECIONADO
  const pendingTransactions = transactions.filter(t => {
    const tDate = t.date.slice(0, 10);
    return tDate >= startOfCurrentMonth &&
           tDate <= endOfCurrentMonthStr &&
           !t.isPaid;
  });

  const pendingBalance = pendingTransactions
    .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

  // 5. SALDO PROJETADO (total acumulado + pendentes do mês)
  const projectedBalance = totalBalance + pendingBalance;

  // 6. IMPACTO TOTAL DAS METAS (aportes até a data efetiva)
  const totalGoalsImpact = calculateTotalGoalsImpact(savingsGoals, effectiveDate);

  // 7. SALDO AJUSTADO PELAS METAS
  const adjustedBalance = totalBalance - totalGoalsImpact;

  return {
    totalBalance,
    currentMonthBalance,
    previousBalance,
    projectedBalance,
    pendingBalance,
    adjustedBalance,
  };
};

/**
 * Retorna o saldo total acumulado até a data efetiva do mês informado.
 */
export const calculateRemainingBalance = (
  transactions: Transaction[],
  currentMonth: Date = getCurrentBrazilDate()
): number => {
  return calculateBalances(transactions, [], currentMonth).totalBalance;
};