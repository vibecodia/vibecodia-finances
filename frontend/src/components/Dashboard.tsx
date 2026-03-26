import { format, addMonths, subMonths, getDate, getDaysInMonth, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wallet, Target, AlertTriangle, ChevronLeft, ChevronRight, CreditCard, Eye, EyeOff } from 'lucide-react';
import React, { useState , useEffect } from 'react';
import Confetti from 'react-confetti';
import { useNavigate } from 'react-router-dom';

import { useTheme } from '../contexts/ThemeContext';
import useWindowSize from '../hooks/useWindowSize';
import { Transaction, SavingsGoal } from '../types';
import { calculateBalances } from '../utils/balanceCalculations';
import { formatCurrency, filterTransactionsByMonth, getCurrentBrazilDate, formatPaymentMethod } from '../utils/helpers';
import RecentTransactionsFloatingCard from './RecentTransactionsFloatingCard';



interface DashboardProps {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
}

// ─── AccountSlider ────────────────────────────────────────────────────────────

interface AccountSliderProps {
  label: string;
  income: number;
  spent: number;
  formatCurrency: (value: number) => string;
  daysPassed: number;
  totalDays: number;
}

const AccountSlider: React.FC<AccountSliderProps> = ({ label, income, spent, formatCurrency, daysPassed, totalDays }) => {
  const remaining = Math.max(0, income - spent);
  const hasIncome = income > 0;
  const balance = income - spent;

  const spentPct = hasIncome
    ? (Math.min(income, spent) / income) * 100
    : spent > 0 ? 100 : 0;

  const remainingPct = hasIncome
    ? (remaining / income) * 100
    : spent > 0 ? 0 : 100;

  // Threshold de alerta: 80% utilizado
  const isWarning = spentPct >= 60 && spentPct < 80;
  const isDanger  = spentPct >= 80;

  const statusColor = isDanger
    ? 'text-red-500'
    : isWarning
      ? 'text-yellow-500'
      : 'text-green-500';

  const statusLabel = isDanger
    ? '● crítico'
    : isWarning
      ? '● atenção'
      : '● ok';

  const avgDailySpent = daysPassed > 0 ? spent / daysPassed : 0;
  const daysRemaining = totalDays - daysPassed;
  const dailyBudget = daysRemaining > 0 ? remaining / daysRemaining : (daysRemaining === 0 ? remaining : 0);

  return (
    <div className="space-y-2">
      {/* Header com status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text opacity-90">{label}</span>
          {spent > 0 && (
            <span className="text-[10px] text-text opacity-40 font-mono italic">
              (média diária {formatCurrency(avgDailySpent)})
            </span>
          )}
        </div>
        <span className={`text-[10px] font-mono font-bold uppercase tracking-wide ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Barra invertida: vermelho da esquerda, verde à direita */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 relative overflow-hidden shadow-inner">
        {/* Vermelho: gasto — da esquerda */}
        <div
          className="h-3 transition-all duration-700 absolute left-0 rounded-l-full"
          style={{
            width: `${spentPct}%`,
            background: isDanger
              ? 'linear-gradient(90deg, #dc2626, #ef4444)'
              : isWarning
                ? 'linear-gradient(90deg, #d97706, #fbbf24)'
                : 'linear-gradient(90deg, #f87171, #ef4444)',
          }}
        />
        {/* Verde: disponível — da direita */}
        <div
          className="bg-green-400 h-3 transition-all duration-700 absolute right-0 rounded-r-full"
          style={{ width: `${remainingPct}%` }}
        />
        {/* Linha divisória */}
        {spentPct > 0 && remainingPct > 0 && (
          <div
            className="absolute top-0 w-0.5 h-full bg-white/40 z-10"
            style={{ left: `${spentPct}%`, transform: 'translateX(-50%)' }}
          />
        )}
      </div>

      {/* Percentual usado abaixo da barra */}
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-text opacity-40 font-mono">
          {spentPct.toFixed(0)}% utilizado
        </span>
        {remaining > 0 && daysRemaining > 0 && (
          <span className="text-[10px] text-primary opacity-60 font-mono font-bold">
            Sugerido: {formatCurrency(dailyBudget)}/dia
          </span>
        )}
      </div>

      {/* Valores */}
      <div className="grid grid-cols-3 gap-2 text-center pt-1">
        <div>
          <div className="text-xs font-bold text-green-600 dark:text-green-400">
            {formatCurrency(income)}
          </div>
          <div className="text-[10px] text-text opacity-60 uppercase">Recebido</div>
        </div>
        <div>
          <div className="text-xs font-bold text-red-600 dark:text-red-400">
            {formatCurrency(spent)}
          </div>
          <div className="text-[10px] text-text opacity-60 uppercase">Gasto</div>
        </div>
        <div>
          <div className={`text-xs font-bold ${balance >= 0 ? 'text-primary' : 'text-red-600'}`}>
            {formatCurrency(balance)}
          </div>
          <div className="text-[10px] text-text opacity-60 uppercase">Saldo</div>
        </div>
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard: React.FC<DashboardProps> = ({ transactions, savingsGoals }) => {
  const navigate = useNavigate();
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(getCurrentBrazilDate());
  const [showBalance, setShowBalance] = useState(true);
  const { theme, setThemeMonth } = useTheme();

  useEffect(() => {
    setThemeMonth(currentMonth);
  }, [currentMonth, setThemeMonth]);

  const today = getCurrentBrazilDate();
  const isSelectedMonthCurrent = format(currentMonth, 'yyyy-MM') === format(today, 'yyyy-MM');
  const isSelectedMonthPast = isBefore(endOfMonth(currentMonth), startOfMonth(today));
  
  const totalDays = getDaysInMonth(currentMonth);
  const daysPassed = isSelectedMonthCurrent 
    ? getDate(today) 
    : (isSelectedMonthPast ? totalDays : 0);

  const transactionsForSelectedMonth = filterTransactionsByMonth(transactions, currentMonth);
  const balanceData = calculateBalances(transactions, savingsGoals, currentMonth);

  const currentIncome = transactionsForSelectedMonth
    .filter(t => t.type === 'income' && t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  const expensesPaid = transactionsForSelectedMonth
    .filter(t => t.type === 'expense' && t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  const expensesUnpaid = transactionsForSelectedMonth
    .filter(t => t.type === 'expense' && !t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  const flashIncome = transactionsForSelectedMonth
    .filter(t => t.type === 'income' && (
      t.description.toLowerCase().includes('flash') ||
      t.category.toLowerCase().includes('flash') ||
      (t.paymentMethod && formatPaymentMethod(t.paymentMethod) === 'Flash')
    ))
    .reduce((sum, t) => sum + t.amount, 0);

  const flashSpent = transactionsForSelectedMonth
    .filter(t => t.type === 'expense' && (t.paymentMethod && formatPaymentMethod(t.paymentMethod) === 'Flash'))
    .reduce((sum, t) => sum + t.amount, 0);

  const veroIncome = transactionsForSelectedMonth
    .filter(t => t.type === 'income' && (
      t.description.toLowerCase().includes('vero') ||
      t.category.toLowerCase().includes('vero') ||
      (t.paymentMethod && formatPaymentMethod(t.paymentMethod) === 'Vero Card')
    ))
    .reduce((sum, t) => sum + t.amount, 0);

  const veroSpent = transactionsForSelectedMonth
    .filter(t => t.type === 'expense' && (t.paymentMethod && formatPaymentMethod(t.paymentMethod) === 'Vero Card'))
    .reduce((sum, t) => sum + t.amount, 0);

  const adjustedBalance = balanceData.adjustedBalance;
  const displayBalance = Math.abs(adjustedBalance) < 0.001 ? 0 : adjustedBalance;

  const totalSavingsGoals = savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalSaved = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  const getBalanceIcon = () => {
    if (adjustedBalance < -0.001) return <AlertTriangle className="w-6 h-6 opacity-90" />;
    return <Wallet className="w-6 h-6 opacity-90" />;
  };

  const handleBalanceCardClick = () => {
    setShowConfetti(true);
    setIsPulsing(true);
    setTimeout(() => setShowConfetti(false), 3000);
    setTimeout(() => setIsPulsing(false), 300);
  };

  const confettiColors = adjustedBalance < 0
    ? ['#FFD700', '#DAA520', '#B8860B', '#8B4513']
    : ['#a8e063', '#56ab2f', '#4CAF50', '#8BC34A'];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={adjustedBalance < 0 ? 300 : 200}
          colors={confettiColors}
        />
      )}

      {/* Header */}
      <div className="text-center py-3">
        <h1 className="text-2xl font-bold text-text mb-2">Resumão do Mês!</h1>
        <div className="flex items-center justify-center gap-2 text-text">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1 rounded-full hover:bg-cardBorder">
            <ChevronLeft className="w-5 h-5 text-text" />
          </button>
          <p className="text-text">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</p>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1 rounded-full hover:bg-cardBorder">
            <ChevronRight className="w-5 h-5 text-text" />
          </button>
        </div>
      </div>

      {/* Main Balance Card */}
      <div
        className={`relative overflow-hidden rounded-[2.5rem] p-8 cursor-pointer border transition-all duration-500 shadow-xl ${
          isPulsing ? 'scale-[1.02]' : 'scale-100'
        } ${adjustedBalance < -0.001 ? 'text-rose-950' : 'text-white'}`}
        style={{
          backgroundImage: adjustedBalance < -0.001
            ? 'radial-gradient(circle at top left, #fff1eb, #ffd1ff)'
            : `radial-gradient(circle at top left, ${theme.primary}, ${theme.primary}dd)`,
          backgroundColor: theme.primary,
          borderColor: adjustedBalance < -0.001 ? '#fecaca' : 'rgba(255, 255, 255, 0.1)',
        }}
        onClick={handleBalanceCardClick}
      >
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">
                {adjustedBalance < -0.001 ? 'Atenção • Déficit' : 'Total em Carteira'}
              </p>
              <h2 className="text-xl font-black tracking-tight uppercase italic">
                {adjustedBalance < -0.001 ? 'Saldo Devedor' : 'Saldo'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBalance(!showBalance);
                }}
                className="p-3 bg-black/10 backdrop-blur-xl rounded-2xl border border-white/10 hover:bg-black/20 transition-colors shadow-lg"
              >
                {showBalance ? <EyeOff className="w-5 h-5 opacity-70" /> : <Eye className="w-5 h-5 opacity-70" />}
              </button>
              <div className="p-4 bg-black/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg">
                {getBalanceIcon()}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-1">
              <p className="text-5xl sm:text-7xl font-black tracking-tighter leading-none">
                {showBalance ? formatCurrency(displayBalance) : 'R$ ••••••'}
              </p>
            </div>

          </div>
        </div>

        {adjustedBalance < -0.001 && (
          <div className="absolute top-0 right-0 p-4">
            <div className="animate-pulse bg-rose-500 w-2 h-2 rounded-full shadow-[0_0_10px_#ef4444]" />
          </div>
        )}
      </div>

      {/* Barra receitas vs despesas */}
      <div className="rounded-xl p-6 shadow-lg" style={{ backgroundColor: theme.cardBackground, border: `2px solid ${theme.cardBorder}` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full" />
            <span className="text-text font-medium">Receitas</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded-full" />
              <span className="text-text text-sm">Gastos Pagos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full" />
              <span className="text-text text-sm">Não Pagos</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-5 relative overflow-hidden shadow-inner">
          <div
            className="bg-green-400 h-5 transition-all duration-700 absolute left-0 shadow-lg"
            style={{ width: `${currentIncome > 0 ? (currentIncome / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%` }}
          />
          <div
            className="bg-red-600 h-5 transition-all duration-700 absolute shadow-lg"
            style={{
              left: `${currentIncome > 0 ? (currentIncome / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`,
              width: `${expensesPaid > 0 ? (expensesPaid / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`,
            }}
          />
          <div
            className="bg-red-400 h-5 transition-all duration-700 absolute shadow-lg"
            style={{
              left: `${(currentIncome + expensesPaid) > 0 ? ((currentIncome + expensesPaid) / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`,
              width: `${expensesUnpaid > 0 ? (expensesUnpaid / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`,
            }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {currentIncome > 0 ? ((currentIncome / (currentIncome + expensesPaid + expensesUnpaid)) * 100).toFixed(1) : '0'}%
            </div>
            <div className="text-xs text-text opacity-80">Receitas</div>
            <div className="text-xs text-text opacity-60">{formatCurrency(currentIncome)}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              {expensesPaid > 0 ? ((expensesPaid / (currentIncome + expensesPaid + expensesUnpaid)) * 100).toFixed(1) : '0'}%
            </div>
            <div className="text-xs text-text opacity-80">Pagos</div>
            <div className="text-xs text-text opacity-60">{formatCurrency(expensesPaid)}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-400 dark:text-red-300">
              {expensesUnpaid > 0 ? ((expensesUnpaid / (currentIncome + expensesPaid + expensesUnpaid)) * 100).toFixed(1) : '0'}%
            </div>
            <div className="text-xs text-text opacity-80">Não Pagos</div>
            <div className="text-xs text-text opacity-60">{formatCurrency(expensesUnpaid)}</div>
          </div>
        </div>
      </div>

      {/* Benefícios — Flash / Vero Card */}
      <div
        className="rounded-xl p-6 shadow-lg space-y-6"
        style={{ backgroundColor: theme.cardBackground, border: `2px solid ${theme.cardBorder}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="text-text font-bold">Saldo Benefícios</span>
          </div>
        </div>

        <AccountSlider
          label="Flash"
          income={flashIncome}
          spent={flashSpent}
          formatCurrency={formatCurrency}
          daysPassed={daysPassed}
          totalDays={totalDays}
        />

        <div className="border-t border-slate-200 dark:border-slate-700" />

        <AccountSlider
          label="Vero Card"
          income={veroIncome}
          spent={veroSpent}
          formatCurrency={formatCurrency}
          daysPassed={daysPassed}
          totalDays={totalDays}
        />
      </div>

      {/* Progresso das Metas */}
      {savingsGoals.length > 0 && (
        <div
          className="rounded-xl p-4 border-2 cursor-pointer hover:shadow-md transition-shadow duration-200"
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}
          onClick={() => navigate('/goals')}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text truncate pr-2">Progresso das Metas</h3>
            <Target className="w-4 h-4 text-primary flex-shrink-0" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text truncate pr-2">Progresso Total</span>
              <span className="font-medium text-text flex-shrink-0">
                {formatCurrency(totalSaved)} / {formatCurrency(totalSavingsGoals)}
              </span>
            </div>
            <div className="w-full rounded-full h-2" style={{ backgroundColor: theme.cardBorder }}>
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  backgroundColor: theme.primary,
                  width: `${totalSavingsGoals > 0 ? (totalSaved / totalSavingsGoals) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="text-xs text-text opacity-80">
              {totalSavingsGoals > 0 ? Math.round((totalSaved / totalSavingsGoals) * 100) : 0}% concluído
            </div>
          </div>
        </div>
      )}

      <RecentTransactionsFloatingCard transactions={transactions} />
    </div>
  );
};

export default Dashboard;
