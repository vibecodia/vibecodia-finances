import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction, SavingsGoal, MonthlyBalance } from '../types';
import { formatCurrency, filterTransactionsByMonth, getCurrentBrazilDate } from '../utils/helpers';
import { calculateBalances } from '../utils/balanceCalculations';
import { TrendingUp, TrendingDown, Wallet, Target, AlertTriangle, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import Confetti from 'react-confetti';
import useWindowSize from '../hooks/useWindowSize';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';

interface DashboardProps {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  monthlyBalances: MonthlyBalance[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, savingsGoals, monthlyBalances }) => {
  const navigate = useNavigate();
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(getCurrentBrazilDate());
  const { theme, isDarkMode, setThemeMonth } = useTheme();

  useEffect(() => {
    setThemeMonth(currentMonth);
  }, [currentMonth, setThemeMonth]);

  const transactionsForSelectedMonth = filterTransactionsByMonth(transactions, currentMonth);
  
  // SOLUÇÃO DEFINITIVA: Calcular saldos diretamente para garantir reatividade
  const balanceData = calculateBalances(transactions, savingsGoals, currentMonth);

  
  const currentIncome = transactionsForSelectedMonth
    .filter(t => t.type === 'income' && t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const currentExpenses = transactionsForSelectedMonth
    .filter(t => t.type === 'expense' && t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  // Calcular despesas pagas vs recebidas
  const expensesPaid = transactionsForSelectedMonth
    .filter(t => t.type === 'expense' && t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expensesUnpaid = transactionsForSelectedMonth
    .filter(t => t.type === 'expense' && !t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  // Benefícios (Flash e Vero Card)
  // Income: check description, category, or paymentMethod
  const flashIncome = transactionsForSelectedMonth
    .filter(t => t.type === 'income' && (
      t.description.toLowerCase().includes('flash') || 
      t.category.toLowerCase().includes('flash') ||
      t.paymentMethod === 'flash'
    ))
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Expenses: strictly by paymentMethod
  const flashSpent = transactionsForSelectedMonth
    .filter(t => t.type === 'expense' && t.paymentMethod === 'flash')
    .reduce((sum, t) => sum + t.amount, 0);

  const veroIncome = transactionsForSelectedMonth
    .filter(t => t.type === 'income' && (
      t.description.toLowerCase().includes('vero') || 
      t.category.toLowerCase().includes('vero') ||
      t.paymentMethod === 'vero_card'
    ))
    .reduce((sum, t) => sum + t.amount, 0);
  
  const veroSpent = transactionsForSelectedMonth
    .filter(t => t.type === 'expense' && t.paymentMethod === 'vero_card')
    .reduce((sum, t) => sum + t.amount, 0);

  // goalsImpact removido
  
  // CORRIGIDO: Usar os saldos calculados pela nova lógica
  // const currentBalance = balanceData.totalBalance;
  const adjustedBalance = balanceData.adjustedBalance;
  
  // Arredondar valores muito pequenos para 0 para evitar "-R$ 0,00"
  const displayBalance = Math.abs(adjustedBalance) < 0.001 ? 0 : adjustedBalance;

  const totalSavingsGoals = savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalSaved = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  const previousMonthKey = format(subMonths(currentMonth, 1), 'yyyy-MM');
  const previousMonthBalanceData = useMemo(() => {
    return monthlyBalances.find(mb => mb.month === previousMonthKey);
  }, [monthlyBalances, previousMonthKey]);

  const previousAdjustedBalance = previousMonthBalanceData?.balance ?? 0;
  const balanceChange = adjustedBalance - previousAdjustedBalance;

  const getBalanceIcon = () => {
    if (adjustedBalance < -0.001) {
      return <AlertTriangle className="w-6 h-6 opacity-90" />;
    }
    return <Wallet className="w-6 h-6 opacity-90" />;
  };

  const handleBalanceCardClick = () => {
    setShowConfetti(true);
    setIsPulsing(true);
    setTimeout(() => {
      setShowConfetti(false);
    }, 3000); // Confetti for 3 seconds
    setTimeout(() => {
      setIsPulsing(false);
    }, 300); // Pulse for 300ms
  };

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  const confettiColors = adjustedBalance < 0 
    ? ['#FFD700', '#DAA520', '#B8860B', '#8B4513'] // Gold, Goldenrod, DarkGoldenrod, SaddleBrown (money-like colors)
    : ['#a8e063', '#56ab2f', '#4CAF50', '#8BC34A']; // Green shades

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={adjustedBalance < 0 ? 300 : 200} colors={confettiColors} />}
      <div className="text-center py-3">
        <h1 className="text-2xl font-bold text-text mb-2">
          Resumo Financeiro
        </h1>
        <div className="flex items-center justify-center gap-2 text-text">
          <button onClick={handlePreviousMonth} className="p-1 rounded-full hover:bg-cardBorder">
            <ChevronLeft className="w-5 h-5 text-text" />
          </button>
          <p className="text-text">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
          <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-cardBorder">
            <ChevronRight className="w-5 h-5 text-text" />
          </button>
        </div>
      </div>

      {/* Main Balance */}
      <div 
        className={`rounded-2xl p-6 cursor-pointer border-2 transition-all duration-300 ease-in-out ${isPulsing ? 'scale-105 shadow-xl' : 'scale-100 shadow-lg'} ${adjustedBalance < -0.001 ? 'text-gray-800' : 'text-white'}`}
        style={{ 
          background: adjustedBalance < -0.001 ? 'linear-gradient(to right, #FFDDC1, #FFB26B)' : `linear-gradient(to right, ${theme.primary}, ${theme.secondary})`,
          borderColor: theme.cardBorder
        }}
        onClick={handleBalanceCardClick}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium opacity-90 truncate pr-2">
            {adjustedBalance < -0.001 ? 'Déficit Total' : 'Saldo Total Acumulado'}
          </h2>
          {getBalanceIcon()}
        </div>
        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-2xl sm:text-3xl font-bold mb-1 break-words">
              {formatCurrency(displayBalance)}
            </p>
            {/* goalsImpact removido do dashboard */}
            {balanceChange !== 0 && (
              <div className="flex items-center space-x-1">
                {balanceChange > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-300 flex-shrink-0" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-300 flex-shrink-0" />
                )}
                <span className="text-sm opacity-90 break-words">
                  {formatCurrency(Math.abs(balanceChange))} vs mês anterior
                </span>
              </div>
            )}
          </div>
        </div>
        {adjustedBalance < -0.001 && (
          <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
            <p className="text-sm text-gray-800">
              ⚠️ Seu saldo total está negativo. Considere revisar suas despesas e metas.
            </p>
          </div>
        )}
      </div>

      {/* Barra de progresso financeira - Relação entre gastos e entradas com diferenciação */}
      <div className="rounded-xl p-6 shadow-lg" style={{ backgroundColor: theme.cardBackground, border: `2px solid ${theme.cardBorder}` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-text font-medium">Receitas</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              <span className="text-text text-sm">Gastos Pagos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="text-text text-sm">Não Pagos</span>
            </div>
          </div>
        </div>
        
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-5 relative overflow-hidden shadow-inner">
          {/* Barra de receitas (verde) */}
          <div 
            className="bg-green-400 h-5 transition-all duration-700 absolute left-0 shadow-lg"
            style={{ 
              width: `${currentIncome > 0 ? (currentIncome / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`
            }}
          ></div>
          
          {/* Barra de despesas pagas (vermelho escuro) */}
          <div 
            className="bg-red-600 h-5 transition-all duration-700 absolute shadow-lg"
            style={{ 
              left: `${currentIncome > 0 ? (currentIncome / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`,
              width: `${expensesPaid > 0 ? (expensesPaid / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`
            }}
          ></div>
          
          {/* Barra de despesas não pagas (vermelho claro) */}
          <div 
            className="bg-red-400 h-5 transition-all duration-700 absolute shadow-lg"
            style={{ 
              left: `${(currentIncome + expensesPaid) > 0 ? ((currentIncome + expensesPaid) / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`,
              width: `${expensesUnpaid > 0 ? (expensesUnpaid / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`
            }}
          ></div>
          
          {/* Indicador de equilíbrio */}
          {currentIncome > 0 && (expensesPaid + expensesUnpaid) > 0 && (
            <div className="absolute -top-3 flex items-center justify-center"
                 style={{ 
                   left: `${currentIncome > 0 ? (currentIncome / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`,
                   transform: 'translateX(-50%)'
                 }}>
              <div className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-lg relative">
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-orange-500"></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {currentIncome > 0 ? ((currentIncome / (currentIncome + expensesPaid + expensesUnpaid)) * 100).toFixed(1) : '0'}%
            </div>
            <div className="text-xs text-text opacity-80">Receitas</div>
            <div className="text-xs text-text opacity-60">
              {formatCurrency(currentIncome)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              {expensesPaid > 0 ? ((expensesPaid / (currentIncome + expensesPaid + expensesUnpaid)) * 100).toFixed(1) : '0'}%
            </div>
            <div className="text-xs text-text opacity-80">Pagas</div>
            <div className="text-xs text-text opacity-60">
              {formatCurrency(expensesPaid)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-red-400 dark:text-red-300">
              {expensesUnpaid > 0 ? ((expensesUnpaid / (currentIncome + expensesPaid + expensesUnpaid)) * 100).toFixed(1) : '0'}%
            </div>
            <div className="text-xs text-text opacity-80">Não Pagas</div>
            <div className="text-xs text-text opacity-60">
              {formatCurrency(expensesUnpaid)}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de progresso financeira - Benefícios (Flash / Vero Card) */}
      <div className="rounded-xl p-6 shadow-lg space-y-8" style={{ backgroundColor: theme.cardBackground, border: `2px solid ${theme.cardBorder}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="text-text font-bold">Saldo Benefícios</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-text text-xs">Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-text text-xs">Utilizado</span>
            </div>
          </div>
        </div>
        
        {/* Flash Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-text opacity-90">Flash</span>
            <span className="text-xs text-text opacity-70">Saldo: {formatCurrency(flashIncome - flashSpent)}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 relative overflow-hidden shadow-inner">
            <div 
              className="bg-green-400 h-3 transition-all duration-700 absolute left-0"
              style={{ 
                width: `${flashIncome > 0 ? (Math.max(0, flashIncome - flashSpent) / flashIncome) * 100 : (flashSpent > 0 ? 0 : 100)}%`
              }}
            ></div>
            <div 
              className="bg-red-500 h-3 transition-all duration-700 absolute"
              style={{ 
                left: `${flashIncome > 0 ? (Math.max(0, flashIncome - flashSpent) / flashIncome) * 100 : (flashSpent > 0 ? 0 : 100)}%`,
                width: `${flashIncome > 0 ? (Math.min(flashIncome, flashSpent) / flashIncome) * 100 : (flashSpent > 0 ? 100 : 0)}%`
              }}
            ></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div>
              <div className="text-xs font-bold text-green-600 dark:text-green-400">{formatCurrency(flashIncome)}</div>
              <div className="text-[10px] text-text opacity-60 uppercase">Recebido</div>
            </div>
            <div>
              <div className="text-xs font-bold text-red-600 dark:text-red-400">{formatCurrency(flashSpent)}</div>
              <div className="text-[10px] text-text opacity-60 uppercase">Gasto</div>
            </div>
            <div>
              <div className={`text-xs font-bold ${flashIncome - flashSpent >= 0 ? 'text-primary' : 'text-red-600'}`}>{formatCurrency(flashIncome - flashSpent)}</div>
              <div className="text-[10px] text-text opacity-60 uppercase">Saldo</div>
            </div>
          </div>
        </div>

        {/* Vero Card Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-text opacity-90">Vero Card</span>
            <span className="text-xs text-text opacity-70">Saldo: {formatCurrency(veroIncome - veroSpent)}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 relative overflow-hidden shadow-inner">
            <div 
              className="bg-green-400 h-3 transition-all duration-700 absolute left-0"
              style={{ 
                width: `${veroIncome > 0 ? (Math.max(0, veroIncome - veroSpent) / veroIncome) * 100 : (veroSpent > 0 ? 0 : 100)}%`
              }}
            ></div>
            <div 
              className="bg-red-500 h-3 transition-all duration-700 absolute"
              style={{ 
                left: `${veroIncome > 0 ? (Math.max(0, veroIncome - veroSpent) / veroIncome) * 100 : (veroSpent > 0 ? 0 : 100)}%`,
                width: `${veroIncome > 0 ? (Math.min(veroIncome, veroSpent) / veroIncome) * 100 : (veroSpent > 0 ? 100 : 0)}%`
              }}
            ></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div>
              <div className="text-xs font-bold text-green-600 dark:text-green-400">{formatCurrency(veroIncome)}</div>
              <div className="text-[10px] text-text opacity-60 uppercase">Recebido</div>
            </div>
            <div>
              <div className="text-xs font-bold text-red-600 dark:text-red-400">{formatCurrency(veroSpent)}</div>
              <div className="text-[10px] text-text opacity-60 uppercase">Gasto</div>
            </div>
            <div>
              <div className={`text-xs font-bold ${veroIncome - veroSpent >= 0 ? 'text-primary' : 'text-red-600'}`}>{formatCurrency(veroIncome - veroSpent)}</div>
              <div className="text-[10px] text-text opacity-60 uppercase">Saldo</div>
            </div>
          </div>
        </div>
      </div>

      {/* IMPROVED: Income vs Expenses vs Goals - Better horizontal layout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div 
          className="rounded-xl p-4 border-2 cursor-pointer hover:shadow-md transition-shadow duration-200"
          style={{ backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', borderColor: isDarkMode ? '#065f46' : '#d1fae5' }}
          onClick={() => handleCardClick('/income')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} flex-shrink-0`} />
              <h3 className={`text-sm font-medium ${isDarkMode ? 'text-emerald-50' : 'text-emerald-900'} truncate`}>Receitas</h3>
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-emerald-50' : 'text-emerald-900'} break-words`}>
            {formatCurrency(currentIncome)}
          </p>
        </div>

        <div 
          className="rounded-xl p-4 border-2 cursor-pointer hover:shadow-md transition-shadow duration-200"
          style={{ backgroundColor: isDarkMode ? '#451a03' : '#fff7ed', borderColor: isDarkMode ? '#78350f' : '#ffedd5' }}
          onClick={() => handleCardClick('/expenses')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingDown className={`w-4 h-4 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'} flex-shrink-0`} />
              <h3 className={`text-sm font-medium ${isDarkMode ? 'text-orange-50' : 'text-orange-900'} truncate`}>Gastos Pagos</h3>
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-orange-50' : 'text-orange-900'} break-words`}>
            {formatCurrency(currentExpenses)}
          </p>
          <p className={`text-xs ${isDarkMode ? 'text-orange-200' : 'text-orange-800'} mt-1 truncate opacity-80`}>
            Apenas despesas já pagas
          </p>
        </div>

        <div 
          className="rounded-xl p-4 border-2 cursor-pointer hover:shadow-md transition-shadow duration-200"
          style={{ backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', borderColor: isDarkMode ? '#065f46' : '#d1fae5' }}
          onClick={() => handleCardClick('/goals')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Target className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} flex-shrink-0`} />
              <h3 className={`text-sm font-medium ${isDarkMode ? 'text-emerald-50' : 'text-emerald-900'} truncate`}>Metas</h3>
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-emerald-50' : 'text-emerald-900'} break-words`}>
            {formatCurrency(totalSaved)}
          </p>
          <p className={`text-xs ${isDarkMode ? 'text-emerald-200' : 'text-emerald-800'} mt-1 truncate opacity-80`}>
            {totalSavingsGoals > 0 ? `de ${formatCurrency(totalSavingsGoals)}` : 'Nenhuma meta'}
          </p>
        </div>
      </div>

      {/* Savings Goals Summary */}
      {savingsGoals.length > 0 && (
        <div 
          className="rounded-xl p-4 border-2 cursor-pointer hover:shadow-md transition-shadow duration-200"
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}
          onClick={() => handleCardClick('/goals')}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text truncate pr-2">Progresso das Metas</h3>
            <Target className="w-4 h-4 text-primary flex-shrink-0" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text truncate pr-2">Progresso Total</span>
              <span className="font-medium text-text flex-shrink-0 break-words">
                {formatCurrency(totalSaved)} / {formatCurrency(totalSavingsGoals)}
              </span>
            </div>
            <div className="w-full rounded-full h-2" style={{ backgroundColor: theme.cardBorder }}>
              <div 
                className="h-2 rounded-full transition-all duration-500"
                style={{ 
                  backgroundColor: theme.primary,
                  width: `${totalSavingsGoals > 0 ? (totalSaved / totalSavingsGoals) * 100 : 0}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text truncate pr-2 opacity-80">
                {totalSavingsGoals > 0 ? Math.round((totalSaved / totalSavingsGoals) * 100) : 0}% concluído
              </span>
              {/* goalsImpact removido do dashboard */}
            </div>
          </div>
        </div>
      )}

      

      
    </div>
  );
};

export default Dashboard;