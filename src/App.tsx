import { Route, Routes } from 'react-router-dom';
import { useFinancialData } from './hooks/useFinancialData';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import Reports from './components/Reports';
import SavingsGoals from './components/SavingsGoals';
import Calendar from './components/Calendar';
import Settings from './components/Settings';
import Navigation from './components/Navigation';
import Header from './components/Header';
import { useTheme } from './contexts/ThemeContext';
import { VerificationProvider } from './contexts/VerificationContext';
import VerificationModal from './components/VerificationModal';
import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import ShoppingCartButton from './components/ShoppingCartButton';
import ShoppingListModal from './components/ShoppingListModal';
import { useShoppingList } from './hooks/useShoppingList';
import { TrelloBoard } from './components/trello/TrelloBoard';

function App() {

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
    monthlyBalances,
  } = useFinancialData();

  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const { shoppingList, addItem, togglePurchased, removeItem, clearPurchased, togglePriority } = useShoppingList();
  const [animateCombined, setAnimateCombined] = useState(false);

  useEffect(() => {
    const hasItems = Array.isArray(shoppingList) && shoppingList.filter(item => !item.purchased).length > 0;

    if (hasItems) {
      const interval = setInterval(() => {
        setAnimateCombined(true);
        setTimeout(() => {
          setAnimateCombined(false);
        }, 500); // Animate for 0.5 seconds
      }, 5000); // Shake and pulse every 5 seconds

      return () => clearInterval(interval);
    }
  }, [shoppingList]);

  return (
    <VerificationProvider>
      <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
          <Header />
          <Navigation />

          <div className="fixed top-20 right-4 z-50 flex items-center">
            <ShoppingCartButton
              itemCount={Array.isArray(shoppingList) ? shoppingList.filter(item => !item.purchased).length : 0}
              onClick={() => setIsShoppingListOpen(true)}
              theme={theme}
              animateCombined={animateCombined}
            />

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-card-background text-text shadow-lg ml-1" // Adiciona um pequeno espaço à esquerda
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

          <main className="max-w-md mx-auto p-4 pb-20">
            <Routes>
              <Route path="/" element={<Dashboard transactions={transactions} savingsGoals={savingsGoals} monthlyBalances={monthlyBalances} />} />
              <Route path="/expenses" element={<TransactionList type="expense" transactions={transactions} onAdd={addTransaction} onUpdate={updateTransaction} onDelete={deleteTransaction} onUpdatePaymentStatus={updatePaymentStatus} monthlyBalances={monthlyBalances} />} />
              <Route path="/income" element={<TransactionList type="income" transactions={transactions} onAdd={addTransaction} onUpdate={updateTransaction} onDelete={deleteTransaction} onUpdatePaymentStatus={updatePaymentStatus} monthlyBalances={monthlyBalances} />} />
              <Route path="/calendar" element={<Calendar transactions={transactions} onUpdatePaymentStatus={updatePaymentStatus} />} />
              <Route path="/reports" element={<Reports transactions={transactions} savingsGoals={savingsGoals} />} />
              <Route path="/goals" element={<SavingsGoals goals={savingsGoals} onAdd={addSavingsGoal} onUpdate={updateSavingsGoal} onDelete={deleteSavingsGoal} onAddContribution={addSavingsContribution} onUpdateContribution={updateSavingsContribution} onDeleteContribution={deleteSavingsContribution} />} />
              <Route path="/settings" element={<Settings transactions={transactions} savingsGoals={savingsGoals} onImportData={importData} onClearAllData={clearAllData} />} />
              <Route path="/tasks" element={<TrelloBoard />} />
            </Routes>
          </main>
      </div>
      <VerificationModal />
    </VerificationProvider>
  );
}

export default App;