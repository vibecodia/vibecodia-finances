import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

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
import { TrelloBoard } from './components/trello/TrelloBoard';
import VerificationModal from './components/VerificationModal';
import { useTheme } from './contexts/ThemeContext';
import { useVerification } from './contexts/VerificationContext';
import ShoppingCartButton from './components/ShoppingCartButton';
import ShoppingListModal from './components/ShoppingListModal';
import { useFinancialData } from './hooks/useFinancialData';
import { useShoppingList } from './hooks/useShoppingList';
import { getBrazilDateString } from './utils/helpers';

function App() {
  const { pin, isInitializing } = useVerification();
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

  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [showInitialBalanceModal, setShowInitialBalanceModal] = useState(false);
  const { shoppingList, addItem, togglePurchased, removeItem, clearPurchased, togglePriority } = useShoppingList();
  const [animateCombined, setAnimateCombined] = useState(false);

  // Rotas onde o menu lateral não fica expandido no desktop
  const location = useLocation();
  const routesWithoutDesktopMenu = ['/playground'];
  const hideMenuOnDesktop = routesWithoutDesktopMenu.includes(location.pathname);

  useEffect(() => {
    if (isInitializing) return;

    if (pin) {
      const hasSeenModal = sessionStorage.getItem(`hasSeenInitialBalanceModal_${pin}`);
      if (!isLoading && transactions.length === 0 && !hasSeenModal) {
        setShowInitialBalanceModal(true);
      }
    }
  }, [isLoading, transactions, pin, isInitializing]);

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
      description: 'Saldo Inicial #1',
      amount,
      type,
      category: 'Saldo Inicial',
      date: getBrazilDateString(),
      isPaid: true,
      recurrence: 'none',
      paymentMethod: type === 'expense' ? 'pix' : undefined,
    });
    if (pin) {
      sessionStorage.setItem(`hasSeenInitialBalanceModal_${pin}`, 'true');
    }
    setShowInitialBalanceModal(false);
  };

  const handleSkipInitialBalance = () => {
    if (pin) {
      sessionStorage.setItem(`hasSeenInitialBalanceModal_${pin}`, 'true');
    }
    setShowInitialBalanceModal(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
        <Header />
        <Navigation />

        <div className="fixed bottom-6 left-4 z-50 flex items-center">
          <ShoppingCartButton
            itemCount={Array.isArray(shoppingList) ? shoppingList.filter(item => !item.purchased).length : 0}
            onClick={() => setIsShoppingListOpen(true)}
            theme={theme}
            animateCombined={animateCombined}
          />

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-card-background text-text shadow-lg ml-1"
            style={{ 
              backgroundColor: theme.cardBackground,
              color: theme.text
            }}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

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
          isDarkMode={isDarkMode}
        />

        {/* No /playground, remove o lg:pl-72 para ocupar toda a largura */}
        <main className={`w-full px-4 sm:px-6 lg:px-12 pb-20 transition-all duration-300 ${hideMenuOnDesktop ? '' : 'lg:pl-72'}`}>
          <Routes>
            <Route path="/" element={<Dashboard transactions={transactions} savingsGoals={savingsGoals} />} />
            <Route path="/expenses" element={<TransactionList type="expense" transactions={transactions} savingsGoals={savingsGoals} onAdd={addTransaction} onUpdate={updateTransaction} onDelete={deleteTransaction} onUpdatePaymentStatus={updatePaymentStatus} />} />
            <Route path="/income" element={<TransactionList type="income" transactions={transactions} savingsGoals={savingsGoals} onAdd={addTransaction} onUpdate={updateTransaction} onDelete={deleteTransaction} onUpdatePaymentStatus={updatePaymentStatus} />} />
            <Route path="/calendar" element={<Calendar transactions={transactions} onUpdatePaymentStatus={updatePaymentStatus} />} />
            <Route path="/reports" element={<Reports transactions={transactions} savingsGoals={savingsGoals} />} />
            <Route path="/playground" element={<Playground transactions={transactions} savingsGoals={savingsGoals} />} />
            <Route path="/goals" element={<SavingsGoals goals={savingsGoals} onAdd={addSavingsGoal} onUpdate={updateSavingsGoal} onDelete={deleteSavingsGoal} onAddContribution={addSavingsContribution} onUpdateContribution={updateSavingsContribution} onDeleteContribution={deleteSavingsContribution} onUpdatePaymentStatus={updatePaymentStatus} />} />
            <Route path="/settings" element={<Settings transactions={transactions} savingsGoals={savingsGoals} onImportData={importData} onClearAllData={clearAllData} />} />
            <Route path="/tasks" element={<TrelloBoard />} />
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
