import { addMonths } from 'date-fns';
import { Plus, X, CreditCard, Calculator, Wallet, Receipt, AlertCircle } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { useTheme } from '../contexts/ThemeContext';
import { useCategories } from '../hooks/useCategories';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useCurrencyInput } from '../hooks/useCurrencyInput';
import { SavingsGoal, Transaction, PaymentMethod } from '../types';
import { formatCurrency, getBrazilDateString } from '../utils/helpers';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-md p-8 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl text-white shadow-lg", type === 'expense' ? 'bg-accent' : 'bg-primary')}>
              {type === 'expense' ? <Receipt className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
            </div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
              {transaction ? 'Editar' : 'Nova'} {type === 'expense' ? 'Despesa' : 'Receita'}
            </h2>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {(submitError || localError) && (
            <div
              ref={submitErrorRef}
              tabIndex={-1}
              role="alert"
              aria-live="assertive"
              className="rounded-2xl border-2 px-4 py-3 text-xs font-bold uppercase tracking-tight outline-none flex items-center gap-3 animate-in shake duration-300"
              style={{ borderColor: theme.accent, color: theme.accent, backgroundColor: theme.accent + '10' }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {submitError || localError}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <Input
                {...amountInputProps}
                label="Valor (R$)"
                name="amount"
                placeholder="0,00"
                className="text-2xl font-black"
                required
              />
              <Button
                type="button"
                onClick={() => setShowCalculator(!showCalculator)}
                size="icon"
                className="h-14 w-14 flex-shrink-0 rounded-xl shadow-md"
                title="Abrir Calculadora"
              >
                <Calculator className="w-6 h-6" />
              </Button>
            </div>

            {showCalculator && (
              <Card className="p-5 border-2 border-dashed space-y-4 animate-in slide-in-from-top-2 duration-200" style={{ borderColor: theme.cardBorder }}>
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Calculadora</h4>
                <div className="flex items-center gap-3">
                  <Input
                    {...calculatorInputProps}
                    placeholder="Adicionar valor"
                    className="font-bold"
                  />
                  <Button
                    type="button"
                    onClick={handleAddNumber}
                    size="icon"
                    className="h-12 w-12 flex-shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                  <span className="text-[10px] font-black uppercase opacity-40">Soma Atual</span>
                  <span className="text-lg font-black text-primary">{formatCurrency(currentSum)}</span>
                </div>
                <Button
                  type="button"
                  onClick={handleApplyCalculation}
                  variant="outline"
                  className="w-full text-xs font-black uppercase"
                >
                  Aplicar ao Valor
                </Button>
              </Card>
            )}
          </div>

          <Select
            label="Categoria"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Selecione uma categoria</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>

          <div className="space-y-2">
            <Input
              label="Descrição"
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Ex: Compras no supermercado"
              required
            />
            {type === 'income' && formData.category === 'Rendimentos' && (
              <div className="flex flex-wrap gap-2 pt-1">
                {["Rendimentos simples", "Rendimento semanal cofrinhos", "Rendimento quinzenal cofrinhos", "Rendimento mensal cofrinhos"].map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, description: suggestion }))}
                    variant="ghost"
                    size="sm"
                    className="px-3 py-1.5 rounded-full text-[10px] uppercase font-black border border-border"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {showGoalSelect && (
            <Select
              label="Meta para o aporte"
              name="savingsGoalId"
              value={formData.savingsGoalId}
              onChange={handleChange}
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
            </Select>
          )}

          {type === 'expense' && (
            <Select
              label="Meio de Pagamento"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              required
            >
              <option value="">Selecione um meio de pagamento</option>
              {paymentMethods.map(method => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          )}

          {type === 'income' && (
            <Input
              label="Data da Receita"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          )}

          {type === 'expense' && (
            <Input
              label="Data de Vencimento"
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              required={!formData.isPaid}
            />
          )}

          {type === 'expense' && (
            <div className="space-y-3">
              <label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Capturar via QR Code
              </label>
              <ImageUpload 
                onReceiptDetected={handleReceiptDetected}
                onUploadError={(error) => console.error(error)}
              />
            </div>
          )}

          {/* Checkbox para "Pago" ou "Recebido" */}
          <div 
            className={cn(
              "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer group",
              formData.isPaid ? 'bg-primary/5 border-primary shadow-sm' : 'bg-card border-border'
            )}
            onClick={() => handleChange({ target: { name: 'isPaid', value: !formData.isPaid, type: 'checkbox', checked: !formData.isPaid } } as any)}
          >
            <div className={cn(
              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
              formData.isPaid ? 'bg-primary border-primary' : 'bg-transparent border-border group-hover:border-primary'
            )}>
              {formData.isPaid && <Plus className="w-4 h-4 text-white rotate-45" style={{ transform: 'rotate(0deg)' }} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-foreground uppercase tracking-tight">
                {type === 'expense' ? 'Já foi pago' : 'Já foi recebido'}
              </p>
              <p className="text-[10px] text-foreground opacity-40 font-bold uppercase">Marcar como concluído</p>
            </div>
            <CreditCard className={cn("w-6 h-6 transition-colors", formData.isPaid ? 'text-primary' : 'text-foreground opacity-20')} />
          </div>

          <div className="flex gap-4 pt-6 border-t border-border">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={amountValue === 0 || !formData.description || !formData.category || !!localError}
              className="flex-1"
            >
              {transaction ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default TransactionForm;
