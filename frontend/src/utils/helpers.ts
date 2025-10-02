import { format, startOfMonth, endOfMonth, isWithinInterval, addWeeks, addMonths, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction, MonthlyData, CategoryData, SavingsGoal } from '../types';

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

// FIXED: Get current date in Brazil timezone (America/Sao_Paulo) - DEFINITIVE SOLUTION
export const getCurrentBrazilDate = (): Date => {
  // Use Intl.DateTimeFormat to get the exact time in São Paulo timezone
  const now = new Date();
  const brazilTime = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  // Extract parts and create a proper Date object
  const year = parseInt(brazilTime.find(part => part.type === 'year')?.value || '0');
  const month = parseInt(brazilTime.find(part => part.type === 'month')?.value || '0') - 1; // Month is 0-indexed
  const day = parseInt(brazilTime.find(part => part.type === 'day')?.value || '0');
  const hour = parseInt(brazilTime.find(part => part.type === 'hour')?.value || '0');
  const minute = parseInt(brazilTime.find(part => part.type === 'minute')?.value || '0');
  const second = parseInt(brazilTime.find(part => part.type === 'second')?.value || '0');

  return new Date(year, month, day, hour, minute, second);
};

// CRITICAL FIX: Format date in Brazil format - CARDS DATE DISPLAY FIXED 100%
export const formatBrazilDate = (date: Date | string, formatStr: string = 'dd/MM/yyyy'): string => {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // CRITICAL FIX FOR CARDS: Handle date strings with ABSOLUTE ZERO timezone interference
    if (date.includes('T')) {
      // If it's an ISO string (from backend), parse it as UTC and then adjust to Brazil's local day
      const utcDate = new Date(date);
      // Get year, month, day from UTC date
      const year = utcDate.getUTCFullYear();
      const month = utcDate.getUTCMonth();
      const day = utcDate.getUTCDate();
      // Create a new Date object representing the same calendar day in local timezone (at noon to avoid DST issues)
      dateObj = new Date(year, month, day, 12, 0, 0, 0);
    } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // For YYYY-MM-DD strings (from frontend date pickers), parse as LOCAL date with NO UTC conversion
      const [yearStr, monthStr, dayStr] = date.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1; // month is 0-indexed
      const day = parseInt(dayStr, 10);
      dateObj = new Date(year, month, day, 12, 0, 0, 0); // Noon to avoid DST edge cases
    } else {
      // Fallback for other string formats
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  return format(dateObj, formatStr, { locale: ptBR });
};

// FIXED: Get date string in Brazil timezone (YYYY-MM-DD format) - DEFINITIVE SOLUTION
export const getBrazilDateString = (date?: Date): string => {
  const dateObj = date || getCurrentBrazilDate();
  
  // Use Intl.DateTimeFormat to ensure we get the correct date in São Paulo timezone
  const brazilDateParts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(dateObj);

  const year = brazilDateParts.find(part => part.type === 'year')?.value || '';
  const month = brazilDateParts.find(part => part.type === 'month')?.value || '';
  const day = brazilDateParts.find(part => part.type === 'day')?.value || '';

  return `${year}-${month}-${day}`;
};

// FIXED: Convert date string to proper Date object - DEFINITIVE SOLUTION
export const parseLocalDate = (dateString: string): Date => {
  if (!dateString) {
    // Fallback for safety, though this might indicate a bug elsewhere.
    return new Date();
  }

  // Handles ISO strings from backend (e.g., "2023-10-27T10:00:00.000Z")
  if (dateString.includes('T')) {
    const utcDate = new Date(dateString);
    // Create a new Date object representing the same calendar day in local timezone (at noon to avoid DST issues)
    return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(), 12, 0, 0);
  }

  // Handles "YYYY-MM-DD" strings from date pickers, avoiding timezone issues.
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date in local time at noon to avoid DST and timezone boundary issues.
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  // Fallback for any other format that new Date() might understand.
  return new Date(dateString);
};

export const getMonthKey = (date: Date): string => {
  return format(date, 'yyyy-MM');
};

// FIXED: Generate recurring transactions with proper payment status logic for different contexts
export const generateRecurringTransactions = (
  baseTransaction: Transaction, 
  startDate: Date, 
  endDate: Date,
  currentMonthOnly: boolean = false // New parameter to control payment status logic
): Transaction[] => {
  if (baseTransaction.recurrence === 'none') {
    return [baseTransaction];
  }

  const recurringTransactions: Transaction[] = [];
  let currentDate = parseLocalDate(baseTransaction.date);
  
  // For expenses, use due date if available
  if (baseTransaction.type === 'expense' && baseTransaction.dueDate) {
    currentDate = parseLocalDate(baseTransaction.dueDate);
  }

  // Get current month for comparison
  const currentBrazilDate = getCurrentBrazilDate();
  const currentMonth = getMonthKey(currentBrazilDate);

  // Generate occurrences within the date range
  let occurrenceCount = 0;
  while (currentDate <= endDate) {
    if (currentDate >= startDate) {
      const isFirstOccurrence = occurrenceCount === 0;
      const occurrenceMonth = getMonthKey(currentDate);
      
      // CRITICAL FIX: Payment status logic based on context
      let isPaidStatus: boolean;
      if (baseTransaction.type === 'income') {
        // Income is always paid
        isPaidStatus = true;
      } else {
        // For expenses:
        if (currentMonthOnly) {
          // Dashboard/Reports context: Only first occurrence keeps original payment status
          isPaidStatus = isFirstOccurrence ? baseTransaction.isPaid : false;
        } else {
          // Calendar context: Only current month occurrences can be paid
          if (occurrenceMonth === currentMonth) {
            // Current month: keep original payment status for first occurrence
            isPaidStatus = isFirstOccurrence ? baseTransaction.isPaid : false;
          } else {
            // Future/past months: always unpaid (user needs to mark them manually)
            isPaidStatus = false;
          }
        }
      }
      
      const occurrence: Transaction = {
        ...baseTransaction,
        id: isFirstOccurrence ? baseTransaction.id : `${baseTransaction.id}_${currentDate.getTime()}`,
        date: baseTransaction.type === 'income' ? getBrazilDateString(currentDate) : baseTransaction.date,
        dueDate: baseTransaction.type === 'expense' ? getBrazilDateString(currentDate) : undefined,
        isPaid: isPaidStatus,
      };
      
      recurringTransactions.push(occurrence);
      occurrenceCount++;
    }

    // Calculate next occurrence
    switch (baseTransaction.recurrence) {
      case 'weekly':
        currentDate = addWeeks(currentDate, 1);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;
      case 'yearly':
        currentDate = addYears(currentDate, 1);
        break;
      default:
        break;
    }
  }

  return recurringTransactions;
};

// FIXED: Get all transactions including recurring ones for a specific period
export const getTransactionsWithRecurrence = (
  transactions: Transaction[], 
  startDate: Date, 
  endDate: Date,
  currentMonthOnly: boolean = false // New parameter for context-aware logic
): Transaction[] => {
  const allTransactions: Transaction[] = [];

  transactions.forEach(transaction => {
    if (transaction.recurrence === 'none') {
      // Non-recurring transaction - include if within date range
      const transactionDate = transaction.type === 'income' 
        ? parseLocalDate(transaction.date)
        : transaction.dueDate 
        ? parseLocalDate(transaction.dueDate)
        : parseLocalDate(transaction.date);

      if (isWithinInterval(transactionDate, { start: startDate, end: endDate })) {
        allTransactions.push(transaction);
      }
    } else {
      // FIXED: For recurring transactions, generate all occurrences with proper context
      const recurringTransactions = generateRecurringTransactions(
        transaction, 
        startDate, 
        endDate, 
        currentMonthOnly
      );
      
      // Filter to only include occurrences that fall within the period
      const validOccurrences = recurringTransactions.filter(occurrence => {
        const occurrenceDate = occurrence.type === 'income' 
          ? parseLocalDate(occurrence.date)
          : occurrence.dueDate 
          ? parseLocalDate(occurrence.dueDate)
          : parseLocalDate(occurrence.date);
        
        return isWithinInterval(occurrenceDate, { start: startDate, end: endDate });
      });
      
      allTransactions.push(...validOccurrences);
    }
  });

  return allTransactions;
};

export const filterTransactionsByMonth = (transactions: Transaction[], date: Date): Transaction[] => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  
  // FIXED: Use currentMonthOnly=true for dashboard/reports to maintain proper payment status
  const currentBrazilDate = getCurrentBrazilDate();
  const isCurrentMonth = getMonthKey(date) === getMonthKey(currentBrazilDate);
  
  return getTransactionsWithRecurrence(transactions, start, end, isCurrentMonth);
};

// Calculate actual contributions made to goals in a specific month
export const calculateGoalsImpactForMonth = (savingsGoals: SavingsGoal[], date: Date): number => {
  if (!savingsGoals || savingsGoals.length === 0) return 0;
  
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  
  return savingsGoals.reduce((total, goal) => {
    if (!goal.contributions) return total;
    
    // Sum all contributions made in this specific month
    const monthlyContributions = goal.contributions
      .filter(contribution => {
        const contributionDate = parseLocalDate(contribution.date);
        return isWithinInterval(contributionDate, { start, end });
      })
      .reduce((sum, contribution) => sum + contribution.amount, 0);
    
    return total + monthlyContributions;
  }, 0);
};

// Legacy function for backward compatibility - now uses actual contributions
export const calculateGoalsImpact = (savingsGoals: SavingsGoal[], date: Date): number => {
  return calculateGoalsImpactForMonth(savingsGoals, date);
};

// FIXED: Calculate monthly balance - ALWAYS deduct paid expenses regardless of due date
export const calculateMonthlyBalance = (transactions: Transaction[], date?: Date): number => {
  // If date is provided, get all transactions for that month including recurring ones
  if (date) {
    const monthTransactions = filterTransactionsByMonth(transactions, date);
    return calculateBalanceFromTransactionList(monthTransactions);
  }
  
  // If no date provided, calculate for current month
  const currentDate = getCurrentBrazilDate();
  const monthTransactions = filterTransactionsByMonth(transactions, currentDate);
  return calculateBalanceFromTransactionList(monthTransactions);
};

// FIXED: Helper function to calculate balance from a list of transactions
const calculateBalanceFromTransactionList = (transactions: Transaction[]): number => {
  return transactions.reduce((balance, transaction) => {
    if (transaction.type === 'income') {
      return balance + transaction.amount;
    } else {
      // CRITICAL FIX: For expenses, ALWAYS deduct if paid, regardless of due date
      if (transaction.isPaid) {
        return balance - transaction.amount;
      }
      
      // Don't deduct unpaid expenses from the balance
      return balance;
    }
  }, 0);
};

export const getMonthlyData = (
  transactions: Transaction[], 
  savingsGoals: SavingsGoal[] = [], 
  months: number = 6, 
  endDate: Date = getCurrentBrazilDate() // Parameter is now actually used
): MonthlyData[] => {
  const data: MonthlyData[] = [];
  // Use the provided endDate instead of getting a new current date
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const monthTransactions = filterTransactionsByMonth(transactions, date);
    
    const income = monthTransactions
      .filter(t => t.type === 'income' && t.isPaid)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = monthTransactions
      .filter(t => t.type === 'expense' && t.isPaid)
      .reduce((sum, t) => sum + t.amount, 0);

    const unpaidExpenses = monthTransactions
      .filter(t => t.type === 'expense' && !t.isPaid)
      .reduce((sum, t) => sum + t.amount, 0);

    const goalsImpact = calculateGoalsImpactForMonth(savingsGoals, date);

    data.push({
      month: format(date, 'MMM', { locale: ptBR }),
      income,
      expenses,
      unpaidExpenses,
      balance: income - expenses - goalsImpact,
      goalsImpact,
    });
  }

  return data;
};

export const getCategoryData = (transactions: Transaction[], date: Date = getCurrentBrazilDate()): CategoryData[] => {
  // Get current month transactions with recurrence
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const currentMonthTransactions = getTransactionsWithRecurrence(transactions, start, end, true);
  
  // FIXED: Only consider paid expenses for category analysis
  const expenses = currentMonthTransactions.filter(t => t.type === 'expense' && t.isPaid);
  
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  
  const categoryTotals = expenses.reduce((acc, transaction) => {
    const category = transaction.category;
    acc[category] = (acc[category] || 0) + transaction.amount;
    return acc;
  }, {} as Record<string, number>);

  const colors = [
    '#5E81AC', '#88C0D0', '#A3BE8C', '#EBCB8B', 
    '#D08770', '#BF616A', '#B48EAD', '#8FBCBB'
  ];

  return Object.entries(categoryTotals)
    .map(([category, amount], index) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.amount - a.amount);
};

// FIXED: Check if a transaction is overdue (Brazil timezone) - DEFINITIVE SOLUTION
export const isTransactionOverdue = (transaction: Transaction): boolean => {
  if (!transaction.dueDate || transaction.isPaid || transaction.type !== 'expense') {
    return false;
  }
  
  const today = getCurrentBrazilDate();
  const dueDate = parseLocalDate(transaction.dueDate);
  
  // Set time to start of day for comparison
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  return dueDate < today;
};

// FIXED: Get days until due date (Brazil timezone) - DEFINITIVE SOLUTION
export const getDaysUntilDue = (dueDate: string): number => {
  const today = getCurrentBrazilDate();
  const due = parseLocalDate(dueDate);
  
  // Set time to start of day for comparison
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Export/Import functions
export const exportFinancialData = (transactions: Transaction[], savingsGoals: SavingsGoal[]): string => {
  const data = {
    transactions,
    savingsGoals,
    exportDate: getCurrentBrazilDate().toISOString(),
    version: '1.0'
  };
  return JSON.stringify(data, null, 2);
};

export const validateImportData = (jsonString: string): { transactions: Transaction[], savingsGoals: SavingsGoal[] } | null => {
  try {
    const data = JSON.parse(jsonString);
    
    // Basic validation
    if (!data.transactions || !Array.isArray(data.transactions)) {
      throw new Error('Invalid transactions data');
    }
    
    if (!data.savingsGoals || !Array.isArray(data.savingsGoals)) {
      throw new Error('Invalid savings goals data');
    }
    
    // Validate transaction structure
    for (const transaction of data.transactions) {
      if (!transaction.id || !transaction.type || !transaction.amount || !transaction.description) {
        throw new Error('Invalid transaction structure');
      }
    }
    
    // Validate savings goals structure and migrate old format
    for (const goal of data.savingsGoals) {
      if (!goal.id || !goal.name || typeof goal.targetAmount !== 'number') {
        throw new Error('Invalid savings goal structure');
      }
      
      // Migrate old format to new format with contributions
      if (!goal.contributions) {
        goal.contributions = [];
        // If there's a currentAmount but no contributions, create a single contribution
        if (goal.currentAmount > 0) {
          goal.contributions.push({
            id: generateId(),
            amount: goal.currentAmount,
            date: getBrazilDateString(), // Use current date as fallback
            createdAt: getCurrentBrazilDate().toISOString(),
          });
        }
      }
    }
    
    return {
      transactions: data.transactions,
      savingsGoals: data.savingsGoals
    };
  } catch (error) {
    console.error('Import validation error:', error);
    return null;
  }
};

export const EXPENSE_CATEGORIES = [
  'Moradia',
  'Dívidas',
  'Educação',
  'Serviços',
  'Saúde',
  'Internet',
  'Transporte',
  'Entretenimento',
  'Alimentação',
  'Utilidades',
  'Beleza',
  'Compras',
  'Consumo',
  'Outro'
];

export const INCOME_CATEGORIES = [
  'Salário',
  'Vale',
  'Reembolsos',
  'Aluguéis'
];