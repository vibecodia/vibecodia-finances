import { startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { Plus, Trash2, Filter, Check, Calendar, CreditCard, Clock, Edit3, Wallet, ChevronDown, ChevronUp, RefreshCw, Search } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useTheme } from '../contexts/ThemeContext';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { SavingsGoal, Transaction } from '../types';
import { formatBrazilDate, formatCurrency, formatPaymentMethod, filterTransactionsByMonth, getCurrentBrazilDate, getDaysUntilDue, isTransactionOverdue, parseLocalDate } from '../utils/helpers';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';

import ConfirmationModal from './ConfirmationModal';
import DailyDateSlider from './DailyDateSlider';
import TransactionForm from './TransactionForm';
import MonthSegmentedControl from './MonthSegmentedControl';



interface TransactionListProps {
  type: 'expense' | 'income';
  transactions: Transaction[];
  savingsGoals?: SavingsGoal[];
  onAdd: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
  onUpdatePaymentStatus: (id: string, isPaid: boolean) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  type,
  transactions,
  savingsGoals = [],
  onAdd,
  onUpdate,
  onDelete,
  onUpdatePaymentStatus
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToReplicate, setTransactionToReplicate] = useState<Transaction | null>(null);
  const pressTimer = React.useRef<NodeJS.Timeout | null>(null);
  const countdownTimer = React.useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string[]>(['all']);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string[]>(['all']);
  const [currentMonth, setCurrentMonth] = useState<Date>(getCurrentBrazilDate());
  const [startDateFilter, setStartDateFilter] = useState<Date | null>(null);
  const [endDateFilter, setEndDateFilter] = useState<Date | null>(null);
  const [isDailyFilterActive, setIsDailyFilterActive] = useState(false);
  const [animatedTransactionId, setAnimatedTransactionId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // Re-introduce searchTerm state
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [showDeleted, setShowDeleted] = useState(false);
  const [apporteMessage, setApporteMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter and split transactions early so useEffect and body can use them
  const allMonthTransactions = filterTransactionsByMonth(
    transactions.filter(t => t.type === type)
      .filter(t => categoryFilter.includes('all') || categoryFilter.includes(t.category))
      .filter(t => {
        if (paymentFilter === 'all') return true;
        if (paymentFilter === 'paid') return t.isPaid;
        if (paymentFilter === 'pending') return !t.isPaid;
        return true;
      })
      .filter(t => {
        if (paymentMethodFilter.includes('all')) return true;
        return t.paymentMethod && paymentMethodFilter.includes(formatPaymentMethod(t.paymentMethod));
      })
      .filter(t => {
        if (type === 'expense' && searchTerm) {
          return t.description.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
      }), 
    currentMonth, 
    true
  );
  
  const baseActiveTransactions = allMonthTransactions.filter(t => t.status !== 'deleted');
  const baseDeletedTransactions = allMonthTransactions.filter(t => t.status === 'deleted');

  // Aplicar filtro diário (slider) para as listas base
  const activeTransactions = (startDateFilter && endDateFilter)
    ? baseActiveTransactions.filter(t => {
        const transactionDate = parseLocalDate(t.date);
        return transactionDate >= startDateFilter && transactionDate <= endDateFilter;
      })
    : baseActiveTransactions;

  const deletedTransactions = (startDateFilter && endDateFilter)
    ? baseDeletedTransactions.filter(t => {
        const transactionDate = parseLocalDate(t.date);
        return transactionDate >= startDateFilter && transactionDate <= endDateFilter;
      })
    : baseDeletedTransactions;

  // Auto-switch back to active view if no deleted transactions remain in the current range
  useEffect(() => {
    if (showDeleted && deletedTransactions.length === 0) {
      setShowDeleted(false);
    }
  }, [deletedTransactions.length, showDeleted]);

  const toggleNotes = (id: string) => {
    setExpandedNotes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatNotes = (notes: any) => {
    if (!notes) return '';
    
    // Se já for um objeto (nova estrutura de Map/Mixed no banco)
    if (typeof notes === 'object' && notes !== null) {
      if (notes.items && Array.isArray(notes.items)) {
        return `ITENS DA NOTA:\n${notes.items.map((item: any) => 
          `${item.qty}x ${item.description} - R$ ${item.unitPrice.toFixed(2).replace('.', ',')}`
        ).join('\n')}`;
      }
      return JSON.stringify(notes, null, 2);
    }

    // Fallback para legado (string que pode ser JSON)
    try {
      if (typeof notes === 'string' && notes.startsWith('{')) {
        const parsed = JSON.parse(notes);
        if (parsed.items && Array.isArray(parsed.items)) {
          return `ITENS DA NOTA:\n${parsed.items.map((item: any) => 
            `${item.qty}x ${item.description} - R$ ${item.unitPrice.toFixed(2).replace('.', ',')}`
          ).join('\n')}`;
        }
      }
    } catch (e) {
      // Ignora erro e retorna texto puro
    }
    return notes;
  };
  const { theme, setThemeMonth } = useTheme();
  const { paymentMethods } = usePaymentMethods();

  useEffect(() => {
    setThemeMonth(currentMonth);
  }, [currentMonth, setThemeMonth]);

  useEffect(() => {
    setCategoryFilter(['all']);
    setPaymentFilter('all'); // Reset payment filter when type changes
    setPaymentMethodFilter(['all']); // Reset payment method filter when type changes
    setSearchTerm(''); // Reset search term when type changes
    // Reset daily filters when month or type changes
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    setStartDateFilter(start);
    setEndDateFilter(end);
  }, [type, currentMonth]);

  // Effect to trigger animation when search term changes
  useEffect(() => {
    if (searchTerm !== undefined) { // Only trigger if searchTerm is a controlled prop
      setIsSearching(true);
      const timer = setTimeout(() => {
        setIsSearching(false);
      }, 300); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  const handleCategoryFilterChange = (category: string) => {
    if (category === 'all') {
      setCategoryFilter(['all']);
    } else {
      setCategoryFilter(prev => {
        if (prev.includes('all')) {
          return [category];
        } else if (prev.includes(category)) {
          const newFilter = prev.filter(c => c !== category);
          return newFilter.length === 0 ? ['all'] : newFilter;
        } else {
          return [...prev, category];
        }
      });
    }
  };

  const handlePaymentMethodFilterChange = (method: string) => {
    if (method === 'all') {
      setPaymentMethodFilter(['all']);
    } else {
      setPaymentMethodFilter(prev => {
        if (prev.includes('all')) {
          return [method];
        } else if (prev.includes(method)) {
          const newFilter = prev.filter(m => m !== method);
          return newFilter.length === 0 ? ['all'] : newFilter;
        } else {
          return [...prev, method];
        }
      });
    }
  };

  useEffect(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    if (startDateFilter && endDateFilter && (!isSameDay(startDateFilter, start) || !isSameDay(endDateFilter, end))) {
      setIsDailyFilterActive(true);
    } else {
      setIsDailyFilterActive(false);
    }
  }, [startDateFilter, endDateFilter, currentMonth]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [transactionToReactivate, setTransactionToReactivate] = useState<string | null>(null);
  
  const categories = [...new Set(transactions.filter(t => t.type === type).map(t => t.category))];
  
  // Apply visibility toggle - if showDeleted is true, show ONLY deleted
  const transactionsForDisplay = showDeleted ? deletedTransactions : activeTransactions;

  // Sort expenses by due date
  const sortedTransactions = type === 'expense'
    ? [...transactionsForDisplay].sort((a, b) => {
        const dateA = a.dueDate ? parseLocalDate(a.dueDate) : new Date(8640000000000000); // Max Date
        const dateB = b.dueDate ? parseLocalDate(b.dueDate) : new Date(8640000000000000); // Max Date
        return dateA.getTime() - dateB.getTime();
      })
    : transactionsForDisplay;

  const currentTotal = activeTransactions.reduce((acc, t) => acc + t.amount, 0);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTransaction(null);
    setTransactionToReplicate(null);
    setFormError(null);
  };

  const handleSubmit = async (transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    setFormError(null);
    try {
      if (editingTransaction) {
        await onUpdate(editingTransaction.id, transactionData);
      } else {
        const newTransaction = await onAdd(transactionData);
        if (newTransaction && newTransaction.id) {
          setAnimatedTransactionId(newTransaction.id);
        }
        if (newTransaction?.category === 'Aporte' && newTransaction?.savingsGoalId) {
          const goal = savingsGoals.find(g => (g.id || g._id) === newTransaction.savingsGoalId);
          const goalLabel = goal ? goal.name : 'meta';
          setApporteMessage(`Aporte vinculado à ${goalLabel}.`);
          window.setTimeout(() => setApporteMessage(null), 4000);
        }
      }
      handleCloseForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar a transação.';
      setFormError(message);
    }
  };

  const openDeleteModal = (id: string) => {
    setTransactionToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setTransactionToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const openReactivateModal = (id: string) => {
    setTransactionToReactivate(id);
    setIsReactivateModalOpen(true);
  };

  const closeReactivateModal = () => {
    setTransactionToReactivate(null);
    setIsReactivateModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (transactionToDelete) {
      onDelete(transactionToDelete);
    }
  };

  const handleReactivateConfirm = () => {
    if (transactionToReactivate) {
      onUpdate(transactionToReactivate, { status: 'active', deletedAt: undefined });
    }
  };

  // Deprecated by MonthSegmentedControl

  const handleDailyFilterChange = (newStartDate: Date, newEndDate: Date) => {
    setStartDateFilter(newStartDate);
    setEndDateFilter(newEndDate);
  };

  const handleClearDailyFilter = () => {
    setStartDateFilter(startOfMonth(currentMonth));
    setEndDateFilter(endOfMonth(currentMonth));
  };

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent, transaction: Transaction) => {
    // If the event target is a button or an element inside a button, do not initiate long press logic
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
      return;
    }

    // Clear any existing long press timeout to prevent multiple triggers
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }

    // Set a timeout to initiate the long press after a delay
    longPressTimeoutRef.current = setTimeout(() => {
      // Prevent default only when long press is confirmed
      if ('button' in e) { // Check if it's a MouseEvent
        e.preventDefault();
      } else { // It's a TouchEvent
        e.preventDefault(); // Prevent default touch behavior (like scrolling, zooming)
        e.stopPropagation(); // Stop event propagation to prevent text selection on some devices
      }

      setActiveTransactionId(transaction.id);
      setCountdown(3);

      countdownTimer.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            if (countdownTimer.current) {
              clearInterval(countdownTimer.current);
              countdownTimer.current = null;
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      pressTimer.current = setTimeout(() => {
        if (countdownTimer.current) { // Ensure countdown completed naturally
          clearInterval(countdownTimer.current);
          countdownTimer.current = null;
        }
        setTransactionToReplicate(transaction);
        setShowForm(true);
        setCountdown(null); // Reset countdown after action
        setActiveTransactionId(null); // Reset active transaction
      }, 3000); // 3000ms for long press
    }, 500); // 500ms delay for long press
  };

  const handlePressEnd = () => {
    if (longPressTimeoutRef.current) { // Clear the initial long press timeout
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    setCountdown(null);
    setActiveTransactionId(null);
  };

  // Effect to trigger animation when a transaction is updated (e.g., payment status)
  useEffect(() => {
    if (animatedTransactionId) {
      const timer = setTimeout(() => {
        setAnimatedTransactionId(null);
      }, 1000); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [animatedTransactionId]);

  const handleUpdatePaymentStatusAndAnimate = async (id: string, isPaid: boolean) => {
    await onUpdatePaymentStatus(id, isPaid);
    setAnimatedTransactionId(id);
  };

  return (
    <div className="space-y-6">
      {apporteMessage && (
        <Card className="p-4 border-2 animate-in slide-in-from-top-2 duration-300" style={{ borderColor: theme.cardBorder }}>
          <div className="font-black text-xs uppercase tracking-tight flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            {apporteMessage}
          </div>
        </Card>
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <MonthSegmentedControl
              month={currentMonth}
              onChange={(newMonth) => setCurrentMonth(newMonth)}
            />
          </div>
          <h2 className="text-xl font-black text-foreground uppercase tracking-tight truncate mb-1">
            {type === 'expense' ? 'Despesas' : 'Receitas'}
          </h2>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
            <p className="text-sm font-black uppercase tracking-tighter" style={{ color: type === 'income' ? 'hsl(var(--primary))' : 'hsl(var(--accent))' }}>
              Total: {formatCurrency(currentTotal)}
            </p>
            {activeTransactions.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {activeTransactions.length} {activeTransactions.length === 1 ? 'item' : 'itens'}
              </span>
            )}
            {deletedTransactions.length > 0 && (
              <Button 
                onClick={() => setShowDeleted(!showDeleted)}
                variant={showDeleted ? 'accent' : 'ghost'}
                size="sm"
                className="h-6 text-[10px] px-2 py-0"
              >
                {deletedTransactions.length} {deletedTransactions.length === 1 ? 'excluído' : 'excluídos'}
                <ChevronDown className={cn("w-3 h-3 ml-1 transition-transform", showDeleted && "rotate-180")} />
              </Button>
            )}
          </div>
        </div>
        <Button
          onClick={() => {
            setFormError(null);
            setShowForm(true);
          }}
          size="icon"
          className="h-14 w-14 shadow-xl"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-4 relative z-30">
        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Button
              onClick={() => handleCategoryFilterChange('all')}
              variant={categoryFilter.includes('all') ? 'primary' : 'outline'}
              size="sm"
              className="rounded-full text-[10px] uppercase h-8 px-4"
            >
              Todas
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                onClick={() => handleCategoryFilterChange(category)}
                variant={categoryFilter.includes(category) && !categoryFilter.includes('all') ? 'primary' : 'outline'}
                size="sm"
                className="rounded-full text-[10px] uppercase h-8 px-4"
              >
                {category}
              </Button>
            ))}
          </div>
        )}

        {/* Payment Status Filter (only for expenses) */}
        {type === 'expense' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Button
              onClick={() => setPaymentFilter('all')}
              variant={paymentFilter === 'all' ? 'primary' : 'outline'}
              size="sm"
              className="rounded-full text-[10px] uppercase h-8 px-4"
            >
              Todos
            </Button>
            <Button
              onClick={() => setPaymentFilter(prev => prev === 'paid' ? 'all' : 'paid')}
              variant={paymentFilter === 'paid' ? 'primary' : 'outline'}
              size="sm"
              className="rounded-full text-[10px] uppercase h-8 px-4"
            >
              Pagos
            </Button>
            <Button
              onClick={() => setPaymentFilter(prev => prev === 'pending' ? 'all' : 'pending')}
              variant={paymentFilter === 'pending' ? 'accent' : 'outline'}
              size="sm"
              className="rounded-full text-[10px] uppercase h-8 px-4"
            >
              Pendentes
            </Button>
          </div>
        )}

        {/* Payment Method Filter (only for expenses) */}
        {type === 'expense' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Wallet className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Button
              onClick={() => handlePaymentMethodFilterChange('all')}
              variant={paymentMethodFilter.includes('all') ? 'primary' : 'outline'}
              size="sm"
              className="rounded-full text-[10px] uppercase h-8 px-4"
            >
              Todos
            </Button>
            {paymentMethods.map(method => (
              <Button
                key={method}
                onClick={() => handlePaymentMethodFilterChange(method)}
                variant={paymentMethodFilter.includes(method) && !paymentMethodFilter.includes('all') ? 'primary' : 'outline'}
                size="sm"
                className="rounded-full text-[10px] uppercase h-8 px-4"
              >
                {method}
              </Button>
            ))}
          </div>
        )}

        {/* Search Input (only for expenses) */}
        {type === 'expense' && (
          <div className="relative flex items-center w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
            <Input
              type="text"
              placeholder="Buscar despesas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12"
            />
          </div>
        )}

        {/* Daily Filter for Income/Expense */}
        {startDateFilter && endDateFilter && (
          <div className="flex items-center gap-3 pb-2">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <DailyDateSlider
              currentMonth={currentMonth}
              startDate={startDateFilter}
              endDate={endDateFilter}
              onChange={handleDailyFilterChange}
            />
            <Button
              onClick={handleClearDailyFilter}
              variant="secondary"
              size="sm"
              className={cn("h-8 text-[10px] uppercase rounded-full", !isDailyFilterActive && "opacity-30")}
              disabled={!isDailyFilterActive}
            >
              Limpar
            </Button>
          </div>
        )}
      </div>

      {/* Transaction List */}
      <div className={cn("space-y-4 transition-opacity duration-300", isSearching ? 'opacity-0' : 'opacity-100')}>
        {sortedTransactions.length === 0 ? (
          <Card className="p-12 text-center border-2 border-dashed flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Plus className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              Nenhuma {type === 'expense' ? 'despesa' : 'receita'} encontrada
            </p>
            <Button
              onClick={() => setShowForm(true)}
            >
              Adicionar {type === 'expense' ? 'Despesa' : 'Receita'}
            </Button>
          </Card>
        ) : (
          sortedTransactions.map((transaction, index) => {
            const overdue = isTransactionOverdue(transaction);
            const daysUntilDue = transaction.dueDate ? getDaysUntilDue(transaction.dueDate) : null;
            const isDeleted = transaction.status === 'deleted';

            return (
              <Card
                key={`${transaction.id}-${index}`}
                className={cn(
                  "relative p-5 group no-select border-2 transition-all active:scale-[0.98]",
                  animatedTransactionId === transaction.id && 'animate-pulse-once',
                  isDeleted && 'opacity-50 grayscale cursor-not-allowed'
                )}
                style={{ 
                  borderColor: isDeleted ? theme.cardBorder : (overdue ? theme.primary : (!transaction.isPaid && type === 'expense' ? theme.accent : theme.cardBorder))
                }}
                onMouseDown={(e) => !isDeleted && handlePressStart(e, transaction)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={(e) => !isDeleted && handlePressStart(e, transaction)}
                onTouchEnd={handlePressEnd}
                onTouchCancel={handlePressEnd}
                onTouchMove={handlePressEnd}
              >
                {activeTransactionId === transaction.id && countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl z-20 backdrop-blur-sm">
                    <span className="text-white text-6xl font-black animate-ping">{countdown}</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className={cn(
                        "font-black text-base text-foreground uppercase tracking-tight break-words flex-1",
                        isDeleted && 'line-through'
                      )}>
                        {transaction.description}
                      </h3>
                      {!isDeleted && (
                        <button
                          onClick={() => handleUpdatePaymentStatusAndAnimate(transaction.id, !transaction.isPaid)}
                          className={cn(
                            "p-2 rounded-xl transition-all shadow-sm flex-shrink-0 active:scale-90",
                            transaction.isPaid ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                          )}
                        >
                          {transaction.isPaid ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                    {transaction.notes && (
                      <div className="space-y-2">
                        <p className={cn(
                          "text-xs text-muted-foreground font-medium leading-relaxed whitespace-pre-wrap bg-muted/20 p-3 rounded-xl border border-border/10",
                          !expandedNotes[transaction.id] && 'line-clamp-2',
                          isDeleted && 'line-through'
                        )}>
                          {formatNotes(transaction.notes)}
                        </p>
                        {( (typeof transaction.notes === 'string' && (transaction.notes.length > 40 || transaction.notes.includes('\n') || transaction.notes.startsWith('{'))) || 
                           (typeof transaction.notes === 'object')) && (
                          <Button 
                            onClick={() => toggleNotes(transaction.id)}
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] uppercase font-black"
                            disabled={isDeleted}
                          >
                            {expandedNotes[transaction.id] ? (
                              <><ChevronUp className="w-3 h-3 mr-1" /> Ver menos</>
                            ) : (
                              <><ChevronDown className="w-3 h-3 mr-1" /> Ver itens da nota</>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-muted/30 text-foreground/60">
                        {transaction.category}
                      </span>
                      
                      {type === 'expense' && transaction.paymentMethod && (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-muted/30 text-foreground/60 flex items-center gap-1.5">
                          <Wallet className="w-3 h-3" />
                          {formatPaymentMethod(transaction.paymentMethod)}
                        </span>
                      )}
                      
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-muted/30 text-foreground/60">
                        {formatBrazilDate(transaction.date)}
                      </span>
                      
                      {transaction.recurrence !== 'none' && (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary text-white shadow-sm">
                          {transaction.recurrence === 'weekly' && 'Semanal'}
                          {transaction.recurrence === 'monthly' && 'Mensal'}
                          {transaction.recurrence === 'yearly' && 'Anual'}
                        </span>
                      )}
                    </div>

                    {/* Status Badges */}
                    {!isDeleted && (
                      <div className="flex flex-wrap gap-2">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                          transaction.isPaid 
                            ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                        )}>
                          {transaction.isPaid 
                            ? (type === 'expense' ? '✓ Pago' : '✓ Recebido') 
                            : (type === 'expense' ? '⏳ Pendente' : '⏳ A Receber')}
                        </span>
                        
                        {type === 'expense' && transaction.dueDate && (
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 shadow-sm",
                            overdue ? 'bg-accent text-white border-accent' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                          )}>
                            <Calendar className="w-3 h-3" />
                            {overdue ? 'Vencido' : 
                             daysUntilDue === 0 ? 'Vence hoje' : 
                             daysUntilDue === 1 ? 'Vence amanhã' :
                             daysUntilDue !== null && daysUntilDue > 0 ? `${daysUntilDue} dias` :
                             formatBrazilDate(transaction.dueDate)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <span className={cn(
                      "font-black text-lg sm:text-2xl",
                      isDeleted && 'line-through',
                      type === 'income' ? 'text-primary' : 'text-accent'
                    )}>
                      {formatCurrency(transaction.amount)}
                    </span>
                    <div className="flex gap-2">
                      {isDeleted ? (
                        <Button
                          onClick={() => openReactivateModal(transaction.id)}
                          size="sm"
                          title="Reativar transação"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleEdit(transaction)}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => openDeleteModal(transaction.id)}
                            variant="ghost"
                            size="sm"
                            className="hover:text-accent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Transaction Form Modal */}
      {showForm && (
        <TransactionForm
          type={type}
          transaction={editingTransaction}
          replicateTransaction={transactionToReplicate}
          savingsGoals={savingsGoals}
          submitError={formError}
          onSubmit={handleSubmit}
          onClose={handleCloseForm}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        title="Confirmar Exclusão"
        message="Tem certeza de que deseja excluir esta transação?"
      />

      {/* Reactivate Confirmation Modal */}
      <ConfirmationModal
        isOpen={isReactivateModalOpen}
        onClose={closeReactivateModal}
        onConfirm={handleReactivateConfirm}
        title="Confirmar Reativação"
        message="Deseja reativar esta transação? Ela voltará a ser contabilizada nos seus totais."
        confirmText="Confirmar Reativação"
      />
    </div>
  );
};

export default TransactionList;
