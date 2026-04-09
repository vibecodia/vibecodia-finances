import { addMonths } from 'date-fns';
import { Plus, X, Calendar, CreditCard, Calculator, Wallet, Receipt, AlertCircle } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { useTheme } from '../contexts/ThemeContext';
import { useCategories } from '../hooks/useCategories';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useCurrencyInput } from '../hooks/useCurrencyInput';
import { SavingsGoal, Transaction, PaymentMethod } from '../types';
import { formatCurrency, getBrazilDateString } from '../utils/helpers';


import ImageUpload from './ImageUpload';


interface TransactionFormProps {
  type: 'expense' | 'income';
  transaction?: Transaction | null;
  replicateTransaction?: Transaction | null; // New prop for replication
  savingsGoals?: SavingsGoal[];
  submitError?: string | null;
  onSubmit: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ type, transaction, replicateTransaction, savingsGoals = [], submitError, onSubmit, onClose }) => {
  const { theme } = useTheme();
  const { expenseCategories, incomeCategories } = useCategories();
  const { paymentMethods } = usePaymentMethods();
  
  const defaultPaymentMethod = paymentMethods.includes('PIX') ? 'PIX' : (paymentMethods[0] || '');
  const submitErrorRef = useRef<HTMLDivElement | null>(null);

  const [formData, setFormData] = useState<{
    description: string;
    category: string;
    savingsGoalId: string;
    date: string;
    dueDate: string;
    isPaid: boolean;
    recurrence: Transaction['recurrence'];
    paymentMethod: PaymentMethod;
    notes: any;
  }>({
    description: '',
    category: '',
    savingsGoalId: '',
    date: getBrazilDateString(),
    dueDate: getBrazilDateString(),
    isPaid: type === 'expense' ? false : false, // Receitas e despesas são marcadas como não pagas por padrão
    recurrence: 'none' as Transaction['recurrence'],
    paymentMethod: defaultPaymentMethod,
    notes: '',
  });

  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorInput, setCalculatorInput] = useState(0);
  const [currentSum, setCurrentSum] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const [initialAmount, setInitialAmount] = useState<number>(transaction?.amount ?? replicateTransaction?.amount ?? 0);
  const { inputProps: amountInputProps, numericValue: amountValue, setNumericValue: setAmountValue } = useCurrencyInput(
    initialAmount
  );

  const { inputProps: calculatorInputProps, numericValue: calculatorAmountValue, setNumericValue: setCalculatorValue } = useCurrencyInput(
    calculatorInput
  );

  useEffect(() => {
    if (!submitError) return;
    window.setTimeout(() => {
      submitErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      submitErrorRef.current?.focus({ preventScroll: true });
    }, 0);
  }, [submitError]);

  // Populate form when editing
  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description,
        category: transaction.category,
        savingsGoalId: transaction.savingsGoalId || '',
        date: getBrazilDateString(new Date(transaction.date)),
        dueDate: transaction.dueDate ? getBrazilDateString(new Date(transaction.dueDate)) : '',
        isPaid: transaction.isPaid,
        recurrence: transaction.recurrence || 'none',
        paymentMethod: transaction.paymentMethod || defaultPaymentMethod,
        notes: transaction.notes || '',
      });
      setInitialAmount(transaction.amount);
    } else if (replicateTransaction) {
      const isSimulated = replicateTransaction.id === 'simulated';
      const originalDate = new Date(replicateTransaction.date);
      const nextMonthDate = isSimulated ? originalDate : addMonths(originalDate, 1);
      const nextMonthDateString = getBrazilDateString(nextMonthDate);

      const originalDueDate = replicateTransaction.dueDate ? new Date(replicateTransaction.dueDate) : null;
      const nextMonthDueDateString = originalDueDate 
        ? getBrazilDateString(isSimulated ? originalDueDate : addMonths(originalDueDate, 1)) 
        : '';

      setFormData({
        description: replicateTransaction.description,
        category: replicateTransaction.category,
        savingsGoalId: replicateTransaction.savingsGoalId || '',
        date: nextMonthDateString, 
        dueDate: nextMonthDueDateString, 
        isPaid: isSimulated ? replicateTransaction.isPaid : false, 
        recurrence: replicateTransaction.recurrence || 'none',
        paymentMethod: replicateTransaction.paymentMethod || defaultPaymentMethod,
        notes: replicateTransaction.notes || '',
      });
      setInitialAmount(replicateTransaction.amount);
    } else {
      // Reset form for new transaction
      setFormData({
        description: '',
        category: '',
        savingsGoalId: '',
        date: getBrazilDateString(),
        dueDate: getBrazilDateString(),
        isPaid: type === 'expense' ? false : false,
        recurrence: 'none',
        paymentMethod: defaultPaymentMethod,
        notes: '',
      });
      setInitialAmount(0);
      setCurrentSum(0);
      setCalculatorInput(0);
    }
  }, [transaction, replicateTransaction, type, defaultPaymentMethod]);

  useEffect(() => {
    if (formData.category === 'Aporte' && formData.savingsGoalId && amountValue > 0) {
      const goal = savingsGoals.find(g => (g.id || g._id) === formData.savingsGoalId);
      if (goal) {
        const remaining = goal.targetAmount - goal.currentAmount;
        if (amountValue > remaining + 0.01) { // Small buffer for rounding
          setLocalError(`Valor do aporte ultrapassa o restante da meta. Restante disponível: ${remaining.toFixed(2)}.`);
        } else {
          setLocalError(null);
        }
      }
    } else {
      setLocalError(null);
    }
  }, [amountValue, formData.category, formData.savingsGoalId, savingsGoals]);

  const categories = type === 'expense' ? expenseCategories : incomeCategories;
  const showGoalSelect = type === 'expense' && formData.category === 'Aporte';
  const activeGoals = savingsGoals
    .filter(g => (g.status || 'active') !== 'deleted')
    .filter(g => (g.currentAmount || 0) < (g.targetAmount || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (amountValue === 0 || !formData.description || !formData.category || localError) {
      return;
    }
    if (showGoalSelect && !formData.savingsGoalId) {
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
      amount: amountValue,
      description: formData.description,
      category: formData.category,
      date: finalDate,
      dueDate: type === 'expense' ? (finalDueDate || undefined) : undefined,
      isPaid: formData.isPaid,
      recurrence: formData.recurrence,
      paymentMethod: type === 'expense' ? formData.paymentMethod : undefined,
      notes: formData.notes,
      savingsGoalId: showGoalSelect ? formData.savingsGoalId : undefined,
    });
  };

  const handleReceiptDetected = (data: { description: string; amount: number; date: string; category?: string; notes?: string }) => {
    setFormData(prev => ({
      ...prev,
      description: data.description || prev.description,
      dueDate: data.date || prev.dueDate,
      date: data.date || prev.date,
      category: data.category || prev.category,
      notes: data.notes || prev.notes,
      // Se detectou recibo, geralmente é porque já foi pago (Mercado, Posto, etc)
      isPaid: true
    }));
    
    // Atualiza o valor numérico diretamente no hook para garantir a população
    const amount = Number(data.amount) || 0;
    setAmountValue(amount);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type: inputType } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: inputType === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      ...(name === 'category' && value !== 'Aporte' ? { savingsGoalId: '' } : {}),
    }));
  };

  const handleAddNumber = () => {
    if (calculatorAmountValue > 0) {
      setCurrentSum(prevSum => prevSum + calculatorAmountValue);
      setCalculatorValue(0);
    }
  };

  const handleApplyCalculation = () => {
    setAmountValue(currentSum);
    setCurrentSum(0);
    setCalculatorValue(0);
    setShowCalculator(false);
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
          {(submitError || localError) && (
            <div
              ref={submitErrorRef}
              tabIndex={-1}
              role="alert"
              aria-live="assertive"
              className="rounded-xl border px-4 py-3 text-sm font-medium outline-none flex items-center gap-2"
              style={{ borderColor: theme.accent, color: theme.text, backgroundColor: theme.accent + '10' }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {submitError || localError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Valor (R$)
            </label>
            <div className="flex items-center gap-2">
              <input
                {...amountInputProps}
                name="amount"
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
                    {...calculatorInputProps}
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
            {type === 'income' && formData.category === 'Rendimentos' && (
              <div className="flex flex-wrap gap-2 mt-2">
                {["Rendimentos simples", "Rendimento semanal cofrinhos", "Rendimento quinzenal cofrinhos", "Rendimento mensal cofrinhos"].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, description: suggestion }))}
                    className="px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors border"
                    style={{ 
                      backgroundColor: theme.cardBackground, 
                      color: theme.text, 
                      borderColor: theme.cardBorder
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.cardBorder;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.cardBackground;
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {showGoalSelect && (
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Meta para o aporte
              </label>
              <select
                name="savingsGoalId"
                value={formData.savingsGoalId}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                required
              >
                <option value="">Selecione uma meta</option>
                {activeGoals.map(goal => {
                  const id = goal.id || goal._id || '';
                  return (
                    <option key={id} value={id}>
                      {goal.name}: {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {type === 'expense' && (
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                <Wallet className="w-4 h-4 inline mr-1" />
                Meio de Pagamento
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                required
              >
                <option value="">Selecione um meio de pagamento</option>
                {paymentMethods.map(method => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {type === 'expense' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data de Vencimento
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
              </div>
            </>
          )}

          {type === 'expense' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text mb-1">
                <Receipt className="w-4 h-4 inline mr-1" />
                Capturar via QR Code
              </label>
              <ImageUpload 
                onReceiptDetected={handleReceiptDetected}
                onUploadError={(error) => console.error(error)}
              />
            </div>
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
