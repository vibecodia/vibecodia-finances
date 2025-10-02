import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getBrazilDateString } from '../utils/helpers';
import { Plus, X, Calendar, CreditCard, Repeat, AlertCircle, Calculator } from 'lucide-react';
import { addMonths } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';

interface TransactionFormProps {
  type: 'expense' | 'income';
  transaction?: Transaction | null;
  replicateTransaction?: Transaction | null; // New prop for replication
  onSubmit: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ type, transaction, replicateTransaction, onSubmit, onClose }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState<{
    amount: string;
    description: string;
    category: string;
    date: string;
    dueDate: string;
    isPaid: boolean;
    recurrence: Transaction['recurrence'];
    notes: string;
  }>({
    amount: '',
    description: '',
    category: '',
    date: getBrazilDateString(),
    dueDate: '',
    isPaid: type === 'expense' ? false : false, // Receitas e despesas são marcadas como não pagas por padrão
    recurrence: 'none' as Transaction['recurrence'],
    notes: '',
  });

  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorInput, setCalculatorInput] = useState('');
  const [currentSum, setCurrentSum] = useState(0);

  // Populate form when editing
  useEffect(() => {
    if (transaction) {
      setFormData({
        amount: transaction.amount.toString(),
        description: transaction.description,
        category: transaction.category,
        date: getBrazilDateString(new Date(transaction.date)),
        dueDate: transaction.dueDate ? getBrazilDateString(new Date(transaction.dueDate)) : '',
        isPaid: transaction.isPaid,
        recurrence: transaction.recurrence || 'none',
        notes: transaction.notes || ''
      });
    } else if (replicateTransaction) {
      const originalDate = new Date(replicateTransaction.date);
      const nextMonthDate = addMonths(originalDate, 1);
      const nextMonthDateString = getBrazilDateString(nextMonthDate);

      const originalDueDate = replicateTransaction.dueDate ? new Date(replicateTransaction.dueDate) : null;
      const nextMonthDueDateString = originalDueDate ? getBrazilDateString(addMonths(originalDueDate, 1)) : '';

      setFormData({
        amount: replicateTransaction.amount.toString(),
        description: replicateTransaction.description,
        category: replicateTransaction.category,
        date: nextMonthDateString, // Next month's date for replication
        dueDate: nextMonthDueDateString, // Next month's due date for replication
        isPaid: false, // Replicated transactions are initially unpaid
        recurrence: replicateTransaction.recurrence || 'none',
        notes: replicateTransaction.notes || ''
      });
    } else {
      // Reset form for new transaction
      setFormData({
        amount: '',
        description: '',
        category: '',
        date: getBrazilDateString(),
        dueDate: '',
        isPaid: type === 'expense' ? false : false,
        recurrence: 'none',
        notes: '',
      });
      setCurrentSum(0);
      setCalculatorInput('');
    }
  }, [transaction, replicateTransaction, type]);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.description || !formData.category) {
      return;
    }

    let finalDueDate = formData.dueDate;
    if (type === 'expense' && !formData.isPaid && !finalDueDate) {
      finalDueDate = getBrazilDateString();
    }

    // Garante que a data principal seja a data de vencimento para despesas
    const finalDate = type === 'expense' ? (finalDueDate || getBrazilDateString()) : formData.date;

    onSubmit({
      type,
      amount: parseFloat(formData.amount),
      description: formData.description,
      category: formData.category,
      date: finalDate,
      dueDate: finalDueDate || undefined,
      isPaid: formData.isPaid,
      recurrence: formData.recurrence,
      notes: formData.notes,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type: inputType } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: inputType === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleCalculatorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCalculatorInput(e.target.value);
  };

  const handleAddNumber = () => {
    const value = parseFloat(calculatorInput.replace(',', '.')); // Handle comma as decimal separator
    if (!isNaN(value)) {
      setCurrentSum(prevSum => prevSum + value);
      setCalculatorInput('');
    }
  };

  const handleApplyCalculation = () => {
    setFormData(prev => ({ ...prev, amount: currentSum.toFixed(2) }));
    setCurrentSum(0);
    setCalculatorInput('');
    setShowCalculator(false);
  };

  const getRecurrenceDescription = () => {
    switch (formData.recurrence) {
      case 'weekly':
        return 'Esta transação será repetida toda semana automaticamente no calendário';
      case 'monthly':
        return 'Esta transação será repetida todo mês automaticamente no calendário';
      case 'yearly':
        return 'Esta transação será repetida todo ano automaticamente no calendário';
      default:
        return 'Transação única, não será repetida';
    }
  };

  const getRecurrenceWarning = () => {
    if (formData.recurrence !== 'none' && type === 'expense') {
      return 'IMPORTANTE: Apenas a primeira ocorrência manterá o status de pagamento. As próximas sempre serão criadas como pendentes.';
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.cardBackground }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text">
            {transaction ? 'Editar' : 'Nova'} {type === 'expense' ? 'Despesa' : 'Receita'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors hover:bg-cardBorder"
          >
            <X className="w-5 h-5 text-text" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Valor (R$)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0,00"
                className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                required
              />
              <button
                type="button"
                onClick={() => setShowCalculator(!showCalculator)}
                className="p-3 text-white rounded-xl bg-primary hover:bg-secondary transition-colors flex-shrink-0"
                title="Abrir Calculadora"
              >
                <Calculator className="w-5 h-5" />
              </button>
            </div>

            {showCalculator && (
              <div className="mt-4 p-4 rounded-xl border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
                <h4 className="text-md font-semibold text-text mb-3">Calculadora de Soma</h4>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="number"
                    value={calculatorInput}
                    onChange={handleCalculatorInputChange}
                    step="0.01"
                    min="0"
                    placeholder="Adicionar valor"
                    className="w-full px-3 py-2 rounded-lg focus:ring-1 focus:ring-primary focus:border-transparent"
                    style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNumber}
                    className="p-2 text-white rounded-lg bg-primary hover:bg-secondary transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-right text-lg font-bold text-text mb-3">
                  Soma Atual: {currentSum.toFixed(2).replace('.', ',')}
                </div>
                <button
                  type="button"
                  onClick={handleApplyCalculation}
                  className="w-full px-4 py-2 text-white rounded-xl bg-primary hover:bg-secondary transition-colors"
                >
                  Aplicar ao Valor
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Descrição
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Ex: Compras no supermercado"
              className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Categoria
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
              required
            >
              <option value="">Selecione uma categoria</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              <Repeat className="w-4 h-4 inline mr-1" />
              Recorrência
            </label>
            <select
              name="recurrence"
              value={formData.recurrence}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
            >
              <option value="none">Única</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </select>
            <p className="text-xs text-text opacity-70 mt-1">
              {getRecurrenceDescription()}
            </p>
            {getRecurrenceWarning() && (
              <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.cardBorder}` }}>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-text">
                    {getRecurrenceWarning()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Data da transação apenas para receitas */}
          {type === 'income' && (
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Data da Receita
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                required
              />
              {formData.recurrence !== 'none' && (
                <p className="text-xs text-text opacity-70 mt-1">
                  Esta será a data da primeira ocorrência. As próximas serão calculadas automaticamente.
                </p>
              )}
            </div>
          )}

          {/* Para gastos, mostrar data de vencimento */}
          {type === 'expense' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data de Vencimento {!formData.isPaid && <span className="text-accent">*</span>}
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                  required={!formData.isPaid}
                />
                <p className="text-xs text-text opacity-70 mt-1">
                  {formData.isPaid 
                    ? "Para gastos já pagos, a data de vencimento é opcional" 
                    : "Obrigatório para gastos pendentes"}
                  {formData.recurrence !== 'none' && " • Esta será a data do primeiro vencimento"}
                  <br />
                  <span className="text-primary font-medium">
                    ✅ Agora você pode adicionar despesas de qualquer data (passado, presente ou futuro)
                  </span>
                </p>
              </div>
            </>
          )}

          {/* Checkbox para "Pago" ou "Recebido" */}
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: theme.cardBackground }}>
            <input
              type="checkbox"
              id="isPaid"
              name="isPaid"
              checked={formData.isPaid}
              onChange={handleChange}
              className="w-5 h-5 rounded focus:ring-primary text-primary"
            />
            <label htmlFor="isPaid" className="flex items-center gap-2 text-sm font-medium text-text">
              <CreditCard className="w-4 h-4" />
              {type === 'expense' ? 'Já foi pago' : 'Já foi recebido'}
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl transition-colors hover:bg-cardBorder"
              style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-3 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 bg-primary hover:bg-secondary`}
            >
              <Plus className="w-4 h-4" />
              {transaction ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
