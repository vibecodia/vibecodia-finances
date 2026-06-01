import { startOfMonth, endOfMonth } from "date-fns";
import {
  AlertTriangle,
  Clock,
  CreditCard,
  TrendingUp,
  DollarSign,
  Repeat,
  Check,
  Wallet,
} from "lucide-react";
import React, { useState } from "react";

import { useTheme } from "../contexts/ThemeContext";
import { Transaction, PendingPayment } from "../types";
import {
  formatCurrency,
  getCurrentBrazilDate,
  formatBrazilDate,
  parseLocalDate,
  isTransactionOverdue,
  getDaysUntilDue,
  getTransactionsWithRecurrence,
  getBrazilDateString,
  formatPaymentMethod,
} from "../utils/helpers";
import MonthSegmentedControl from "./MonthSegmentedControl";

import TransactionDetailModal from "./TransactionDetailModal";

interface CalendarProps {
  transactions: Transaction[];
  onUpdatePaymentStatus: (id: string, isPaid: boolean) => void;
}

interface CalendarEvent {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: "expense" | "income";
  isPaid?: boolean;
  isOverdue?: boolean;
  daysUntilDue?: number | null;
  isRecurring?: boolean;
  paymentMethod?: string;
  originalId?: string; // For recurring transactions
}

const Calendar: React.FC<CalendarProps> = ({
  transactions,
  onUpdatePaymentStatus,
}) => {
  const [currentDate, setCurrentDate] = useState(getCurrentBrazilDate());
  const [processingPayments, setProcessingPayments] = useState<Set<string>>(
    new Set(),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const { theme } = useTheme();

  const handleDayClick = (date: Date) => {
    setSelectedDate((prev) => {
      // If the same date is clicked again, deselect it
      if (prev && prev.toDateString() === date.toDateString()) {
        return null;
      }
      return date;
    });
  };

  const handleTransactionClick = (transaction: CalendarEvent) => {
    // Find the original transaction object from the main transactions array
    const originalTransaction = transactions.find(
      (t) => t.id === transaction.originalId || t.id === transaction.id,
    );
    if (originalTransaction) {
      setSelectedTransaction(originalTransaction);
      setIsDetailModalOpen(true);
    }
  };

  const getPendingPayments = (): PendingPayment[] => {
    const today = getCurrentBrazilDate();
    const thirtyDaysFromNow = new Date(
      today.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    // FIXED: Get all transactions including recurring ones for the next 30 days (calendar context)
    const allTransactions = getTransactionsWithRecurrence(
      transactions,
      today,
      thirtyDaysFromNow,
      false,
    );

    return allTransactions
      .filter((t) => t.type === "expense" && !t.isPaid && t.dueDate)
      .map((t) => {
        const daysUntilDue = getDaysUntilDue(t.dueDate!);

        return {
          id: t.id,
          description: t.description,
          amount: t.amount,
          dueDate: t.dueDate!,
          category: t.category,
          isOverdue: isTransactionOverdue(t),
          daysUntilDue,
        };
      })
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    // const year = date.getFullYear();
    // const month = String(date.getMonth() + 1).padStart(2, '0');
    // const day = String(date.getDate()).padStart(2, '0');

    const events: CalendarEvent[] = [];

    // FIXED: Get all transactions for this specific date including recurring ones (calendar context)
    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayTransactions = getTransactionsWithRecurrence(
      transactions,
      dayStart,
      dayEnd,
      false,
    );

    const isSameDay = (d1: Date, d2: Date) => {
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    };

    // Add all expenses (both paid and pending)
    const expenseEvents = dayTransactions
      .filter((t) => {
        const transactionDate = t.dueDate
          ? parseLocalDate(t.dueDate)
          : parseLocalDate(t.date);
        return t.type === "expense" && isSameDay(transactionDate, date);
      })
      .map((t) => {
        const daysUntilDue = t.dueDate ? getDaysUntilDue(t.dueDate) : null;
        const isRecurring = t.id.includes("_") || t.recurrence !== "none";

        return {
          id: t.id,
          description: t.description,
          amount: t.amount,
          date: getBrazilDateString(
            t.dueDate ? parseLocalDate(t.dueDate) : parseLocalDate(t.date),
          ),
          category: t.category,
          type: "expense" as const,
          isPaid: t.isPaid,
          isOverdue: !t.isPaid && isTransactionOverdue(t),
          daysUntilDue,
          isRecurring,
          paymentMethod: t.paymentMethod,
          originalId: t.id.includes("_") ? t.id.split("_")[0] : undefined,
        };
      });

    // Add income (transaction date)
    const incomeEvents = dayTransactions
      .filter((t) => {
        const transactionDate = parseLocalDate(t.date);
        return t.type === "income" && isSameDay(transactionDate, date);
      })
      .map((t) => {
        const isRecurring = t.id.includes("_") || t.recurrence !== "none";

        return {
          id: t.id,
          description: t.description,
          amount: t.amount,
          date: getBrazilDateString(parseLocalDate(t.date)),
          category: t.category,
          type: "income" as const,
          isPaid: t.isPaid,
          isRecurring,
          paymentMethod: t.paymentMethod,
          originalId: t.id.includes("_") ? t.id.split("_")[0] : undefined,
        };
      });

    events.push(...expenseEvents, ...incomeEvents);
    return events.sort((a, b) => {
      // Sort by type (income first), then by amount
      if (a.type !== b.type) {
        return a.type === "income" ? -1 : 1;
      }
      return b.amount - a.amount;
    });
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const days: Date[] = [];

    // Add empty cells for days before the first day of the month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(new Date(year, month, -firstDayOfWeek + i + 1));
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handlePaymentStatusUpdate = async (
    eventId: string,
    isPaid: boolean,
  ) => {
    // Add to processing set to show loading state
    setProcessingPayments((prev) => new Set(prev).add(eventId));

    try {
      // For recurring transactions, we need to handle the original transaction
      if (eventId.includes("_")) {
        const originalId = eventId.split("_")[0];
        onUpdatePaymentStatus(originalId, isPaid);
      } else {
        onUpdatePaymentStatus(eventId, isPaid);
      }

      // Small delay to show the change visually
      setTimeout(() => {
        setProcessingPayments((prev) => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
      }, 500);
    } catch (error) {
      console.error("Error updating payment status:", error);
      setProcessingPayments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    }
  };

  const pendingPayments = getPendingPayments();
  const overduePayments = pendingPayments.filter((p) => p.isOverdue);
  const upcomingPayments = pendingPayments.filter(
    (p) => !p.isOverdue && p.daysUntilDue !== null && p.daysUntilDue <= 7,
  );
  const days = getDaysInMonth(currentDate);
  const today = getCurrentBrazilDate();

  // FIXED: Calculate monthly totals for current view including recurring transactions (calendar context)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const currentMonthEvents = getTransactionsWithRecurrence(
    transactions,
    monthStart,
    monthEnd,
    false,
  );

  const monthlyIncome = currentMonthEvents
    .filter((e) => e.type === "income" && e.isPaid)
    .reduce((sum, e) => sum + e.amount, 0);

  const monthlyExpensesPending = currentMonthEvents
    .filter((e) => e.type === "expense" && !e.isPaid)
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 relative">
      <div className="text-center py-4 space-y-4">
        <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">
          Calendário de Transações
        </h1>
        <div className="w-full">
          <MonthSegmentedControl
            month={currentDate}
            onChange={(newMonth) => setCurrentDate(newMonth)}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md"
          style={{
            backgroundColor: theme.cardBackground,
            borderColor: theme.cardBorder,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground truncate">
              Vencidos
            </p>
          </div>
          <p className="text-2xl font-black text-foreground">
            {overduePayments.length}
          </p>
          <p className="text-xs font-bold text-muted-foreground/60 mt-1">
            {formatCurrency(
              overduePayments.reduce((sum, p) => sum + p.amount, 0),
            )}
          </p>
        </div>

        <div
          className="rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md"
          style={{
            backgroundColor: theme.cardBackground,
            borderColor: theme.cardBorder,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground truncate">
              7 Dias
            </p>
          </div>
          <p className="text-2xl font-black text-foreground">
            {upcomingPayments.length}
          </p>
          <p className="text-xs font-bold text-muted-foreground/60 mt-1">
            {formatCurrency(
              upcomingPayments.reduce((sum, p) => sum + p.amount, 0),
            )}
          </p>
        </div>

        <div
          className="rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md"
          style={{
            backgroundColor: theme.cardBackground,
            borderColor: theme.cardBorder,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground truncate">
              Receitas
            </p>
          </div>
          <p className="text-2xl font-black text-primary">
            {formatCurrency(monthlyIncome)}
          </p>
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">
            Total do Mês
          </p>
        </div>

        <div
          className="rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md"
          style={{
            backgroundColor: theme.cardBackground,
            borderColor: theme.cardBorder,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
              <CreditCard className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground truncate">
              Pendentes
            </p>
          </div>
          <p className="text-2xl font-black text-accent">
            {formatCurrency(monthlyExpensesPending)}
          </p>
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">
            Gastos em Aberto
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: theme.cardBackground,
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === today.toDateString();
            const eventsForDay = getEventsForDate(day);
            const hasOverdue = eventsForDay.some(
              (e) => e.type === "expense" && e.isOverdue,
            );
            const hasUpcoming = eventsForDay.some(
              (e) => e.type === "expense" && !e.isOverdue && !e.isPaid,
            );
            const hasIncome = eventsForDay.some((e) => e.type === "income");
            const hasRecurring = eventsForDay.some((e) => e.isRecurring);

            return (
              <div
                key={index}
                className={`min-h-[80px] p-1 border rounded-lg cursor-pointer ${
                  !isCurrentMonth
                    ? "text-muted-foreground"
                    : isToday
                      ? "text-white"
                      : hasOverdue
                        ? "text-white"
                        : hasUpcoming
                          ? "text-white"
                          : hasIncome
                            ? "text-white"
                            : "text-foreground"
                } ${selectedDate && day.toDateString() === selectedDate.toDateString() ? "ring-2 ring-primary" : ""} transition-colors`}
                style={{
                  backgroundColor: !isCurrentMonth
                    ? theme.cardBackground
                    : isToday
                      ? theme.primary
                      : hasOverdue
                        ? theme.primary
                        : hasUpcoming
                          ? theme.accent
                          : hasIncome
                            ? theme.primary
                            : theme.cardBackground,
                  borderColor: !isCurrentMonth
                    ? theme.cardBorder
                    : isToday
                      ? theme.primary
                      : hasOverdue
                        ? theme.primary
                        : hasUpcoming
                          ? theme.accent
                          : hasIncome
                            ? theme.primary
                            : theme.cardBorder,
                }}
                onClick={() => isCurrentMonth && handleDayClick(day)}
              >
                <div className="text-sm font-medium mb-1 flex items-center justify-between">
                  <span>{day.getDate()}</span>
                  {hasRecurring && (
                    <>
                      <Repeat className="w-2 h-2 text-muted-foreground" />
                      <span className="sr-only">
                        Contém transações recorrentes
                      </span>
                    </>
                  )}
                </div>

                {eventsForDay.length > 0 && (
                  <div className="space-y-1">
                    {eventsForDay.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded truncate flex items-center gap-1 cursor-pointer text-white`}
                        style={{
                          backgroundColor:
                            event.type === "income"
                              ? theme.primary
                              : event.isOverdue
                                ? theme.primary
                                : event.isPaid
                                  ? theme.primary
                                  : theme.accent,
                        }}
                        title={`${event.description} - ${formatCurrency(event.amount)}${event.isRecurring ? " (Recorrente)" : ""}${event.type === "expense" ? (event.isPaid ? " - Pago" : " - Pendente") : ""}`}
                        onClick={() => handleTransactionClick(event)}
                      >
                        {event.type === "income" ? (
                          <TrendingUp className="w-2 h-2 flex-shrink-0" />
                        ) : event.isPaid ? (
                          <Check className="w-2 h-2 flex-shrink-0" />
                        ) : (
                          <DollarSign className="w-2 h-2 flex-shrink-0" />
                        )}
                        <span className="truncate">
                          {formatCurrency(event.amount)}
                        </span>
                        {event.isRecurring && (
                          <Repeat className="w-2 h-2 flex-shrink-0 opacity-70" />
                        )}
                      </div>
                    ))}
                    {eventsForDay.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{eventsForDay.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Day View */}
      {selectedDate && (
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: theme.cardBackground,
            border: `1px solid ${theme.cardBorder}`,
          }}
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 truncate">
            Transações de {formatBrazilDate(selectedDate)}
          </h3>
          <div className="space-y-3">
            {getEventsForDate(selectedDate).length > 0 ? (
              getEventsForDate(selectedDate).map((event) => {
                const isProcessing = processingPayments.has(event.id);
                return (
                  <div
                    key={event.id}
                    className={`flex items-center justify-between p-4 rounded-xl border gap-3 transition-all cursor-pointer ${isProcessing ? "opacity-75" : ""}`}
                    style={{
                      backgroundColor: theme.cardBackground,
                      borderColor:
                        event.type === "income"
                          ? theme.primary
                          : event.isPaid
                            ? theme.primary
                            : event.isOverdue
                              ? theme.primary
                              : theme.accent,
                    }}
                    onClick={() => handleTransactionClick(event)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {event.type === "income" ? (
                          <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
                        ) : event.isPaid ? (
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-accent flex-shrink-0" />
                        )}
                        <h4 className="font-medium text-foreground truncate">
                          {event.description}
                        </h4>
                        {event.isRecurring && (
                          <>
                            <Repeat className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="sr-only">
                              Transação recorrente
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <span
                          className="px-2 py-1 rounded-full truncate max-w-[120px]"
                          style={{ backgroundColor: theme.cardBorder }}
                        >
                          {event.category}
                        </span>
                        {event.type === "expense" && event.paymentMethod && (
                          <span
                            className="px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap"
                            style={{ backgroundColor: theme.cardBorder }}
                          >
                            <Wallet className="w-3 h-3 flex-shrink-0" />
                            {formatPaymentMethod(event.paymentMethod)}
                          </span>
                        )}
                        {event.type === "expense" && (
                          <span
                            className={`px-2 py-1 rounded-full whitespace-nowrap text-white`}
                            style={{
                              backgroundColor: event.isPaid
                                ? theme.primary
                                : event.isOverdue
                                  ? theme.primary
                                  : event.daysUntilDue === 0
                                    ? theme.accent
                                    : event.daysUntilDue === 1
                                      ? theme.accent
                                      : theme.primary,
                            }}
                          >
                            {event.isPaid
                              ? "✓ Pago"
                              : event.isOverdue
                                ? "Vencido"
                                : event.daysUntilDue === 0
                                  ? "Vence hoje"
                                  : event.daysUntilDue === 1
                                    ? "Vence amanhã"
                                    : event.daysUntilDue !== null
                                      ? `${event.daysUntilDue} dias`
                                      : "Sem vencimento"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={`font-semibold text-sm sm:text-lg break-words`}
                        style={{
                          color:
                            event.type === "income"
                              ? theme.primary
                              : theme.accent,
                        }}
                      >
                        {event.type === "income" ? "+" : "-"}
                        {formatCurrency(event.amount)}
                      </span>
                      {event.type === "expense" && !event.isPaid && (
                        <button
                          onClick={() =>
                            handlePaymentStatusUpdate(event.id, true)
                          }
                          disabled={isProcessing}
                          className={`px-3 py-2 text-white rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                            isProcessing
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-primary hover:bg-secondary"
                          }`}
                        >
                          {isProcessing ? (
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                              Processando...
                            </div>
                          ) : (
                            "Marcar como Pago"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-center">
                Nenhuma transação para esta data.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pending Payments List */}
      {/* Pending Payments List - Temporarily removed for debugging */}

      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
};

export default Calendar;
