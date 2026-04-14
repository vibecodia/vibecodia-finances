import { 
  Settings as SettingsIcon, 
  Download, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  PlusCircle, 
  Tag, 
  Info, 
  Layers, 
  X, 
  Wallet, 
   Gamepad,
   Pencil,
   CreditCard,
   Scissors,
   Check,
   Eye,
   EyeOff
 } from 'lucide-react';
import React, { useState } from 'react';

import { useTheme } from '../contexts/ThemeContext';
import { useCategories } from '../hooks/useCategories';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useLocalStorage } from '../hooks/trello/useLocalStorage';
import { useCurrencyInput } from '../hooks/useCurrencyInput';
import { Transaction, SavingsGoal } from '../types';
import { exportFinancialData, validateImportData, getCurrentBrazilDate, formatBrazilDate } from '../utils/helpers';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Textarea } from './ui/Textarea';
import { cn } from '../lib/utils';

interface SettingsProps {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  onImportData: (transactions: Transaction[], savingsGoals: SavingsGoal[]) => void;
  onClearAllData: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  transactions, 
  savingsGoals, 
  onImportData, 
  onClearAllData 
}) => {
  const { theme } = useTheme();
  const { expenseCategories, incomeCategories, addCategory, removeCategory, resetToDefaults: resetCategoriesToDefaults } = useCategories();
  const { paymentMethods, addPaymentMethod, removePaymentMethod, resetToDefaults: resetPaymentMethodsToDefaults } = usePaymentMethods();
  
  // Dashboard Editable Info
  const [cardHolderName, setCardHolderName] = useLocalStorage('dashboard_card_holder_name', 'Carvalho de Oliveira Neto');
  const [flashFlexAmount, setFlashFlexAmount] = useLocalStorage('dashboard_flash_flex_amount', 0);
  const [isFlashSplit, setIsFlashSplit] = useLocalStorage('dashboard_flash_is_split', false);
  const [showBalance, setShowBalance] = useLocalStorage('dashboard_show_balance', true);
  const [includeBenefits, setIncludeBenefits] = useLocalStorage('dashboard_include_benefits', true);

  const { inputProps: flexAmountProps, numericValue: flexAmountValue, setNumericValue: setFlexAmountValue } = useCurrencyInput(flashFlexAmount);
  const [tempName, setTempName] = useState(cardHolderName);

  const [importText, setImportText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [categoryMessage, setCategoryMessage] = useState({ text: '', type: 'idle' as 'idle' | 'success' | 'error' });

  // Payment Method State
  const [newPaymentMethodName, setNewPaymentMethodName] = useState('');
  const [paymentMethodMessage, setPaymentMethodMessage] = useState({ text: '', type: 'idle' as 'idle' | 'success' | 'error' });

  // Ninja Game State
  const [ninjaGameEnabled, setNinjaGameEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('ninjaGameEnabled');
    return saved === 'true'; // Default to false
  });

  const [uiNinjaEnabled, setUiNinjaEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('uiNinjaEnabled');
    return saved === 'true'; // Default to false
  });

  const [ninjaGameMode, setNinjaGameMode] = useState<'10s' | '15s' | 'zen'>(() => {
    const saved = localStorage.getItem('ninjaGameMode');
    return (saved as any) || '10s'; // Default to 10s
  });

  const handleToggleNinjaGame = () => {
    const newValue = !ninjaGameEnabled;
    setNinjaGameEnabled(newValue);
    localStorage.setItem('ninjaGameEnabled', String(newValue));
  };

  const handleToggleUiNinja = () => {
    const newValue = !uiNinjaEnabled;
    setUiNinjaEnabled(newValue);
    localStorage.setItem('uiNinjaEnabled', String(newValue));
  };

  const handleSetNinjaGameMode = (mode: '10s' | '15s' | 'zen') => {
    setNinjaGameMode(mode);
    localStorage.setItem('ninjaGameMode', mode);
  };

  // New Confirmation States
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [showAddPaymentMethodModal, setShowAddPaymentMethodModal] = useState(false);
  const [showDeletePaymentMethodModal, setShowDeletePaymentMethodModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [errorTimer, setErrorTimer] = useState(0);
  const [pendingCategory, setPendingCategory] = useState<{ type: 'expense' | 'income', name: string } | null>(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<string | null>(null);

  // Timer Effect for Error Modal
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showErrorModal && errorTimer > 0) {
      interval = setInterval(() => {
        setErrorTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showErrorModal, errorTimer]);

  const handleExport = () => {
    const exportData = exportFinancialData(transactions, savingsGoals);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financeiro-backup-${formatBrazilDate(getCurrentBrazilDate(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!importText.trim()) {
      setImportStatus('error');
      setImportMessage('Por favor, cole os dados JSON para importar.');
      return;
    }

    const validatedData = validateImportData(importText);
    
    if (!validatedData) {
      setImportStatus('error');
      setImportMessage('Dados inválidos. Verifique se o arquivo JSON está correto.');
      return;
    }

    onImportData(validatedData.transactions, validatedData.savingsGoals);
    setImportStatus('success');
    setImportMessage(`Importação realizada com sucesso! ${validatedData.transactions.length} transações e ${validatedData.savingsGoals.length} metas importadas.`);
    
    setTimeout(() => {
      setShowImportModal(false);
      setImportText('');
      setImportStatus('idle');
      setImportMessage('');
    }, 2000);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportText(content);
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    onClearAllData();
    setShowClearModal(false);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      setPendingCategory({ type: categoryType, name: newCategoryName.trim() });
      setShowAddCategoryModal(true);
    }
  };

  const confirmAddCategory = () => {
    if (pendingCategory) {
      if (addCategory(pendingCategory.type, pendingCategory.name)) {
        setNewCategoryName('');
      }
      setShowAddCategoryModal(false);
      setPendingCategory(null);
    }
  };

  const handleRemoveCategory = (type: 'expense' | 'income', cat: string) => {
    setPendingCategory({ type, name: cat });
    setShowDeleteCategoryModal(true);
  };

  const confirmRemoveCategory = () => {
    if (pendingCategory) {
      const result = removeCategory(pendingCategory.type, pendingCategory.name, transactions);
      if (!result.success) {
        setErrorModalMessage(result.message || 'Erro ao excluir categoria.');
        setErrorTimer(5); // 5 seconds
        setShowErrorModal(true);
      } else {
        setCategoryMessage({ text: `Categoria "${pendingCategory.name}" removida com sucesso.`, type: 'success' });
        setTimeout(() => setCategoryMessage({ text: '', type: 'idle' }), 2000);
      }
      setShowDeleteCategoryModal(false);
      setPendingCategory(null);
    }
  };

  const handleResetCategories = () => {
    const result = resetCategoriesToDefaults(categoryType, transactions);
    setCategoryMessage({ 
      text: `Padrões restaurados! ${result.restored} categorias base carregadas. ${result.preserved > 0 ? `${result.preserved} categorias em uso foram preservadas.` : ''}`, 
      type: 'success' 
    });
    setTimeout(() => setCategoryMessage({ text: '', type: 'idle' }), 4000);
  };

  // Payment Method Handlers
  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPaymentMethodName.trim()) {
      setPendingPaymentMethod(newPaymentMethodName.trim());
      setShowAddPaymentMethodModal(true);
    }
  };

  const confirmAddPaymentMethod = () => {
    if (pendingPaymentMethod) {
      if (addPaymentMethod(pendingPaymentMethod)) {
        setNewPaymentMethodName('');
      }
      setShowAddPaymentMethodModal(false);
      setPendingPaymentMethod(null);
    }
  };

  const handleRemovePaymentMethod = (method: string) => {
    setPendingPaymentMethod(method);
    setShowDeletePaymentMethodModal(true);
  };

  const confirmRemovePaymentMethod = () => {
    if (pendingPaymentMethod) {
      const result = removePaymentMethod(pendingPaymentMethod, transactions);
      if (!result.success) {
        setErrorModalMessage(result.message || 'Erro ao excluir meio de pagamento.');
        setErrorTimer(5); // 5 seconds
        setShowErrorModal(true);
      } else {
        setPaymentMethodMessage({ text: `Meio de pagamento "${pendingPaymentMethod}" removido com sucesso.`, type: 'success' });
        setTimeout(() => setPaymentMethodMessage({ text: '', type: 'idle' }), 2000);
      }
      setShowDeletePaymentMethodModal(false);
      setPendingPaymentMethod(null);
    }
  };

  const handleResetPaymentMethods = () => {
    const result = resetPaymentMethodsToDefaults(transactions);
    setPaymentMethodMessage({ 
      text: `Padrões restaurados! ${result.restored} meios de pagamento carregados. ${result.preserved > 0 ? `${result.preserved} meios em uso foram preservados.` : ''}`, 
      type: 'success' 
    });
    setTimeout(() => setPaymentMethodMessage({ text: '', type: 'idle' }), 4000);
  };

  const totalTransactions = transactions.length;
  const totalGoals = savingsGoals.length;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 border-b" style={{ borderColor: theme.cardBorder }}>
        <div>
          <h1 className="text-3xl lg:text-5xl font-black text-foreground mb-2 tracking-tight">
            Configurações
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Personalize sua experiência e gerencie seus dados locais
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-primary/10 border-2 border-primary/20 animate-pulse hidden md:block">
          <SettingsIcon className="w-8 h-8 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Categories Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary text-white shadow-lg">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground uppercase tracking-wider">
                    Categorias
                  </h2>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Gerencie suas classificações</p>
                </div>
              </div>
              <Button 
                onClick={handleResetCategories}
                variant="outline"
                size="sm"
                className="text-[10px] uppercase"
                title="Restaurar categorias padrão"
              >
                Resetar Padrão
              </Button>
            </div>

            {categoryMessage.type !== 'idle' && (
              <div className={cn(
                "mb-6 p-4 rounded-2xl border-2 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300",
                categoryMessage.type === 'success' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-accent/10 border-accent/20 text-accent'
              )}>
                {categoryMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                <p className="text-xs font-bold uppercase tracking-tight">{categoryMessage.text}</p>
              </div>
            )}

            <form onSubmit={handleAddCategory} className="space-y-4 mb-8">
              <div className="flex gap-2 p-1 border-2 rounded-2xl" style={{ borderColor: theme.cardBorder }}>
                <Button
                  type="button"
                  onClick={() => setCategoryType('expense')}
                  variant={categoryType === 'expense' ? 'accent' : 'ghost'}
                  size="sm"
                  className="flex-1 text-[10px]"
                >
                  DESPESAS
                </Button>
                <Button
                  type="button"
                  onClick={() => setCategoryType('income')}
                  variant={categoryType === 'income' ? 'primary' : 'ghost'}
                  size="sm"
                  className="flex-1 text-[10px]"
                >
                  RECEITAS
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={`Nova categoria de ${categoryType === 'expense' ? 'despesa' : 'receita'}...`}
                />
                <Button
                  type="submit"
                  disabled={!newCategoryName.trim()}
                  size="icon"
                >
                  <PlusCircle className="w-6 h-6" />
                </Button>
              </div>
            </form>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                  Categorias de Despesas ({expenseCategories.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {expenseCategories.map((cat) => (
                    <div 
                      key={cat} 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 font-bold text-xs group hover:border-accent transition-all shadow-sm"
                      style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBackground }}
                    >
                      <span style={{ color: theme.text }}>{cat}</span>
                      <button 
                        onClick={() => handleRemoveCategory('expense', cat)}
                        className="opacity-0 group-hover:opacity-100 text-accent hover:scale-125 transition-all"
                      >

                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  Categorias de Receitas ({incomeCategories.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {incomeCategories.map((cat) => (
                    <div 
                      key={cat} 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 font-bold text-xs group hover:border-primary transition-all shadow-sm"
                      style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBackground }}
                    >
                      <span style={{ color: theme.text }}>{cat}</span>
                      <button 
                        onClick={() => handleRemoveCategory('income', cat)}
                        className="opacity-0 group-hover:opacity-100 text-accent hover:scale-125 transition-all"
                      >

                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Payment Methods Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary text-white shadow-lg">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground uppercase tracking-wider">
                    Pagamento
                  </h2>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Meios de Pagamento</p>
                </div>
              </div>
              <Button 
                onClick={handleResetPaymentMethods}
                variant="outline"
                size="sm"
                className="text-[10px] uppercase"
                title="Restaurar meios de pagamento padrão"
              >
                Resetar Padrão
              </Button>
            </div>

            {paymentMethodMessage.type !== 'idle' && (
              <div className={cn(
                "mb-6 p-4 rounded-2xl border-2 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300",
                paymentMethodMessage.type === 'success' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-accent/10 border-accent/20 text-accent'
              )}>
                {paymentMethodMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                <p className="text-xs font-bold uppercase tracking-tight">{paymentMethodMessage.text}</p>
              </div>
            )}

            <form onSubmit={handleAddPaymentMethod} className="space-y-4 mb-8">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newPaymentMethodName}
                  onChange={(e) => setNewPaymentMethodName(e.target.value)}
                  placeholder="Novo meio de pagamento (ex: Inter)..."
                />
                <Button
                  type="submit"
                  disabled={!newPaymentMethodName.trim()}
                  size="icon"
                >
                  <PlusCircle className="w-6 h-6" />
                </Button>
              </div>
            </form>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  Meios Disponíveis ({paymentMethods.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map((method) => (
                    <div 
                      key={method} 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 font-bold text-xs group hover:border-primary transition-all shadow-sm"
                      style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBackground }}
                    >
                      <span style={{ color: theme.text }}>{method}</span>
                      <button 
                        onClick={() => handleRemovePaymentMethod(method)}
                        className="opacity-0 group-hover:opacity-100 text-accent hover:scale-125 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Dashboard Info Section */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-primary text-white shadow-lg">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-wider">
                  Dashboard
                </h2>
                <p className="text-xs text-muted-foreground font-bold uppercase">Personalização Visual</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Visibility & Benefits Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                    showBalance ? 'bg-primary/5 border-primary shadow-sm' : 'bg-card border-border'
                  )}
                  onClick={() => setShowBalance(!showBalance)}
                >
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-foreground uppercase tracking-tight">
                      Mostrar Saldo
                    </p>
                    <p className="text-[8px] text-foreground opacity-40 font-bold uppercase">Privacidade no Dashboard</p>
                  </div>
                  {showBalance ? <Eye className="w-5 h-5 text-primary" /> : <EyeOff className="w-5 h-5 opacity-40" />}
                </div>

                <div 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                    includeBenefits ? 'bg-primary/5 border-primary shadow-sm' : 'bg-card border-border'
                  )}
                  onClick={() => setIncludeBenefits(!includeBenefits)}
                >
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-foreground uppercase tracking-tight">
                      Incluir Benefícios
                    </p>
                    <p className="text-[8px] text-foreground opacity-40 font-bold uppercase">Somar Flash/Vero no total</p>
                  </div>
                  <Wallet className={cn("w-5 h-5 transition-colors", includeBenefits ? 'text-primary' : 'opacity-40')} />
                </div>
              </div>

              <div className="h-px bg-muted my-2"></div>

              {/* Card Holder Name */}
              <div className="space-y-2">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Titular do Cartão
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Nome no cartão..."
                  />
                  <Button
                    onClick={() => setCardHolderName(tempName)}
                    size="icon"
                    disabled={tempName === cardHolderName}
                    title="Salvar Nome"
                  >
                    <Check className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="h-px bg-muted my-4"></div>

              {/* Flash Split */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Scissors className="w-4 h-4" />
                    Split Flash (Flex)
                  </label>
                  <div 
                    className={cn(
                      "w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out relative cursor-pointer",
                      isFlashSplit ? 'bg-primary' : 'bg-muted'
                    )}
                    onClick={() => setIsFlashSplit(!isFlashSplit)}
                  >
                    <div className={cn(
                      "w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out",
                      isFlashSplit ? 'translate-x-6' : 'translate-x-0'
                    )} />
                  </div>
                </div>

                {isFlashSplit && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex gap-2">
                      <Input
                        {...flexAmountProps}
                        label="Saldo Flex (R$)"
                        className="font-bold"
                      />
                      <Button
                        onClick={() => setFlashFlexAmount(flexAmountValue)}
                        size="icon"
                        className="mt-auto h-12 w-12"
                        disabled={flexAmountValue === flashFlexAmount}
                        title="Salvar Saldo Flex"
                      >
                        <Check className="w-5 h-5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold italic ml-1">
                      * Este valor será reservado do saldo total Flash para gastos Flex.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Ninja Game Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-primary text-white shadow-lg">
                <Gamepad className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-wider">
                  Experiência
                </h2>
                <p className="text-xs text-muted-foreground font-bold uppercase">Gamificação</p>
              </div>
            </div>

            <div 
              className={cn(
                "flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer group mb-4",
                ninjaGameEnabled ? 'bg-primary/5 border-primary shadow-sm' : 'bg-card border-border'
              )}
              onClick={handleToggleNinjaGame}
            >
              <div className="flex-1">
                <p className="text-sm font-black text-foreground uppercase tracking-tight">
                  Ninja das Transações
                </p>
                <p className="text-[10px] text-foreground opacity-40 font-bold uppercase">Chuva de emojis ao salvar</p>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out relative",
                ninjaGameEnabled ? 'bg-primary' : 'bg-muted'
              )}>
                <div className={cn(
                  "w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out",
                  ninjaGameEnabled ? 'translate-x-6' : 'translate-x-0'
                )} />
              </div>
            </div>

            <div 
              className={cn(
                "flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer group",
                uiNinjaEnabled ? 'bg-primary/5 border-primary shadow-sm' : 'bg-card border-border'
              )}
              onClick={handleToggleUiNinja}
            >
              <div className="flex-1">
                <p className="text-sm font-black text-foreground uppercase tracking-tight">
                  UI Ninja (Dashboard)
                </p>
                <p className="text-[10px] text-foreground opacity-40 font-bold uppercase">Cortar elementos da tela inicial</p>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out relative",
                uiNinjaEnabled ? 'bg-primary' : 'bg-muted'
              )}>
                <div className={cn(
                  "w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out",
                  uiNinjaEnabled ? 'translate-x-6' : 'translate-x-0'
                )} />
              </div>
            </div>

            {ninjaGameEnabled && (
              <div className="mt-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">Duração do Jogo</p>
                <div className="flex gap-2 p-1 border-2 rounded-2xl" style={{ borderColor: theme.cardBorder }}>
                  {(['10s', '15s', 'zen'] as const).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      onClick={() => handleSetNinjaGameMode(mode)}
                      variant={ninjaGameMode === mode ? 'primary' : 'ghost'}
                      size="sm"
                      className={cn(
                        "flex-1 text-[10px] font-black uppercase tracking-widest",
                        ninjaGameMode === mode && "shadow-lg"
                      )}
                    >
                      {mode === 'zen' ? 'Modo Zen' : mode}
                    </Button>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground font-bold italic ml-1">
                  {ninjaGameMode === 'zen' 
                    ? '* O jogo só termina quando você clicar no botão de fechar.' 
                    : `* O jogo dura exatamente ${ninjaGameMode}.`}
                </p>
              </div>
            )}
          </Card>

          {/* Data Management Section */}
          <Card className="p-6 relative overflow-hidden">
            {/* Disabled Overlay */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
              <Card variant="default" className="p-6 transform -rotate-2 border-accent/30 shadow-2xl">
                <Layers className="w-10 h-10 text-accent mx-auto mb-3 opacity-80" />
                <h3 className="text-lg font-black text-foreground uppercase tracking-tighter">Módulo em Manutenção</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Funcionalidade desativada temporariamente</p>
              </Card>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-accent text-white shadow-lg">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-wider">
                  Banco de Dados
                </h2>
                <p className="text-xs text-muted-foreground font-bold uppercase">Backups e Limpeza</p>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleExport}
                variant="outline"
                className="w-full h-auto p-4 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary transition-transform group-hover:rotate-12">
                    <Download className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-sm text-foreground">EXPORTAR BACKUP</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Baixar arquivo .json</p>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>

              <Button
                onClick={() => setShowImportModal(true)}
                variant="outline"
                className="w-full h-auto p-4 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary transition-transform group-hover:rotate-12">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-sm text-foreground">IMPORTAR BACKUP</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Restaurar dados antigos</p>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>

              <div className="h-px bg-muted my-4"></div>

              <Button
                onClick={() => setShowClearModal(true)}
                variant="outline"
                className="w-full h-auto p-4 flex items-center justify-between border-accent/20 hover:bg-accent/5 hover:border-accent group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-accent/10 text-accent transition-transform group-hover:scale-110">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-sm text-accent">LIMPAR TUDO</h3>
                    <p className="text-[10px] text-accent opacity-60 uppercase font-bold">Ação Irreversível</p>
                  </div>
                </div>
              </Button>
            </div>
          </Card>

          {/* About Section */}
          <Card className="p-6 opacity-80 hover:opacity-100">
            <div className="flex items-center gap-3 mb-4 text-foreground">
              <Info className="w-6 h-6" />
              <h2 className="text-lg font-black uppercase">Informações</h2>
            </div>

            <div className="space-y-4 text-xs text-foreground font-medium leading-relaxed">
              <div className="flex justify-between items-center p-3 rounded-xl bg-muted/20">
                <span className="opacity-60 uppercase font-black">Versão</span>
                <span className="font-black text-primary">0.26.x</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Upload className="w-8 h-8 text-primary" />
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                  Importar Backup
                </h3>
              </div>
              <Button
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                  setImportStatus('idle');
                  setImportMessage('');
                }}
                variant="ghost"
                size="icon"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-muted-foreground uppercase ml-1">
                  MÉTODO 1: CARREGAR ARQUIVO .JSON
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="w-full px-4 py-3 rounded-xl border-2 border-dashed focus:ring-4 focus:ring-primary/20 transition-all font-bold text-sm bg-card border-border text-foreground"
                />
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t-2 border-border"></div>
                <span className="flex-shrink mx-4 text-xs font-black opacity-30 uppercase tracking-widest">ou</span>
                <div className="flex-grow border-t-2 border-border"></div>
              </div>

              {/* Text Import */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-muted-foreground uppercase ml-1">
                  MÉTODO 2: COLAR TEXTO JSON
                </label>
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Cole o conteúdo do arquivo JSON aqui..."
                  className="h-48 font-mono text-xs"
                />
              </div>

              {/* Status Message */}
              {importMessage && (
                <div className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl animate-in slide-in-from-bottom-2 duration-300 border-2",
                  importStatus === 'success' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-accent/10 border-accent/20 text-accent'
                )}>
                  {importStatus === 'success' ? (
                    <CheckCircle className="w-6 h-6 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                  )}
                  <span className="text-sm font-bold">{importMessage}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportText('');
                    setImportStatus('idle');
                    setImportMessage('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  CANCELAR
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!importText.trim() || importStatus === 'success'}
                  className="flex-1"
                >
                  IMPORTAR AGORA
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showClearModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-8 shadow-2xl border-accent">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-4 rounded-full bg-accent text-white shadow-xl animate-bounce mb-6">
                <AlertTriangle className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                Atenção Máxima!
              </h3>
              <p className="text-sm text-muted-foreground mt-2 font-medium">
                Esta ação apagará permanentemente todos os seus registros financeiros.
              </p>
            </div>

            <div className="mb-8 p-5 rounded-2xl bg-accent/5 border-2 border-accent/20">
              <p className="text-xs text-accent font-black uppercase mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent"></div>
                Dados que serão perdidos:
              </p>
              <ul className="text-xs text-foreground font-bold space-y-2 ml-4">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-text opacity-50"></div>
                  {totalTransactions} Transações
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-text opacity-50"></div>
                  {totalGoals} Metas de Economia
                </li>
                <li className="flex items-center gap-2 text-accent">
                  <div className="w-1 h-1 rounded-full bg-accent"></div>
                  Todo o seu histórico local
                </li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setShowClearModal(false)}
                variant="outline"
                className="flex-1"
              >
                CANCELAR
              </Button>
              <Button
                onClick={handleClearAllData}
                variant="danger"
                className="flex-1"
              >
                LIMPAR TUDO
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Category Add Confirmation Modal */}
      {showAddCategoryModal && pendingCategory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-4 rounded-full bg-primary/10 text-primary shadow-xl mb-6">
                <PlusCircle className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                Nova Categoria
              </h3>
              <p className="text-sm text-muted-foreground mt-2 font-medium">
                Deseja adicionar a categoria <span className="font-black text-primary">"{pendingCategory.name}"</span> em <span className="font-black">{pendingCategory.type === 'expense' ? 'DESPESAS' : 'RECEITAS'}</span>?
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setPendingCategory(null);
                }}
                variant="outline"
                className="flex-1"
              >
                CANCELAR
              </Button>
              <Button
                onClick={confirmAddCategory}
                className="flex-1"
              >
                CONFIRMAR
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Category Delete Confirmation Modal */}
      {showDeleteCategoryModal && pendingCategory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-8 shadow-2xl border-accent">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-4 rounded-full bg-accent/10 text-accent shadow-xl mb-6">
                <Trash2 className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                Excluir Categoria
              </h3>
              <p className="text-sm text-muted-foreground mt-2 font-medium">
                Tem certeza que deseja remover <span className="font-black text-accent">"{pendingCategory.name}"</span>?
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setShowDeleteCategoryModal(false);
                  setPendingCategory(null);
                }}
                variant="outline"
                className="flex-1"
              >
                CANCELAR
              </Button>
              <Button
                onClick={confirmRemoveCategory}
                variant="danger"
                className="flex-1"
              >
                EXCLUIR
              </Button>
            </div>
          </Card>
        </div>
      )}
      {/* Category Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[200] backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-8 shadow-2xl border-accent">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-4 rounded-full bg-accent/10 text-accent shadow-xl mb-6">
                <AlertTriangle className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                Atenção!
              </h3>
              <p className="text-sm text-muted-foreground mt-4 font-bold leading-relaxed">
                {errorModalMessage}
              </p>
            </div>

            <Button
              onClick={() => {
                if (errorTimer === 0) {
                  setShowErrorModal(false);
                }
              }}
              disabled={errorTimer > 0}
              variant={errorTimer > 0 ? 'secondary' : 'danger'}
              className="w-full"
            >
              OK {errorTimer > 0 ? `(${errorTimer}s)` : ''}
            </Button>
          </Card>
        </div>
      )}

      {/* Payment Method Add Confirmation Modal */}
      {showAddPaymentMethodModal && pendingPaymentMethod && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-4 rounded-full bg-primary/10 text-primary shadow-xl mb-6">
                <PlusCircle className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                Novo Meio de Pagamento
              </h3>
              <p className="text-sm text-muted-foreground mt-2 font-medium">
                Deseja adicionar <span className="font-black text-primary">"{pendingPaymentMethod}"</span> aos seus meios de pagamento?
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setShowAddPaymentMethodModal(false);
                  setPendingPaymentMethod(null);
                }}
                variant="outline"
                className="flex-1"
              >
                CANCELAR
              </Button>
              <Button
                onClick={confirmAddPaymentMethod}
                className="flex-1"
              >
                CONFIRMAR
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Payment Method Delete Confirmation Modal */}
      {showDeletePaymentMethodModal && pendingPaymentMethod && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-8 shadow-2xl border-accent">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-4 rounded-full bg-accent/10 text-accent shadow-xl mb-6">
                <Trash2 className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                Excluir Meio de Pagamento
              </h3>
              <p className="text-sm text-muted-foreground mt-2 font-medium">
                Tem certeza que deseja remover <span className="font-black text-accent">"{pendingPaymentMethod}"</span>?
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setShowDeletePaymentMethodModal(false);
                  setPendingPaymentMethod(null);
                }}
                variant="outline"
                className="flex-1"
              >
                CANCELAR
              </Button>
              <Button
                onClick={confirmRemovePaymentMethod}
                variant="danger"
                className="flex-1"
              >
                EXCLUIR
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Settings;
