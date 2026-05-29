import { addMonths } from 'date-fns';
import { Plus, Minus, X, CreditCard, Calculator, Wallet, Receipt, AlertCircle, Repeat } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { useTheme } from '../contexts/ThemeContext';
import { useCategories } from '../hooks/useCategories';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useCurrencyInput } from '../hooks/useCurrencyInput';
import { SavingsGoal, Transaction, PaymentMethod } from '../types';
import { formatCurrency, getBrazilDateString, parseLocalDate } from '../utils/helpers';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Card } from './ui/Card';
import { Textarea } from './ui/Textarea';
import { cn } from '../lib/utils';

import ImageUpload from './ImageUpload';
import { FallingItems } from './FallingItems';


interface TransactionFormProps {
  type: 'expense' | 'income';
  transaction?: Transaction | null;
  replicateTransaction?: Transaction | null; // New prop for replication
  savingsGoals?: SavingsGoal[];
  submitError?: string | null;
  onSubmit: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void | Promise<void>;
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationCategory, setAnimationCategory] = useState('');
  const [animationMode, setAnimationMode] = useState<'10s' | '15s' | 'zen'>('10s');
  const [repeatMonths, setRepeatMonths] = useState(1);

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      const count = transaction ? 1 : (repeatMonths > 0 ? repeatMonths : 1);
      
      for (let i = 0; i < count; i++) {
        const currentDate = parseLocalDate(finalDate);
        const currentDueDate = finalDueDate ? parseLocalDate(finalDueDate) : null;
        
        const newDate = getBrazilDateString(addMonths(currentDate, i));
        const newDueDate = currentDueDate ? getBrazilDateString(addMonths(currentDueDate, i)) : undefined;

        await onSubmit({
          type,
          amount: amountValue,
          description: formData.description,
          category: formData.category,
          date: newDate,
          dueDate: type === 'expense' ? (newDueDate || undefined) : undefined,
          isPaid: i === 0 ? formData.isPaid : false,
          recurrence: 'none',
          paymentMethod: type === 'expense' ? formData.paymentMethod : undefined,
          notes: formData.notes,
          savingsGoalId: showGoalSelect ? formData.savingsGoalId : undefined,
        });
      }

      // Somente anima se não houver erro de submissão imediato (embora o erro possa vir via prop)
      // Se o pai capturou o erro e setou submitError, o componente vai re-renderizar
      // e podemos checar se submitError mudou, mas o try/catch aqui é mais imediato.
      
      const ninjaGameEnabled = localStorage.getItem('ninjaGameEnabled') === 'true';
      const ninjaGameMode = (localStorage.getItem('ninjaGameMode') as any) || '10s';
      
      if (ninjaGameEnabled) {
        setAnimationCategory(formData.category);
        setAnimationMode(ninjaGameMode);
        setIsAnimating(true);
        
        if (ninjaGameMode === '10s') {
          setTimeout(() => onClose(), 10000);
        } else if (ninjaGameMode === '15s') {
          setTimeout(() => onClose(), 15000);
        }
        // No Zen mode, we don't call onClose automatically
      } else {
        onClose();
      }
    } catch (error) {
      // O erro é tratado no pai e refletido via prop submitError
      console.error('Submit error:', error);
    }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const handleSubtractNumber = () => {
    if (calculatorAmountValue > 0) {
      setCurrentSum(prevSum => prevSum - calculatorAmountValue);
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
      <FallingItems 
        isVisible={isAnimating} 
        category={animationCategory} 
        mode={animationMode}
        onComplete={() => {
          setIsAnimating(false);
          if (animationMode === 'zen') {
            onClose();
          }
        }} 
      />
      
      <Card className={cn(
        "w-full max-w-md p-8 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 transition-all",
        isAnimating && "opacity-0 scale-90"
      )}>
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
            disabled={isAnimating}
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
                disabled={isAnimating}
                required
              />
              <Button
                type="button"
                onClick={() => setShowCalculator(!showCalculator)}
                size="icon"
                className="h-14 w-14 flex-shrink-0 rounded-xl shadow-md"
                title="Abrir Calculadora"
                disabled={isAnimating}
              >
                <Calculator className="w-6 h-6" />
              </Button>
            </div>

            {showCalculator && (
              <Card className="p-5 border-2 border-dashed space-y-4 animate-in slide-in-from-top-2 duration-200" style={{ borderColor: theme.cardBorder }}>
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Calculadora</h4>
                <div className="flex items-center gap-2">
                  <Input
                    {...calculatorInputProps}
                    placeholder="Valor"
                    className="font-bold flex-1"
                    disabled={isAnimating}
                  />
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      onClick={handleAddNumber}
                      size="icon"
                      className="h-12 w-12 flex-shrink-0 bg-primary/20 hover:bg-primary/30 text-primary border-0"
                      title="Adicionar"
                      disabled={isAnimating}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubtractNumber}
                      size="icon"
                      className="h-12 w-12 flex-shrink-0 bg-accent/20 hover:bg-accent/30 text-accent border-0"
                      title="Subtrair"
                      disabled={isAnimating}
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                  </div>
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
                  disabled={isAnimating}
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
            disabled={isAnimating}
            required
          >
            <option value="">Selecione uma categoria</option>
            {categories.map(category => {
              const catName = typeof category === 'string' ? category : (category && (category as any).name) || 'Categoria';
              return (
                <option key={catName} value={catName}>
                  {catName}
                </option>
              );
            })}
          </Select>

          <div className="space-y-2">
            <Input
              label="Descrição"
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Ex: Compras no supermercado"
              disabled={isAnimating}
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
                    disabled={isAnimating}
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
              disabled={isAnimating}
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
              disabled={isAnimating}
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
              disabled={isAnimating}
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
              disabled={isAnimating}
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
                disabled={true}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Textarea
              label="Notas"
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              placeholder="Adicione observações importantes aqui..."
              disabled={isAnimating}
              maxLength={1000}
              className="min-h-[100px] text-sm font-bold"
            />
            <div className="flex justify-end pr-1">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                (formData.notes?.length || 0) >= 1000 ? "text-accent" : "text-muted-foreground opacity-40"
              )}>
                {(formData.notes?.length || 0)}/1000
              </span>
            </div>
          </div>

          {/* Opção de repetir por meses (apenas se for nova transação) */}
          {!transaction && (
            <div className="space-y-4 p-5 rounded-2xl border-2 border-dashed bg-muted/5 border-border animate-in slide-in-from-bottom-2 duration-300">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" />
                Repetir Lançamento
              </label>
              
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={repeatMonths}
                    onChange={(e) => setRepeatMonths(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={isAnimating}
                    className="font-black text-lg"
                  />
                </div>
                <div className="flex-[2] space-y-0.5">
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">
                    {repeatMonths === 1 ? 'Apenas uma vez' : `Por ${repeatMonths} meses`}
                  </p>
                  <p className="text-[10px] text-foreground opacity-40 font-bold uppercase">
                    {repeatMonths === 1 ? 'Lançamento único' : `Criará ${repeatMonths} registros`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Checkbox para "Pago" ou "Recebido" */}
          <div 
            className={cn(
              "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer group",
              formData.isPaid ? 'bg-primary/5 border-primary shadow-sm' : 'bg-card border-border',
              isAnimating && "pointer-events-none"
            )}
            onClick={() => !isAnimating && handleChange({ target: { name: 'isPaid', value: !formData.isPaid, type: 'checkbox', checked: !formData.isPaid } } as any)}
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
              disabled={isAnimating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isAnimating || amountValue === 0 || !formData.description || !formData.category || !!localError}
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
