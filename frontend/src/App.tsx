import { Moon, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import { TrelloBoard } from './components/trello/TrelloBoard';
import VerificationModal from './components/VerificationModal';
import { useTheme } from './contexts/ThemeContext';
import { useVerification } from './contexts/VerificationContext';
import ShoppingCartButton from './components/ShoppingCartButton';
import ShoppingListModal from './components/ShoppingListModal';
import { useFinancialData } from './hooks/useFinancialData';
import { useShoppingList } from './hooks/useShoppingList';
import { getBrazilDateString, isTouchNavigationEnabled } from './utils/helpers';

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
  const navigate = useNavigate();
  const routesWithoutDesktopMenu = ['/playground'];
  const hideMenuOnDesktop = routesWithoutDesktopMenu.includes(location.pathname);
  const [isSwipeTransitionActive, setIsSwipeTransitionActive] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('left');
  const [cubeTransform, setCubeTransform] = useState('rotateY(0deg)');
  const [cubeTransition, setCubeTransition] = useState('transform 0ms');
  const swipeTransitionRef = useRef(false);
  const pendingToRef = useRef<string | null>(null);
  const bodyOverflowRef = useRef<string>('');

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

  useEffect(() => {
    const handler = (event: Event) => {
      if (!isTouchNavigationEnabled()) return;
      if (swipeTransitionRef.current) return;

      const detail = (event as CustomEvent<{ to: string; direction: 'left' | 'right' }>).detail;
      if (!detail?.to) return;
      if (detail.to === location.pathname) return;

      const startTransition = () => {
        swipeTransitionRef.current = true;
        pendingToRef.current = detail.to;
        setSwipeDirection(detail.direction);
        setIsSwipeTransitionActive(true);

        bodyOverflowRef.current = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const halfDurationMs = 200;
        setCubeTransition(`transform ${halfDurationMs}ms ease-in-out`);
        setCubeTransform(detail.direction === 'left' ? 'rotateY(-90deg)' : 'rotateY(90deg)');

        window.setTimeout(() => {
          const pendingTo = pendingToRef.current;

          setCubeTransition('none');
          setCubeTransform(detail.direction === 'left' ? 'rotateY(90deg)' : 'rotateY(-90deg)');

          if (pendingTo) navigate(pendingTo);

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setCubeTransition(`transform ${halfDurationMs}ms ease-in-out`);
              setCubeTransform('rotateY(0deg)');
            });
          });

          window.setTimeout(() => {
            setIsSwipeTransitionActive(false);
            swipeTransitionRef.current = false;
            pendingToRef.current = null;
            document.body.style.overflow = bodyOverflowRef.current;
          }, halfDurationMs);
        }, halfDurationMs);
      };

      startTransition();
    };

    window.addEventListener('swipe-route-transition', handler as EventListener);
    return () => window.removeEventListener('swipe-route-transition', handler as EventListener);
  }, [location.pathname, navigate]);

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

        <div className="fixed top-20 right-4 z-50 flex items-center">
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
        <div style={{ perspective: '1400px' }}>
          <div
            style={{
              transform: cubeTransform,
              transition: cubeTransition,
              transformStyle: 'preserve-3d',
              transformOrigin: swipeDirection === 'left' ? 'left center' : 'right center',
              willChange: isSwipeTransitionActive ? 'transform' : undefined,
            }}
          >
            <main className={`w-full px-4 sm:px-6 lg:px-12 pb-20 transition-all duration-300 ${hideMenuOnDesktop ? '' : 'lg:pl-72'}`}>
              <Routes>
                <Route path="/" element={<Dashboard transactions={transactions} savingsGoals={savingsGoals} />} />
                <Route path="/expenses" element={<TransactionList type="expense" transactions={transactions} onAdd={addTransaction} onUpdate={updateTransaction} onDelete={deleteTransaction} onUpdatePaymentStatus={updatePaymentStatus} />} />
                <Route path="/income" element={<TransactionList type="income" transactions={transactions} onAdd={addTransaction} onUpdate={updateTransaction} onDelete={deleteTransaction} onUpdatePaymentStatus={updatePaymentStatus} />} />
                <Route path="/calendar" element={<Calendar transactions={transactions} onUpdatePaymentStatus={updatePaymentStatus} />} />
                <Route path="/reports" element={<Reports transactions={transactions} savingsGoals={savingsGoals} />} />
                <Route path="/playground" element={<Playground transactions={transactions} savingsGoals={savingsGoals} />} />
                <Route path="/goals" element={<SavingsGoals goals={savingsGoals} onAdd={addSavingsGoal} onUpdate={updateSavingsGoal} onDelete={deleteSavingsGoal} onAddContribution={addSavingsContribution} onUpdateContribution={updateSavingsContribution} onDeleteContribution={deleteSavingsContribution} />} />
                <Route path="/settings" element={<Settings transactions={transactions} savingsGoals={savingsGoals} onImportData={importData} onClearAllData={clearAllData} />} />
                <Route path="/tasks" element={<TrelloBoard />} />
              </Routes>
            </main>
          </div>
        </div>
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
