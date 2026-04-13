import { useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import Calendar from './components/Calendar';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import InitialBalanceModal from './components/InitialBalanceModal';
import Navigation from './components/Navigation';
import Playground from './components/Playground';
import Reports from './components/Reports';
import SavingsGoals from './components/SavingsGoals';
import TransactionList from './components/TransactionList';
import Settings from './components/Settings';
import { Board } from './components/trello/Board';
import VerificationModal from './components/VerificationModal';
import { useTheme } from './contexts/ThemeContext';
import { useVerification } from './contexts/VerificationContext';
import ShoppingListModal from './components/ShoppingListModal';
import { useFinancialData } from './hooks/useFinancialData';
import { useShoppingList } from './hooks/useShoppingList';
import { getBrazilDateString } from './utils/helpers';
import TransactionForm from './components/TransactionForm';
import { Transaction } from './types';

const HojeRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const hoje = getBrazilDateString();
    navigate(`/playground?de=${hoje}&ate=${hoje}&status=pending&view=focus`, { replace: true });
  }, [navigate]);
  return null;
};

function App() {
  const { pin, isInitializing, isVerified, isSettingsVerified, setShowVerificationModal } = useVerification();
  const navigate = useNavigate();
  const {
    transactions,
    savingsGoals,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updatePaymentStatus,
    addSavingsGoal,
    updateSavingsGoal,
    addSavingsContribution,
    updateSavingsContribution,
    deleteSavingsContribution,
    deleteSavingsGoal,
    importData,
    clearAllData,
    isLoading,
  } = useFinancialData();

  const { theme } = useTheme();
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [showInitialBalanceModal, setShowInitialBalanceModal] = useState(false);
  const { shoppingList, addItem, togglePurchased, removeItem, clearPurchased, togglePriority } = useShoppingList();
  const [animateCombined, setAnimateCombined] = useState(false);

  // Rotas onde o menu lateral não fica expandido no desktop
  const location = useLocation();
  const isFocusMode = 
    new URLSearchParams(location.search).get('view') === 'focus' || 
    location.pathname === '/hoje';

  const routesWithoutDesktopMenu = ['/playground'];
  const hideMenuOnDesktop = routesWithoutDesktopMenu.includes(location.pathname);

  useEffect(() => {
    if (isInitializing) return;

    // Se tentar acessar settings sem verificação específica de settings, abre o modal
    if (location.pathname === '/settings' && !isSettingsVerified) {
      setShowVerificationModal(true);
    }

    // Lógica da tela de bem-vindo (Saldo Inicial)
    // Mostra se: usuário está verificado, não está carregando e o banco está vazio
    if (isVerified || pin) {
      // Consideramos vazio se não houver transações ou se todas estiverem deletadas
      const activeTransactions = transactions.filter(t => t.status !== 'deleted');
      
      if (!isLoading && activeTransactions.length === 0) {
        // Verifica se já não foi fechado nesta sessão para ESTE PIN específico
        const storageKey = `hasSeenInitialBalanceModal_${pin}`;
        const hasSeenModal = sessionStorage.getItem(storageKey);
        if (!hasSeenModal) {
          setShowInitialBalanceModal(true);
        }
      }
    }
  }, [isLoading, transactions?.length, pin, isVerified, isInitializing, location.pathname, isSettingsVerified, setShowVerificationModal]);

  useEffect(() => {
    const hasItems = Array.isArray(shoppingList) && shoppingList.filter(item => !item.purchased).length > 0;

    if (hasItems) {
      const interval = setInterval(() => {
        setAnimateCombined(true);
        setTimeout(() => {
          setAnimateCombined(false);
        }, 500);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [shoppingList]);

  const handleConfirmInitialBalance = (amount: number, type: 'income' | 'expense') => {
    addTransaction({
      type,
      amount,
      description: 'Saldo Inicial',
      category: 'Outros',
      date: getBrazilDateString(),
      isPaid: true,
      recurrence: 'none',
    });
    sessionStorage.setItem(`hasSeenInitialBalanceModal_${pin}`, 'true');
    setShowInitialBalanceModal(false);
  };

  const handleSkipInitialBalance = () => {
    sessionStorage.setItem(`hasSeenInitialBalanceModal_${pin}`, 'true');
    setShowInitialBalanceModal(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
        {!isFocusMode && (
          <Header 
            shoppingItemCount={Array.isArray(shoppingList) ? shoppingList.filter(item => !item.purchased).length : 0}
            onOpenShoppingList={() => setIsShoppingListOpen(true)}
            animateShoppingButton={animateCombined}
          />
        )}
        {!isFocusMode && <Navigation />}

        {!isFocusMode && (
          <ShoppingListModal
            isOpen={isShoppingListOpen}
            onClose={() => setIsShoppingListOpen(false)}
            shoppingList={shoppingList}
            addItem={addItem}
            togglePurchased={togglePurchased}
            removeItem={removeItem}
            clearPurchased={clearPurchased}
            togglePriority={togglePriority}
            theme={theme}
          />
        )}

        {/* No /playground, remove o lg:pl-72 para ocupar toda a largura. No modo foco também remove. */}
        <main className={`w-full transition-all duration-300 ${isFocusMode ? 'p-0' : 'px-4 sm:px-6 lg:px-12 pb-20'} ${hideMenuOnDesktop || isFocusMode ? '' : 'lg:pl-72'}`}>
          <Routes>
            <Route path="/" element={<Dashboard transactions={transactions} savingsGoals={savingsGoals} />} />
            <Route path="/expenses" element={<TransactionList type="expense" transactions={transactions} savingsGoals={savingsGoals} onAdd={addTransaction} onUpdate={updateTransaction} onDelete={deleteTransaction} onUpdatePaymentStatus={updatePaymentStatus} />} />
            <Route 
              path="/expenses/new" 
              element={
                <TransactionForm 
                  type="expense" 
                  savingsGoals={savingsGoals}
                  onSubmit={async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
                    await addTransaction(data);
                    // navigate('/expenses'); // Removido para permitir que a animação termine
                  }} 
                  onClose={() => navigate('/expenses')} 
                />
              } 
            />
            <Route path="/income" element={<TransactionList type="income" transactions={transactions} savingsGoals={savingsGoals} onAdd={addTransaction} onUpdate={updateTransaction} onDelete={deleteTransaction} onUpdatePaymentStatus={updatePaymentStatus} />} />
            <Route path="/calendar" element={<Calendar transactions={transactions} onUpdatePaymentStatus={updatePaymentStatus} />} />
            <Route path="/reports" element={<Reports transactions={transactions} savingsGoals={savingsGoals} />} />
            <Route path="/playground" element={<Playground transactions={transactions} savingsGoals={savingsGoals} onAddTransaction={addTransaction} />} />
            <Route path="/goals" element={<SavingsGoals goals={savingsGoals} onAdd={addSavingsGoal} onUpdate={updateSavingsGoal} onDelete={deleteSavingsGoal} onAddContribution={addSavingsContribution} onUpdateContribution={updateSavingsContribution} onDeleteContribution={deleteSavingsContribution} onUpdatePaymentStatus={updatePaymentStatus} />} />
            <Route 
              path="/settings" 
              element={
                isSettingsVerified ? (
                  <Settings transactions={transactions} savingsGoals={savingsGoals} onImportData={importData} onClearAllData={clearAllData} />
                ) : null
              } 
            />
            <Route path="/tasks" element={<Board />} />
            <Route path="/hoje" element={<HojeRedirect />} />
          </Routes>
        </main>
        <VerificationModal />
        <InitialBalanceModal 
          isOpen={showInitialBalanceModal}
          onConfirm={handleConfirmInitialBalance}
          onClose={handleSkipInitialBalance}
        />
    </div>
  );
}

export default App;

