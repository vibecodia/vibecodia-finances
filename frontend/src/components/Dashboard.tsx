import { format, getDate, getDaysInMonth, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { Target, AlertTriangle, CreditCard, Eye, EyeOff, Scissors, Sparkles, Trash2, Pencil } from 'lucide-react';
import React, { useState } from 'react';
import Confetti from 'react-confetti';
import { useNavigate } from 'react-router-dom';

import familyBg from '../assets/family-bg.jpg';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalStorage } from '../hooks/trello/useLocalStorage';
import useWindowSize from '../hooks/useWindowSize';
import { Transaction, SavingsGoal } from '../types';
import { calculateBalances } from '../utils/balanceCalculations';
import { formatCurrency, filterTransactionsByMonth, formatPaymentMethod, getCurrentBrazilDate } from '../utils/helpers';
import { cn } from '../lib/utils';
import RecentTransactionsFloatingCard from './RecentTransactionsFloatingCard';
import MonthSegmentedControl from './MonthSegmentedControl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { useCurrencyInput } from '../hooks/useCurrencyInput';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';



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
  splitValue?: number;
  splitLabel?: string;
}

const AccountSlider: React.FC<AccountSliderProps> = ({ label, income, spent, formatCurrency, daysPassed, totalDays, splitValue = 0, splitLabel }) => {
  const remaining = Math.max(0, income - spent);
  const hasIncome = income > 0;
  const balance = income - spent;

  const spentPct = hasIncome
    ? (Math.min(income, spent) / income) * 100
    : spent > 0 ? 100 : 0;

  const remainingPct = hasIncome
    ? (remaining / income) * 100
    : spent > 0 ? 0 : 100;

  // Split calculation
  const flexAmount = Math.min(remaining, splitValue);
  const flexPct = hasIncome ? (flexAmount / income) * 100 : 0;
  // const mercadoPct = Math.max(0, remainingPct - flexPct);

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
          <span className="text-sm font-semibold text-muted-foreground">{label}</span>
          {spent > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono italic">
              (média diária {formatCurrency(avgDailySpent)})
            </span>
          )}
        </div>
        <span className={`text-[10px] font-mono font-bold uppercase tracking-wide ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Barra invertida: vermelho da esquerda, verde à direita */}
      <div className="w-full bg-muted rounded-full h-3 relative overflow-hidden shadow-inner">
        {/* Vermelho: gasto — da esquerda */}
        <div
          className="h-3 transition-all duration-700 absolute left-0 rounded-l-full z-20"
          style={{
            width: `${spentPct}%`,
            background: isDanger
              ? 'linear-gradient(90deg, hsl(var(--destructive)), #ef4444)'
              : isWarning
                ? 'linear-gradient(90deg, #d97706, #fbbf24)'
                : 'linear-gradient(90deg, #f87171, #ef4444)',
          }}
        />

        {/* Verde: mercado (disponível — da direita, mas antes do flex) */}
        <div
          className="bg-primary/40 h-3 transition-all duration-700 absolute right-0 rounded-r-full"
          style={{ width: `${remainingPct}%` }}
        />

        {/* Amber: flex (disponível — da extrema direita) */}
        {flexPct > 0 && (
          <div
            className="bg-amber-400 h-3 transition-all duration-700 absolute right-0 rounded-r-full z-10"
            style={{ width: `${flexPct}%` }}
          />
        )}

        {/* Linha divisória entre gasto e disponível */}
        {spentPct > 0 && remainingPct > 0 && (
          <div
            className="absolute top-0 w-0.5 h-full bg-background/40 z-30"
            style={{ left: `${spentPct}%`, transform: 'translateX(-50%)' }}
          />
        )}
      </div>

      {/* Percentual usado abaixo da barra */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground font-mono">
            {spentPct.toFixed(0)}% utilizado
          </span>
          {flexPct > 0 && (
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 transition-all hover:bg-primary/10">
                 <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_4px_rgba(74,222,128,0.5)]" />
                 <span className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter">
                   Saldo Mercado: {formatCurrency(remaining - flexAmount)}
                 </span>
               </div>
               <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 transition-all hover:bg-amber-500/10">
                 <div className="w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_4px_rgba(251,191,36,0.5)] animate-pulse" />
                 <span className="text-[9px] text-amber-700 dark:text-amber-400 font-black uppercase tracking-tighter">
                   Saldo {splitLabel || 'Flex'}: {formatCurrency(flexAmount)}
                 </span>
               </div>
            </div>
          )}
        </div>
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
          <div className="text-[10px] text-muted-foreground uppercase">Recebido</div>
        </div>
        <div>
          <div className="text-xs font-bold text-destructive">
            {formatCurrency(spent)}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase">Gasto</div>
        </div>
        <div>
          <div className={`text-xs font-bold ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {formatCurrency(balance)}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase">Saldo</div>
        </div>
      </div>
    </div>
  );
};

// ─── FlashSplitModal ──────────────────────────────────────────────────────────

interface FlashSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalBalance: number;
  currentFlex: number;
  onSave: (amount: number) => void;
  onRemove: () => void;
}

const FlashSplitModal: React.FC<FlashSplitModalProps> = ({ 
  isOpen, 
  onClose, 
  totalBalance, 
  currentFlex, 
  onSave,
  onRemove
}) => {
  // const { theme } = useTheme();
  const { inputProps, numericValue, setNumericValue } = useCurrencyInput(currentFlex);

  // Sync with current value whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setNumericValue(currentFlex);
    }
  }, [isOpen, currentFlex, setNumericValue]);

  const remainingMercado = totalBalance - numericValue;
  const isOverLimit = numericValue > totalBalance;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            Split Saldo Flash
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-5 rounded-2xl bg-primary/5 dark:bg-primary/10 border-2 border-primary/20 space-y-4 shadow-inner">
            <div className="flex justify-between items-center text-[10px] text-primary font-black uppercase tracking-[0.2em]">
              <span className="flex items-center gap-2">
                <CreditCard className="w-3 h-3" />
                Saldo Total Flash
              </span>
              <span className="font-mono text-sm">{formatCurrency(totalBalance)}</span>
            </div>
            
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner relative">
              <div 
                className="h-full bg-primary transition-all duration-700 ease-out" 
                style={{ width: `${Math.min(100, (remainingMercado / totalBalance) * 100)}%` }}
              />
              <div 
                className="absolute top-0 h-full w-px bg-white/60 z-10"
                style={{ right: `${Math.min(100, (numericValue / totalBalance) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-end">
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-primary/60 uppercase">Mercado</p>
                <p className="text-sm font-black text-primary">{formatCurrency(Math.max(0, remainingMercado))}</p>
              </div>
              <div className="space-y-0.5 text-right">
                <p className="text-[9px] font-bold text-amber-600 uppercase">Flex (Seu Input)</p>
                <p className="text-sm font-black text-amber-500">{formatCurrency(numericValue)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-black text-foreground/80 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                Informe o Saldo Flex
              </label>
              <span className="text-[10px] font-bold text-amber-600/60 uppercase bg-amber-500/10 px-2 py-0.5 rounded-full">
                Manual
              </span>
            </div>
            
            <div className="relative group">
              <Input
                {...inputProps}
                autoFocus
                className={cn(
                  "w-full bg-slate-100 dark:bg-slate-800 border-4 rounded-[2rem] p-6 text-4xl font-black text-center transition-all focus:outline-none shadow-xl",
                  isOverLimit 
                    ? 'border-red-500/50 text-red-500 ring-4 ring-red-500/10' 
                    : 'border-amber-500/30 focus:border-amber-500 focus:ring-8 focus:ring-amber-500/10 text-amber-600 dark:text-amber-400'
                )}
                placeholder="R$ 0,00"
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-black uppercase px-4 py-1 rounded-full shadow-lg tracking-widest whitespace-nowrap">
                Ajustando Saldo Flex
              </div>
            </div>

            {isOverLimit && (
              <div className="flex items-center justify-center gap-2 text-red-500 animate-bounce mt-4">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-[10px] font-black uppercase tracking-tighter">
                  O valor flex não pode superar o saldo total!
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center gap-6 sm:gap-8 pt-2">
          <Button
            onClick={onRemove}
            variant="ghost"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-600"
          >
            Remover Split
          </Button>
          <Button
            onClick={() => onSave(numericValue)}
            disabled={isOverLimit || numericValue < 0}
            className="flex-1"
          >
            Confirmar Saldo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard: React.FC<DashboardProps> = ({ transactions, savingsGoals }) => {
  const navigate = useNavigate();
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(getCurrentBrazilDate());
  const [showBalance, setShowBalance] = useLocalStorage('dashboard_show_balance', true);
  const [includeBenefits, setIncludeBenefits] = useLocalStorage('dashboard_include_benefits', true);
  const [isFlashSplit, setIsFlashSplit] = useLocalStorage('dashboard_flash_is_split', false);
  const [flashFlexAmount, setFlashFlexAmount] = useLocalStorage('dashboard_flash_flex_amount', 0);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const { theme } = useTheme();

  const today = getCurrentBrazilDate();
  const isSelectedMonthCurrent = format(currentMonth, 'yyyy-MM') === format(today, 'yyyy-MM');
  const isSelectedMonthPast = isBefore(endOfMonth(currentMonth), startOfMonth(today));
  
  const totalDays = getDaysInMonth(currentMonth);
  const daysPassed = isSelectedMonthCurrent 
    ? getDate(today) 
    : (isSelectedMonthPast ? totalDays : 0);

  const transactionsForSelectedMonth = filterTransactionsByMonth(transactions, currentMonth);
  const balanceData = calculateBalances(transactions, savingsGoals, currentMonth);

  // --- Lógica para incluir ou não benefícios (Flash/Vero Card) no saldo total ---
  const isBenefitTransaction = (t: Transaction) => {
    const desc = t.description.toLowerCase();
    const cat = t.category.toLowerCase();
    const pm = t.paymentMethod ? formatPaymentMethod(t.paymentMethod) : '';
    
    if (t.type === 'income') {
      return desc.includes('flash') || cat.includes('flash') || pm === 'Flash' ||
             desc.includes('vero') || cat.includes('vero') || pm === 'Vero Card';
    } else {
      return pm === 'Flash' || pm === 'Vero Card';
    }
  };

  const benefitTransactions = transactionsForSelectedMonth.filter(t => {
    if (t.status === 'deleted' || t.category === 'Aporte' || !t.isPaid) return false;
    return isBenefitTransaction(t);
  });

  const totalBenefitBalance = benefitTransactions.reduce((acc, t) => 
    acc + (t.type === 'income' ? t.amount : -t.amount), 0);

  const baseBalance = balanceData.adjustedBalance;
  // Apenas subtrai os benefícios se for o mês atual E o toggle estiver desligado
  const finalBalance = (includeBenefits || !isSelectedMonthCurrent) ? baseBalance : baseBalance - totalBenefitBalance;
  const displayBalance = Math.abs(finalBalance) < 0.001 ? 0 : finalBalance;

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

  const currentFlashBalance = flashIncome - flashSpent;

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

  const activeGoals = savingsGoals.filter(goal => goal.status !== 'deleted');
  const totalSavingsGoals = activeGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalSaved = activeGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  const getBalanceStatusLabel = () => {
    if (finalBalance < -0.001) return <AlertTriangle className="w-5 h-5 opacity-90" />;
    
    let label = includeBenefits ? 'Ocultar vales' : 'Ver vales';
    if (!isSelectedMonthCurrent) label = 'Vales inclusos';

    return (
      <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-80">
        {label}
      </span>
    );
  };

  const handleBalanceCardClick = () => {
    setShowConfetti(true);
    setIsPulsing(true);
    setTimeout(() => setShowConfetti(false), 3000);
    setTimeout(() => setIsPulsing(false), 300);
  };

  const confettiColors = finalBalance < 0
    ? ['#FFD700', '#DAA520', '#B8860B', '#8B4513']
    : ['#a8e063', '#56ab2f', '#4CAF50', '#8BC34A'];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={finalBalance < 0 ? 300 : 200}
            colors={confettiColors}
          />
        )}

        {/* Header */}
        <div className="py-3 w-full">
          <MonthSegmentedControl
            month={currentMonth}
            onChange={(newMonth) => setCurrentMonth(newMonth)}
          />
        </div>

        {/* Main Balance Card */}
      <div
        className={`relative overflow-hidden rounded-[2.5rem] p-8 cursor-pointer border border-white/10 transition-all duration-500 shadow-xl text-white ${
          isPulsing ? 'scale-[1.02]' : 'scale-100'
        }`}
        style={{
          backgroundColor: theme.primary,
        }}
        onClick={handleBalanceCardClick}
      >
        {/* Background Image Layer with slow movement */}
        <div 
          className="absolute inset-0 animate-slow-zoom-pan opacity-40 bg-cover bg-center"
          style={{ backgroundImage: `url(${familyBg})` }}
        />

        {/* Gradient Overlay for better readability and brand color */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(135deg, ${theme.primary}dd 0%, ${theme.primary}88 50%, ${theme.primary}bb 100%)`,
          }}
        />

        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-1">
                Total em Carteira
              </p>
              <h2 className="text-xl font-black tracking-tight uppercase italic">
                {finalBalance < -0.001 ? 'Saldo Devedor' : 'Saldo'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBalance(!showBalance);
                }}
                variant="ghost"
                size="icon"
                className="bg-black/10 backdrop-blur-xl border border-white/10 hover:bg-black/20"
              >
                {showBalance ? <EyeOff className="w-5 h-5 opacity-70" /> : <Eye className="w-5 h-5 opacity-70" />}
              </Button>
              
              <div 
                className={`flex items-center gap-4 bg-black/10 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 shadow-lg transition-all ${
                  isSelectedMonthCurrent 
                    ? 'hover:bg-black/20 group cursor-pointer' 
                    : 'opacity-40 grayscale cursor-not-allowed'
                }`}
                onClick={(e) => {
                  if (!isSelectedMonthCurrent) return;
                  e.stopPropagation();
                  setIncludeBenefits(!includeBenefits);
                }}
                title={!isSelectedMonthCurrent ? "Disponível apenas no mês atual" : ""}
              >
                {getBalanceStatusLabel()}
                <div
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] ${
                    includeBenefits && isSelectedMonthCurrent ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xl transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] ${
                      includeBenefits && isSelectedMonthCurrent ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </div>
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

        {finalBalance < -0.001 && (
          <div className="absolute top-0 right-0 p-4">
            <div className="animate-pulse bg-rose-500 w-2 h-2 rounded-full shadow-[0_0_10px_#ef4444]" />
          </div>
        )}
      </div>

      {/* Barra receitas vs despesas */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full" />
            <span className="text-foreground font-medium">Receitas</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded-full" />
              <span className="text-foreground text-sm">Gastos Pagos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full" />
              <span className="text-foreground text-sm">Não Pagos</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-muted rounded-full h-5 relative overflow-hidden shadow-inner">
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
            <div className="text-xs text-muted-foreground">Receitas</div>
            <div className="text-xs text-muted-foreground font-medium">{formatCurrency(currentIncome)}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              {expensesPaid > 0 ? ((expensesPaid / (currentIncome + expensesPaid + expensesUnpaid)) * 100).toFixed(1) : '0'}%
            </div>
            <div className="text-xs text-muted-foreground">Pagos</div>
            <div className="text-xs text-muted-foreground font-medium">{formatCurrency(expensesPaid)}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-400 dark:text-red-300">
              {expensesUnpaid > 0 ? ((expensesUnpaid / (currentIncome + expensesPaid + expensesUnpaid)) * 100).toFixed(1) : '0'}%
            </div>
            <div className="text-xs text-muted-foreground">Não Pagos</div>
            <div className="text-xs text-muted-foreground font-medium">{formatCurrency(expensesUnpaid)}</div>
          </div>
        </div>
      </Card>

      {/* Benefícios — Flash / Vero Card */}
      <Card
        className="p-6 space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="text-foreground font-bold">Saldo Benefícios</span>
          </div>
        </div>

        <div className="space-y-4">
          <AccountSlider
            label="Flash"
            income={flashIncome}
            spent={flashSpent}
            formatCurrency={formatCurrency}
            daysPassed={daysPassed}
            totalDays={totalDays}
            splitValue={isFlashSplit ? flashFlexAmount : 0}
            splitLabel="Flex"
          />

          <div className="flex justify-end items-center gap-4 px-1">
            {isFlashSplit && (
              <Button
                onClick={() => setIsSplitModalOpen(true)}
                variant="ghost"
                size="sm"
                className="text-[10px] font-black uppercase tracking-widest text-foreground/40"
                title="Ajustar Split"
              >
                <Pencil className="w-3 h-3 mr-1.5" />
                Ajustar
              </Button>
            )}
            <Button
              onClick={() => {
                if (isFlashSplit) {
                  setFlashFlexAmount(0);
                  setIsFlashSplit(false);
                } else {
                  setIsSplitModalOpen(true);
                }
              }}
              variant="ghost"
              size="sm"
              className={cn(
                "text-[10px] font-black uppercase tracking-widest transition-colors",
                isFlashSplit
                  ? 'text-red-500/60 hover:text-red-600'
                  : 'text-foreground/40 hover:text-primary'
              )}
            >
              {isFlashSplit ? <Trash2 className="w-3 h-3 mr-1.5" /> : <Scissors className="w-3 h-3 mr-1.5" />}
              {isFlashSplit ? 'Remover Split' : 'Split Flex'}
            </Button>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700" />

        <AccountSlider
          label="Vero Card"
          income={veroIncome}
          spent={veroSpent}
          formatCurrency={formatCurrency}
          daysPassed={daysPassed}
          totalDays={totalDays}
        />
      </Card>

      {/* Modal de Split do Flash */}
      <FlashSplitModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        totalBalance={currentFlashBalance}
        currentFlex={flashFlexAmount}
        onSave={(amount: number) => {
          setFlashFlexAmount(amount);
          setIsFlashSplit(true);
          setIsSplitModalOpen(false);
        }}
        onRemove={() => {
          setFlashFlexAmount(0);
          setIsFlashSplit(false);
          setIsSplitModalOpen(false);
        }}
      />

      {/* Progresso das Metas */}
      {savingsGoals.length > 0 && (
        <Card
          className="cursor-pointer"
          onClick={() => navigate('/goals')}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground truncate pr-2">Progresso das Metas</h3>
            <Target className="w-4 h-4 text-primary flex-shrink-0" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground truncate pr-2">Progresso Total</span>
              <span className="font-medium text-foreground flex-shrink-0">
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
            <div className="text-xs text-muted-foreground">
              {totalSavingsGoals > 0 ? Math.round((totalSaved / totalSavingsGoals) * 100) : 0}% concluído
            </div>
          </div>
        </Card>
      )}

      <RecentTransactionsFloatingCard transactions={transactions} />
    </div>
  );
};

export default Dashboard;
