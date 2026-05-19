import { TrendingUp, DollarSign, Check, Repeat, Tag, Calendar as CalendarIcon, Info, CreditCard, Wallet } from 'lucide-react';
import React from 'react';

import { useTheme } from '../contexts/ThemeContext';
import { Transaction } from '../types';
import { formatCurrency, formatBrazilDate, parseLocalDate, formatPaymentMethod } from '../utils/helpers';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ transaction, isOpen, onClose }) => {
  const { theme } = useTheme();
  if (!transaction) {
    return null;
  }

  const isExpense = transaction.type === 'expense';
  const isIncome = transaction.type === 'income';
  const isPaid = transaction.isPaid;
  const isRecurring = transaction.recurrence !== 'none';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-6 rounded-lg shadow-lg" style={{ backgroundColor: theme.cardBackground }}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            {isIncome ? (
              <TrendingUp className="w-6 h-6 text-primary" />
            ) : isPaid ? (
              <Check className="w-6 h-6 text-primary" />
            ) : (
              <DollarSign className="w-6 h-6 text-accent" />
            )}
            {transaction.description}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Detalhes da transação.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Valor:</span>
            <span className={`font-bold text-xl ${isIncome ? 'text-primary' : 'text-accent'}`}>
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium flex items-center gap-1 text-foreground"><Tag className="w-4 h-4" /> Categoria:</span>
            <span className="text-foreground">{transaction.category}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium flex items-center gap-1 text-foreground"><CalendarIcon className="w-4 h-4" /> Data:</span>
            <span className="text-foreground">{formatBrazilDate(parseLocalDate(transaction.date))}</span>
          </div>
          {isExpense && transaction.dueDate && (
            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-1 text-foreground"><CreditCard className="w-4 h-4" /> Vencimento:</span>
              <span className="text-foreground">{formatBrazilDate(parseLocalDate(transaction.dueDate))}</span>
            </div>
          )}
          {isExpense && transaction.paymentMethod && (
            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-1 text-foreground"><Wallet className="w-4 h-4" /> Pagamento:</span>
              <span className="text-foreground">{formatPaymentMethod(transaction.paymentMethod)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-medium flex items-center gap-1 text-foreground"><Info className="w-4 h-4" /> Status:</span>
            <span className={`font-medium ${isPaid ? 'text-primary' : 'text-accent'}`}>
              {isPaid ? (isIncome ? 'Recebido' : 'Pago') : (isIncome ? 'A Receber' : 'Pendente')}
            </span>
          </div>
          {isRecurring && (
            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-1 text-foreground"><Repeat className="w-4 h-4" /> Recorrência:</span>
              <span className="text-foreground capitalize">{transaction.recurrence}</span>
            </div>
          )}
          {transaction.notes && (
            <div>
              <span className="font-medium flex items-center gap-1 mb-1 text-foreground"><Info className="w-4 h-4" /> Observações:</span>
              <p className="p-3 rounded-md whitespace-pre-wrap" style={{ backgroundColor: theme.cardBorder, color: theme.text }}>{transaction.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDetailModal;
