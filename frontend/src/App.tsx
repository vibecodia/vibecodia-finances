import { Keyboard, Loader2, MapPin, X } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import GuestEntry from "./components/GuestEntry";
import Header from "./components/Header";
import InitialBalanceModal from "./components/InitialBalanceModal";
import Navigation from "./components/Navigation";
import ShoppingListModal from "./components/ShoppingListModal";
import { Button } from "./components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./components/ui/dialog";
import VerificationModal from "./components/VerificationModal";
import { useTheme } from "./contexts/ThemeContext";
import { useVerification } from "./contexts/VerificationContext";
import { useFinancialData } from "./hooks/useFinancialData";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { useShoppingList } from "./hooks/useShoppingList";
import { useTour } from "./hooks/useTour";
import { Transaction } from "./types";
import { getBrazilDateString } from "./utils/helpers";

const Calendar = lazy(() => import("./components/Calendar"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const Playground = lazy(() => import("./components/Playground"));
const Reports = lazy(() => import("./components/Reports"));
const SavingsGoals = lazy(() => import("./components/SavingsGoals"));
const Settings = lazy(() => import("./components/Settings"));
const TransactionForm = lazy(() => import("./components/TransactionForm"));
const TransactionList = lazy(() => import("./components/TransactionList"));
const Board = lazy(() =>
  import("./components/trello/Board").then((m) => ({ default: m.Board })),
);
const ConnectionErrorScreen = lazy(
  () => import("./components/ConnectionErrorScreen"),
);

const HojeRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const hoje = getBrazilDateString();
    navigate(`/playground?de=${hoje}&ate=${hoje}&status=pending&view=focus`, {
      replace: true,
    });
  }, [navigate]);
  return null;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function App() {
  const {
    pin,
    isInitializing,
    isVerified,
    isGuest,
    isSettingsVerified,
    setShowVerificationModal,
  } = useVerification();
  const { startTour, showConfirm, setShowConfirm } = useTour();

  // Registrar Push Notifications
  usePushNotifications(pin, isVerified);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isInitializing) return;

    // Se não estiver verificado e não estiver em modo guest, e não estiver na rota /guest, redireciona
    if (!isVerified && !isGuest && location.pathname !== "/guest") {
      setShowVerificationModal(false); // Hide modal before redirecting
      navigate("/guest");
    }

    // Se estiver verificado ou em modo guest e estiver na rota /guest, vai para home
    if ((isVerified || isGuest) && location.pathname === "/guest") {
      navigate("/");
    }
  }, [
    isVerified,
    isGuest,
    isInitializing,
    location.pathname,
    navigate,
    setShowVerificationModal,
  ]);

  const {
    transactions,
    savingsGoals,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updatePaymentStatus,
    addSavingsGoal,
    updateSavingsGoal,
    archiveSavingsGoal,
    unarchiveSavingsGoal,
    addSavingsContribution,
    updateSavingsContribution,
    deleteSavingsContribution,
    restoreSavingsContribution,
    deleteSavingsGoal,
    importData,
    clearAllData,
    isLoading,
    hasLoaded,
    isSlowConnection,
    error,
    refetch,
  } = useFinancialData();

  const { theme } = useTheme();
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showInitialBalanceModal, setShowInitialBalanceModal] = useState(false);

  useKeyboardShortcuts(() => setShowShortcutsModal(true));
  const {
    shoppingList,
    addItem,
    togglePurchased,
    removeItem,
    clearPurchased,
    togglePriority,
  } = useShoppingList();
  const [animateCombined, setAnimateCombined] = useState(false);

  // Rotas onde o menu lateral não fica expandido no desktop
  const isFocusMode =
    new URLSearchParams(location.search).get("view") === "focus" ||
    location.pathname === "/hoje";

  const routesWithoutDesktopMenu = ["/playground", "/tasks"];
  const hideMenuOnDesktop = routesWithoutDesktopMenu.includes(
    location.pathname,
  );
  const isGuestRoute = location.pathname === "/guest";

  useEffect(() => {
    if (isInitializing) return;

    // Se tentar acessar settings sem verificação específica de settings, abre o modal
    if (location.pathname === "/settings" && !isSettingsVerified) {
      setShowVerificationModal(true);
    }

    // Lógica da tela de bem-vindo (Saldo Inicial)
    // Mostra se: usuário está verificado ou em modo guest, não está carregando, os dados foram carregados e o banco está vazio
    if ((isVerified || isGuest || pin) && hasLoaded) {
      // Consideramos vazio se não houver transações ou se todas estiverem deletadas
      const activeTransactions = transactions.filter(
        (t) => t.status !== "deleted",
      );

      if (!isLoading && activeTransactions.length === 0) {
        // Verifica se já não foi fechado nesta sessão para ESTE PIN específico (ou 'guest')
        const identifier = pin || (isGuest ? "guest" : "");
        if (identifier) {
          const storageKey = `hasSeenInitialBalanceModal_${identifier}`;
          const hasSeenModal = sessionStorage.getItem(storageKey);

          // Se não houver transações e não vimos o modal na sessão, mostramos.
          // O "transactions.length === 0" já garante que só chamamos se o saldo estiver zerado.
          if (!hasSeenModal) {
            setShowInitialBalanceModal(true);
          }
        }
      }
    }
  }, [
    isLoading,
    hasLoaded,
    transactions?.length,
    pin,
    isVerified,
    isGuest,
    isInitializing,
    location.pathname,
    isSettingsVerified,
    setShowVerificationModal,
  ]);

  useEffect(() => {
    const hasItems =
      Array.isArray(shoppingList) &&
      shoppingList.filter((item) => !item.purchased).length > 0;

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

  const handleConfirmInitialBalance = (
    amount: number,
    type: "income" | "expense",
  ) => {
    addTransaction({
      type,
      amount,
      description: "Saldo Inicial",
      category: "Outros",
      date: getBrazilDateString(),
      isPaid: true,
      recurrence: "none",
    });
    const identifier = pin || (isGuest ? "guest" : "");
    if (identifier) {
      sessionStorage.setItem(
        `hasSeenInitialBalanceModal_${identifier}`,
        "true",
      );
    }
    setShowInitialBalanceModal(false);

    // Se for convidado, inicia o tour após o saldo inicial
    if (isGuest) {
      const hasSkipped = localStorage.getItem("tour_skipped");
      if (!hasSkipped) {
        setTimeout(() => {
          // O startTour(true) agora apenas abre o modal de confirmação no Dashboard
          startTour(true);
        }, 800);
      }
    }
  };

  const handleSkipInitialBalance = () => {
    const identifier = pin || (isGuest ? "guest" : "");
    if (identifier) {
      sessionStorage.setItem(
        `hasSeenInitialBalanceModal_${identifier}`,
        "true",
      );
    }
    setShowInitialBalanceModal(false);

    // Se for convidado, inicia o tour mesmo pulando o saldo inicial
    if (isGuest) {
      const hasSkipped = localStorage.getItem("tour_skipped");
      if (!hasSkipped) {
        setTimeout(() => {
          startTour(true);
        }, 800);
      }
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      <ScrollToTop />
      {!isFocusMode && !isGuestRoute && (
        <Header
          shoppingItemCount={
            Array.isArray(shoppingList)
              ? shoppingList.filter((item) => !item.purchased).length
              : 0
          }
          onOpenShoppingList={() => setIsShoppingListOpen(true)}
          animateShoppingButton={animateCombined}
        />
      )}
      {!isFocusMode && !isGuestRoute && <Navigation />}

      {!isFocusMode && !isGuestRoute && (
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
      <main
        className={`w-full transition-all duration-300 ${isFocusMode ? "p-0" : "px-4 sm:px-6 lg:px-12 pb-20"} ${hideMenuOnDesktop || isFocusMode ? "" : "lg:pl-72"}`}
      >
        <Suspense
          fallback={
            <div className="flex h-96 w-full items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          }
        >
          <Routes>
          <Route
            path="/"
            element={
              !isGuest && !hasLoaded && error && !isLoading ? (
                <ConnectionErrorScreen
                  onRetry={refetch}
                  errorMessage={error}
                />
              ) : (
                <Dashboard
                  transactions={transactions}
                  savingsGoals={savingsGoals}
                  isLoading={isLoading}
                  hasLoaded={hasLoaded}
                  isSlowConnection={isSlowConnection}
                  onRetry={refetch}
                />
              )
            }
          />
          <Route
            path="/connection-issue"
            element={
              <ConnectionErrorScreen
                onRetry={refetch}
                errorMessage={error}
              />
            }
          />
          <Route path="/guest" element={<GuestEntry />} />
          <Route
            path="/expenses"
            element={
              <TransactionList
                type="expense"
                transactions={transactions}
                savingsGoals={savingsGoals}
                onAdd={addTransaction}
                onUpdate={updateTransaction}
                onDelete={deleteTransaction}
                onUpdatePaymentStatus={updatePaymentStatus}
              />
            }
          />
          <Route
            path="/expenses/new"
            element={
              <TransactionForm
                type="expense"
                savingsGoals={savingsGoals}
                onSubmit={async (
                  data: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
                ) => {
                  await addTransaction(data);
                  // navigate('/expenses'); // Removido para permitir que a animação termine
                }}
                onClose={() => navigate("/expenses")}
              />
            }
          />
          <Route
            path="/income"
            element={
              <TransactionList
                type="income"
                transactions={transactions}
                savingsGoals={savingsGoals}
                onAdd={addTransaction}
                onUpdate={updateTransaction}
                onDelete={deleteTransaction}
                onUpdatePaymentStatus={updatePaymentStatus}
              />
            }
          />
          <Route
            path="/income/new"
            element={
              <TransactionForm
                type="income"
                savingsGoals={savingsGoals}
                onSubmit={async (
                  data: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
                ) => {
                  await addTransaction(data);
                }}
                onClose={() => navigate("/income")}
              />
            }
          />
          <Route
            path="/calendar"
            element={
              <Calendar
                transactions={transactions}
                onUpdatePaymentStatus={updatePaymentStatus}
              />
            }
          />
          <Route
            path="/reports"
            element={
              <Reports
                transactions={transactions}
                savingsGoals={savingsGoals}
              />
            }
          />
          <Route
            path="/playground"
            element={
              isGuest ? (
                <Dashboard
                  transactions={transactions}
                  savingsGoals={savingsGoals}
                  isLoading={isLoading}
                  hasLoaded={hasLoaded}
                  isSlowConnection={isSlowConnection}
                  onRetry={refetch}
                />
              ) : (
                <Playground
                  transactions={transactions}
                  savingsGoals={savingsGoals}
                  onAddTransaction={addTransaction}
                />
              )
            }
          />
          <Route
            path="/goals"
            element={
              <SavingsGoals
                goals={savingsGoals}
                onAdd={addSavingsGoal}
                onUpdate={updateSavingsGoal}
                onArchive={archiveSavingsGoal}
                onUnarchive={unarchiveSavingsGoal}
                onDelete={deleteSavingsGoal}
                onAddContribution={addSavingsContribution}
                onUpdateContribution={updateSavingsContribution}
                onDeleteContribution={deleteSavingsContribution}
                onRestoreContribution={restoreSavingsContribution}
                onUpdatePaymentStatus={updatePaymentStatus}
              />
            }
          />
          <Route
            path="/settings"
            element={
              isSettingsVerified ? (
                <Settings
                  transactions={transactions}
                  savingsGoals={savingsGoals}
                  onImportData={importData}
                  onClearAllData={clearAllData}
                />
              ) : null
            }
          />
          <Route path="/tasks" element={<Board />} />
          <Route path="/hoje" element={<HojeRedirect />} />
          <Route
            path="*"
            element={
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-4">
                <div className="p-6 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <span className="text-4xl font-black">404</span>
                </div>
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">
                  Página não encontrada
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  O endereço acessado não existe ou foi movido.
                </p>
                <Button onClick={() => navigate("/")} className="mt-2">
                  Voltar ao Início
                </Button>
              </div>
            }
          />
        </Routes>
      </Suspense>
      </main>
      <VerificationModal />
      <InitialBalanceModal
        isOpen={showInitialBalanceModal}
        onConfirm={handleConfirmInitialBalance}
        onClose={handleSkipInitialBalance}
      />

      {/* Modal de Confirmação do Tour - Estilizado como GuestEntry/InitialBalance */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md p-10 border-white/10 bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl overflow-hidden [&>button]:hidden">
          {/* Linha decorativa no topo similar ao InitialBalanceModal */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

          {/* Botão de Fechar Customizado (Substituindo o padrão do componente Dialog) */}
          <button
            onClick={() => {
              setShowConfirm(false);
              localStorage.setItem("tour_skipped", "true");
            }}
            className="absolute top-6 right-6 p-2.5 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-red-500/20 hover:border-red-500/30 transition-all active:scale-90 z-10"
          >
            <X size={18} />
          </button>

          <DialogHeader className="flex flex-col items-center text-center space-y-6">
            <div className="p-6 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.2)] animate-pulse">
              <MapPin className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-3xl font-black text-foreground uppercase tracking-tighter">
                EXPLORE A <span className="text-primary italic">VIBECODIA</span>
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground font-bold uppercase tracking-widest leading-relaxed opacity-70">
                Deseja fazer um tour rápido de 1 minuto para conhecer suas novas
                ferramentas?
              </DialogDescription>
            </div>
          </DialogHeader>

          <DialogFooter className="flex flex-col gap-4 mt-10">
            <Button
              onClick={() => {
                setShowConfirm(false);
                startTour();
              }}
              className="w-full h-16 text-sm font-black uppercase tracking-[0.3em] rounded-2xl shadow-lg hover:shadow-primary/20 active:scale-95 transition-all"
            >
              Começar Agora
            </Button>

            <button
              onClick={() => {
                setShowConfirm(false);
                localStorage.setItem("tour_skipped", "true");
              }}
              className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] opacity-60 hover:opacity-100 hover:text-primary transition-all active:scale-95 py-2"
            >
              Pular tour por enquanto
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Modal */}
      <Dialog open={showShortcutsModal} onOpenChange={setShowShortcutsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              Atalhos do Teclado
            </DialogTitle>
            <DialogDescription>
              Aumente sua produtividade com comandos rápidos (Apenas Desktop).
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-4">
            {[
              {
                key: "D",
                label: "Resumo",
                description: "Volta para o dashboard inicial",
              },
              {
                key: "K",
                label: "Novo Gasto",
                description: "Vai para criação de despesa",
              },
              {
                key: "I",
                label: "Nova Receita",
                description: "Vai para criação de receita",
              },
              {
                key: "T",
                label: "Tarefas",
                description: "Abre o quadro de tarefas",
              },
              { key: "C", label: "Agenda", description: "Abre o calendário" },
              {
                key: "R",
                label: "Relatórios",
                description: "Ver estatísticas detalhadas",
              },
              {
                key: "G",
                label: "Metas",
                description: "Ver suas metas de economia",
              },
              {
                key: "P",
                label: "Playground",
                description: "Simulações e projeções",
              },
              {
                key: "?",
                label: "Ajuda",
                description: "Mostra esta lista de atalhos",
              },
            ].map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between p-3 rounded-xl bg-foreground/5 border border-border/50 group hover:bg-primary/5 hover:border-primary/20 transition-all"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-tight text-foreground">
                    {shortcut.label}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {shortcut.description}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-background border-2 border-border shadow-sm font-mono text-sm font-black text-primary group-hover:border-primary/30">
                  {shortcut.key}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowShortcutsModal(false)}
              className="w-full"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
