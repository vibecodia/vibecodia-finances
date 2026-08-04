import {
  format,
  getDate,
  getDaysInMonth,
  isBefore,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import {
  AlertTriangle,
  Camera,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Pencil,
  Scissors,
  Sparkles,
  Sword,
  Trash2,
  X,
} from "lucide-react";
import React, { useState, useRef } from "react";

import { useLocalStorage } from "../hooks/trello/useLocalStorage";
import { Transaction, SavingsGoal } from "../types";
import { calculateBalances } from "../utils/balanceCalculations";
import {
  formatCurrency,
  filterTransactionsByMonth,
  formatPaymentMethod,
  getCurrentBrazilDate,
} from "../utils/helpers";
import { cn } from "../lib/utils";
import RecentTransactionsFloatingCard from "./RecentTransactionsFloatingCard";
import MonthSegmentedControl from "./MonthSegmentedControl";
import PageMargin from "./PageMargin";
import PencilUnderline from "./PencilUnderline";
import RuledPaper from "./RuledPaper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog";
import { useCurrencyInput } from "../hooks/useCurrencyInput";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { UINinjaOverlay } from "./UINinjaOverlay";

interface DashboardProps {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
}

// ─── AccountSlider ────────────────────────────────────────────────────────────

interface AccountSliderProps {
  label: string;
  income: number;
  spent: number;
  formatCurrency: (value: number) => string;
  daysPassed: number;
  totalDays: number;
  splitValue?: number;
  splitLabel?: string;
}

const AccountSlider: React.FC<AccountSliderProps> = ({
  label,
  income,
  spent,
  formatCurrency,
  daysPassed,
  totalDays,
  splitValue = 0,
  splitLabel,
}) => {
  const remaining = Math.max(0, income - spent);
  const hasIncome = income > 0;
  const balance = income - spent;

  const spentPct = hasIncome
    ? (Math.min(income, spent) / income) * 100
    : spent > 0
      ? 100
      : 0;

  const remainingPct = hasIncome
    ? (remaining / income) * 100
    : spent > 0
      ? 0
      : 100;

  // Split calculation
  const flexAmount = Math.min(remaining, splitValue);
  const flexPct = hasIncome ? (flexAmount / income) * 100 : 0;

  // Threshold de alerta
  const isWarning = spentPct >= 60 && spentPct < 80;
  const isDanger = spentPct >= 80;

  const statusLabel = isDanger ? "vai estourar" : isWarning ? "olha lá" : "ok";
  const statusColor = isDanger
    ? "text-pen"
    : isWarning
      ? "text-pen/70"
      : "text-ink/60";

  const avgDailySpent = daysPassed > 0 ? spent / daysPassed : 0;
  const daysRemaining = totalDays - daysPassed;
  const dailyBudget =
    daysRemaining > 0
      ? remaining / daysRemaining
      : daysRemaining === 0
        ? remaining
        : 0;

  return (
    <div className="space-y-2">
      {/* Header com status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{label}</span>
          {spent > 0 && (
            <span className="text-xs text-pencil font-mono italic">
              (média diária {formatCurrency(avgDailySpent)})
            </span>
          )}
        </div>
        <span className={cn("font-handwriting text-xs", statusColor)}>
          {statusLabel}
        </span>
      </div>

      {/* Barra: gasto da esquerda, disponível à direita */}
      <div className="w-full bg-rule rounded-full h-2.5 relative overflow-hidden">
        {/* Gasto */}
        <div
          className={cn(
            "absolute left-0 h-2.5 rounded-l-full transition-all duration-700 z-20",
            isDanger ? "bg-pen" : isWarning ? "bg-pen/60" : "bg-ink",
          )}
          style={{ width: `${spentPct}%` }}
        />
        {/* Disponível */}
        <div
          className="bg-ink/15 h-2.5 absolute right-0 rounded-r-full transition-all duration-700"
          style={{ width: `${remainingPct}%` }}
        />
        {/* Flex (extrema direita) */}
        {flexPct > 0 && (
          <div
            className="bg-highlight h-2.5 absolute right-0 rounded-r-full z-10 transition-all duration-700"
            style={{ width: `${flexPct}%` }}
          />
        )}
        {/* Linha divisória */}
        {spentPct > 0 && remainingPct > 0 && (
          <div
            className="absolute top-0 w-0.5 h-full bg-rule-strong z-30"
            style={{ left: `${spentPct}%`, transform: "translateX(-50%)" }}
          />
        )}
      </div>

      {/* Percentual usado abaixo da barra */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-xs text-pencil font-mono">
            {spentPct.toFixed(0)}% usado
          </span>
          {flexPct > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-ink rounded-full" />
                <span className="text-[11px] text-pencil font-mono">
                  mercado: {formatCurrency(remaining - flexAmount)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-highlight rounded-full border border-rule" />
                <span className="text-[11px] text-pencil font-mono">
                  {splitLabel || "flex"}: {formatCurrency(flexAmount)}
                </span>
              </div>
            </div>
          )}
        </div>
        {remaining > 0 && daysRemaining > 0 && (
          <span className="text-[11px] text-pencil font-mono">
            sugerido: {formatCurrency(dailyBudget)}/dia
          </span>
        )}
      </div>

      {/* Valores */}
      <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-rule">
        <div>
          <div className="text-sm font-bold text-ink tabular-nums">
            {formatCurrency(income)}
          </div>
          <div className="text-[10px] text-pencil font-mono">recebido</div>
        </div>
        <div>
          <div className="text-sm font-bold text-pen tabular-nums">
            {formatCurrency(spent)}
          </div>
          <div className="text-[10px] text-pencil font-mono">gasto</div>
        </div>
        <div>
          <div
            className={cn(
              "text-sm font-bold tabular-nums",
              balance >= 0 ? "text-ink" : "text-pen",
            )}
          >
            {formatCurrency(balance)}
          </div>
          <div className="text-[10px] text-pencil font-mono">saldo</div>
        </div>
      </div>
    </div>
  );
};

// ─── FlashSplitModal ──────────────────────────────────────────────────────────

interface FlashSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalBalance: number;
  currentFlex: number;
  onSave: (amount: number) => void;
  onRemove: () => void;
}

const FlashSplitModal: React.FC<FlashSplitModalProps> = ({
  isOpen,
  onClose,
  totalBalance,
  currentFlex,
  onSave,
  onRemove,
}) => {
  const { inputProps, numericValue, setNumericValue } =
    useCurrencyInput(currentFlex);

  React.useEffect(() => {
    if (isOpen) {
      setNumericValue(currentFlex);
    }
  }, [isOpen, currentFlex, setNumericValue]);

  const remainingMercado = totalBalance - numericValue;
  const isOverLimit = numericValue > totalBalance;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-pen" />
            Split saldo Flash
          </DialogTitle>
          <DialogDescription>
            Quanto do seu saldo Flash fica reservado para gastos Flex.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-5 rounded-lg bg-paperAlt border border-ruleStrong space-y-4">
            <div className="flex justify-between items-center text-xs text-pencil font-mono">
              <span className="flex items-center gap-2">
                <CreditCard className="w-3 h-3" />
                Saldo total Flash
              </span>
              <span className="text-sm tabular-nums text-ink">
                {formatCurrency(totalBalance)}
              </span>
            </div>

            <div className="h-3 w-full bg-rule rounded-full overflow-hidden relative">
              <div
                className="h-full bg-ink transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, (remainingMercado / totalBalance) * 100)}%`,
                }}
              />
              <div
                className="absolute top-0 h-full w-px bg-pen z-10"
                style={{
                  right: `${Math.min(100, (numericValue / totalBalance) * 100)}%`,
                }}
              />
            </div>

            <div className="flex justify-between items-end">
              <div className="space-y-0.5">
                <p className="text-[10px] text-pencil font-mono">mercado</p>
                <p className="text-sm font-bold text-ink tabular-nums">
                  {formatCurrency(Math.max(0, remainingMercado))}
                </p>
              </div>
              <div className="space-y-0.5 text-right">
                <p className="text-[10px] text-pencil font-mono">flex</p>
                <p className="text-sm font-bold text-pen tabular-nums">
                  {formatCurrency(numericValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-sm text-ink flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pen" />
                Informe o saldo Flex
              </label>
            </div>

            <div className="relative group">
              <Input
                {...inputProps}
                autoFocus
                className={cn(
                  "w-full bg-paperAlt border-2 rounded-lg p-6 text-4xl font-bold text-center transition-all focus:outline-none",
                  isOverLimit
                    ? "border-pen/50 text-pen"
                    : "border-ruleStrong text-ink focus:border-pen",
                )}
                placeholder="R$ 0,00"
              />
            </div>

            {isOverLimit && (
              <div className="flex items-center justify-center gap-2 text-pen mt-4">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-xs">o valor flex não pode superar o saldo total!</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center gap-6 sm:gap-8 pt-2">
          <Button
            onClick={onRemove}
            variant="ghost"
            size="sm"
            className="text-xs text-pen/70 hover:text-pen"
          >
            Remover split
          </Button>
          <Button
            onClick={() => onSave(numericValue)}
            disabled={isOverLimit || numericValue < 0}
            className="flex-1"
          >
            Confirmar saldo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  savingsGoals,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(
    getCurrentBrazilDate(),
  );
  const [showBalance, setShowBalance] = useLocalStorage(
    "dashboard_show_balance",
    true,
  );
  const [includeBenefits, setIncludeBenefits] = useLocalStorage(
    "dashboard_include_benefits",
    true,
  );
  const [isFlashSplit, setIsFlashSplit] = useLocalStorage(
    "dashboard_flash_is_split",
    false,
  );
  const [flashFlexAmount, setFlashFlexAmount] = useLocalStorage(
    "dashboard_flash_flex_amount",
    0,
  );
  const [cardHolderName, setCardHolderName] = useLocalStorage(
    "dashboard_card_holder_name",
    "a nossa família",
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(cardHolderName);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isUINinjaActive, setIsUINinjaActive] = useState(false);

  // Dashboard Layout Settings
  const [showIncomeExpenseBar] = useLocalStorage(
    "dashboard_show_income_expense_bar",
    true,
  );
  const [showBenefitsCard] = useLocalStorage(
    "dashboard_show_benefits_card",
    true,
  );
  const [showSavingsGoalsCard] = useLocalStorage(
    "dashboard_show_savings_goals_card",
    true,
  );
  const [recentTransactionsEnabled] = useLocalStorage(
    "recent_transactions_enabled",
    true,
  );

  const [customBg, setCustomBg] = useLocalStorage(
    "dashboard_background_image",
    "",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setCustomBg(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const resetBackground = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomBg("");
  };

  const uiNinjaSetting = localStorage.getItem("uiNinjaEnabled") === "true";

  const today = getCurrentBrazilDate();
  const isSelectedMonthCurrent =
    format(currentMonth, "yyyy-MM") === format(today, "yyyy-MM");
  const isSelectedMonthPast = isBefore(
    endOfMonth(currentMonth),
    startOfMonth(today),
  );

  const totalDays = getDaysInMonth(currentMonth);
  const daysPassed = isSelectedMonthCurrent
    ? getDate(today)
    : isSelectedMonthPast
      ? totalDays
      : 0;

  const transactionsForSelectedMonth = filterTransactionsByMonth(
    transactions,
    currentMonth,
  );
  const balanceData = calculateBalances(
    transactions,
    savingsGoals,
    currentMonth,
  );

  // --- Lógica para incluir ou não benefícios (Flash/Vero Card) no saldo total ---
  const isBenefitTransaction = (t: Transaction) => {
    const desc = t.description.toLowerCase();
    const cat = t.category.toLowerCase();
    const pm = t.paymentMethod ? formatPaymentMethod(t.paymentMethod) : "";

    if (t.type === "income") {
      return (
        desc.includes("flash") ||
        cat.includes("flash") ||
        pm === "Flash" ||
        desc.includes("vero") ||
        cat.includes("vero") ||
        pm === "Vero Card"
      );
    } else {
      return pm === "Flash" || pm === "Vero Card";
    }
  };

  const benefitTransactions = transactionsForSelectedMonth.filter((t) => {
    if (t.status === "deleted" || t.category === "Aporte" || !t.isPaid)
      return false;
    return isBenefitTransaction(t);
  });

  const totalBenefitBalance = benefitTransactions.reduce(
    (acc, t) => acc + (t.type === "income" ? t.amount : -t.amount),
    0,
  );

  const baseBalance = balanceData.adjustedBalance;
  // Apenas subtrai os benefícios se for o mês atual E o toggle estiver desligado
  const finalBalance =
    includeBenefits || !isSelectedMonthCurrent
      ? baseBalance
      : baseBalance - totalBenefitBalance;
  const displayBalance = Math.abs(finalBalance) < 0.001 ? 0 : finalBalance;

  const currentIncome = transactionsForSelectedMonth
    .filter((t) => t.type === "income" && t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  const expensesPaid = transactionsForSelectedMonth
    .filter((t) => t.type === "expense" && t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  const expensesUnpaid = transactionsForSelectedMonth
    .filter((t) => t.type === "expense" && !t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  const flashIncome = transactionsForSelectedMonth
    .filter(
      (t) =>
        t.type === "income" &&
        (t.description.toLowerCase().includes("flash") ||
          t.category.toLowerCase().includes("flash") ||
          (t.paymentMethod &&
            formatPaymentMethod(t.paymentMethod) === "Flash")),
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const flashSpent = transactionsForSelectedMonth
    .filter(
      (t) =>
        t.type === "expense" &&
        t.paymentMethod &&
        formatPaymentMethod(t.paymentMethod) === "Flash",
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const currentFlashBalance = flashIncome - flashSpent;

  const veroIncome = transactionsForSelectedMonth
    .filter(
      (t) =>
        t.type === "income" &&
        (t.description.toLowerCase().includes("vero") ||
          t.category.toLowerCase().includes("vero") ||
          (t.paymentMethod &&
            formatPaymentMethod(t.paymentMethod) === "Vero Card")),
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const veroSpent = transactionsForSelectedMonth
    .filter(
      (t) =>
        t.type === "expense" &&
        t.paymentMethod &&
        formatPaymentMethod(t.paymentMethod) === "Vero Card",
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const activeGoals = savingsGoals.filter((goal) => goal.status !== "deleted");
  const totalSavingsGoals = activeGoals.reduce(
    (sum, goal) => sum + goal.targetAmount,
    0,
  );
  const totalSaved = activeGoals.reduce(
    (sum, goal) => sum + goal.currentAmount,
    0,
  );

  return (
    <div className="relative max-w-6xl mx-auto space-y-6 pt-6 pb-24">
      <PageMargin />

      {uiNinjaSetting && (
        <UINinjaOverlay
          isVisible={isUINinjaActive}
          onComplete={() => setIsUINinjaActive(false)}
        />
      )}

      {/* Seletor de mês */}
      <div
        className="pt-2 pb-0 w-full flex items-center gap-3"
        id="tour-month-selector"
      >
        <div className="flex-1">
          <MonthSegmentedControl
            month={currentMonth}
            onChange={(newMonth) => setCurrentMonth(newMonth)}
          />
        </div>
        <div className="flex items-center">
          {uiNinjaSetting && (
            <Button
              onClick={() => setIsUINinjaActive(true)}
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-md border border-rule bg-paperAlt text-pencil hover:text-ink hover:border-ruleStrong transition-colors"
              title="UI Ninja Mode"
            >
              <Sword className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Dica de atalhos — desktop */}
      <div className="hidden lg:flex justify-end pr-4 -mt-2 mb-2">
        <p className="font-mono text-[11px] text-pencil/70">
          atalhos: <span className="text-pen">[d]</span> resumo ·{" "}
          <span className="text-pen">[?]</span> ajuda
        </p>
      </div>

      {/* Folha do Saldo — elemento-assinatura */}
      <RuledPaper
        id="tour-balance-card"
        holes
        margin
        rot={0.5}
        className="p-6 sm:p-8 leading-6"
      >
        <div className="pl-6 flex items-start justify-between mb-6">
          <p className="font-handwriting text-pencil">saldo do mês</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 flex items-center justify-center rounded-md border border-rule bg-paperAlt text-pencil hover:text-ink hover:border-ruleStrong transition-colors"
              title="Colar foto"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="w-10 h-10 flex items-center justify-center rounded-md border border-rule bg-paperAlt text-pencil hover:text-ink hover:border-ruleStrong transition-colors"
              title={showBalance ? "Esconder saldo" : "Mostrar saldo"}
            >
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
        />

        <div className="pl-6 mb-8">
          <p
            className={cn(
              "font-handwriting font-bold text-5xl sm:text-7xl tabular-nums -rotate-[1deg]",
              finalBalance < -0.001 ? "text-pen" : "text-ink",
            )}
          >
            {showBalance ? formatCurrency(displayBalance) : "••••••"}
          </p>
          <PencilUnderline className="mt-2 max-w-[360px]" />
          {finalBalance < -0.001 && (
            <p className="font-handwriting text-pen mt-3">
              não pode esquecer disso
            </p>
          )}
        </div>

        <div className="pl-6 flex items-end justify-between border-t border-rule pt-4 gap-4">
          <div className="space-y-3">
            <button
              onClick={() => {
                if (!isSelectedMonthCurrent) return;
                setIncludeBenefits(!includeBenefits);
              }}
              disabled={!isSelectedMonthCurrent}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-rule bg-paperAlt text-xs text-pencil hover:text-ink hover:border-ruleStrong transition-colors",
                !isSelectedMonthCurrent && "opacity-50 cursor-not-allowed",
              )}
              title={
                !isSelectedMonthCurrent
                  ? "Só no mês atual"
                  : includeBenefits
                    ? "Não contar os vales"
                    : "Contar os vales"
              }
            >
              <span>
                {includeBenefits
                  ? "contando os vales"
                  : "só dinheiro da conta"}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <p className="font-handwriting text-xs text-pencil">assinatura</p>
              {!isEditingName && (
                <button
                  onClick={() => {
                    setIsEditingName(true);
                    setTempName(cardHolderName);
                  }}
                  className="p-1 hover:bg-ink/5 rounded-full transition-colors"
                  title="Editar nome"
                >
                  <Pencil className="w-3 h-3 text-pencil" />
                </button>
              )}
            </div>

            <div className="min-h-[24px] flex items-center">
              {isEditingName ? (
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    id="card-holder-input"
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value.slice(0, 100))}
                    className="bg-paperAlt border border-rule rounded px-2 py-0.5 text-sm font-handwriting text-ink focus:outline-none focus:border-pen w-full max-w-[200px]"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    maxLength={100}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setCardHolderName(tempName);
                        setIsEditingName(false);
                      } else if (e.key === "Escape") {
                        setIsEditingName(false);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      setCardHolderName(tempName);
                      setIsEditingName(false);
                    }}
                    className="p-1 hover:bg-pen/10 rounded-full text-pen"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="p-1 hover:bg-ink/5 rounded-full text-pencil"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="font-handwriting text-sm text-ink">
                  {cardHolderName}
                </p>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="font-mono text-xs text-pencil tabular-nums">
              {format(currentMonth, "MM/yyyy")}
            </p>
          </div>
        </div>

        {/* Foto grampeada */}
        {customBg && (
          <div className="absolute top-16 right-6 z-10 rotate-2 hidden sm:block">
            <div className="relative bg-paperAlt p-2 pb-7 border border-ruleStrong shadow-paper">
              <img
                src={customBg}
                alt="foto do caderno"
                className="w-24 h-24 object-cover"
              />
              <svg
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-5 text-pencil"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 8 L12 2 L21 8" />
              </svg>
              <button
                onClick={resetBackground}
                className="absolute -bottom-1 right-1 text-[10px] text-pencil hover:text-pen"
              >
                remover
              </button>
            </div>
          </div>
        )}
      </RuledPaper>

      {/* Entradas e saídas */}
      {showIncomeExpenseBar && (
        <RuledPaper
          id="tour-income-expense-bar"
          className="p-6 leading-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-handwriting text-lg text-ink">
                entradas e saídas
              </h2>
              <PencilUnderline className="mt-1 max-w-[160px]" />
            </div>
            <div className="hidden sm:flex items-center gap-4 font-mono text-xs text-pencil">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-ink rounded-full" /> receitas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-pen rounded-full" /> pagas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-pencil rounded-full" /> a pagar
              </span>
            </div>
          </div>

          <div className="w-full bg-rule rounded-full h-3 relative overflow-hidden">
            <div
              className="bg-ink h-3 transition-all duration-700 absolute left-0"
              style={{
                width: `${currentIncome > 0 ? (currentIncome / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-pen h-3 transition-all duration-700 absolute"
              style={{
                left: `${currentIncome > 0 ? (currentIncome / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`,
                width: `${expensesPaid > 0 ? (expensesPaid / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-pencil h-3 transition-all duration-700 absolute"
              style={{
                left: `${currentIncome + expensesPaid > 0 ? ((currentIncome + expensesPaid) / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`,
                width: `${expensesUnpaid > 0 ? (expensesUnpaid / (currentIncome + expensesPaid + expensesUnpaid)) * 100 : 0}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <div className="text-lg font-bold text-ink tabular-nums">
                {currentIncome > 0
                  ? (
                      (currentIncome /
                        (currentIncome + expensesPaid + expensesUnpaid)) *
                      100
                    ).toFixed(1)
                  : "0"}
                %
              </div>
              <div className="text-xs text-pencil font-mono">
                {formatCurrency(currentIncome)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-pen tabular-nums">
                {expensesPaid > 0
                  ? (
                      (expensesPaid /
                        (currentIncome + expensesPaid + expensesUnpaid)) *
                      100
                    ).toFixed(1)
                  : "0"}
                %
              </div>
              <div className="text-xs text-pencil font-mono">
                {formatCurrency(expensesPaid)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-pencil tabular-nums">
                {expensesUnpaid > 0
                  ? (
                      (expensesUnpaid /
                        (currentIncome + expensesPaid + expensesUnpaid)) *
                      100
                    ).toFixed(1)
                  : "0"}
                %
              </div>
              <div className="text-xs text-pencil font-mono">
                {formatCurrency(expensesUnpaid)}
              </div>
            </div>
          </div>
        </RuledPaper>
      )}

      {/* Vales do mês + Metas */}
      {(showBenefitsCard || (showSavingsGoalsCard && savingsGoals.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showBenefitsCard && (
            <RuledPaper className="p-6 leading-6">
              <h2 className="font-handwriting text-lg text-ink mb-4">
                vales do mês
              </h2>
              <div className="space-y-4">
                <AccountSlider
                  label="Flash"
                  income={flashIncome}
                  spent={flashSpent}
                  formatCurrency={formatCurrency}
                  daysPassed={daysPassed}
                  totalDays={totalDays}
                  splitValue={isFlashSplit ? flashFlexAmount : 0}
                  splitLabel="Flex"
                />

                <div className="flex justify-end items-center gap-4 px-1">
                  {isFlashSplit && (
                    <Button
                      onClick={() => setIsSplitModalOpen(true)}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-pencil hover:text-ink"
                      title="Ajustar Split"
                    >
                      <Pencil className="w-3 h-3 mr-1.5" />
                      ajustar
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      if (isFlashSplit) {
                        setFlashFlexAmount(0);
                        setIsFlashSplit(false);
                      } else {
                        setIsSplitModalOpen(true);
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-xs transition-colors",
                      isFlashSplit
                        ? "text-pen hover:text-pen"
                        : "text-pencil hover:text-ink",
                    )}
                  >
                    {isFlashSplit ? (
                      <Trash2 className="w-3 h-3 mr-1.5" />
                    ) : (
                      <Scissors className="w-3 h-3 mr-1.5" />
                    )}
                    {isFlashSplit ? "remover split" : "split flex"}
                  </Button>
                </div>

                <div className="border-t border-rule" />

                <AccountSlider
                  label="Vero Card"
                  income={veroIncome}
                  spent={veroSpent}
                  formatCurrency={formatCurrency}
                  daysPassed={daysPassed}
                  totalDays={totalDays}
                />
              </div>
            </RuledPaper>
          )}

          {showSavingsGoalsCard && savingsGoals.length > 0 && (
            <RuledPaper className="p-6 leading-6">
              <h2 className="font-handwriting text-lg text-ink mb-4">metas</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink">progresso total</span>
                  <span className="font-mono text-pencil tabular-nums">
                    {formatCurrency(totalSaved)} /{" "}
                    {formatCurrency(totalSavingsGoals)}
                  </span>
                </div>
                <div className="w-full bg-rule rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 bg-ink rounded-full transition-all duration-500"
                    style={{
                      width: `${totalSavingsGoals > 0 ? (totalSaved / totalSavingsGoals) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-pencil font-mono">
                  {totalSavingsGoals > 0
                    ? Math.round((totalSaved / totalSavingsGoals) * 100)
                    : 0}
                  % concluído
                </div>
              </div>
            </RuledPaper>
          )}
        </div>
      )}

      {/* Modal de Split do Flash */}
      <FlashSplitModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        totalBalance={currentFlashBalance}
        currentFlex={flashFlexAmount}
        onSave={(amount: number) => {
          setFlashFlexAmount(amount);
          setIsFlashSplit(true);
          setIsSplitModalOpen(false);
        }}
        onRemove={() => {
          setFlashFlexAmount(0);
          setIsFlashSplit(false);
          setIsSplitModalOpen(false);
        }}
      />

      {recentTransactionsEnabled && (
        <RecentTransactionsFloatingCard transactions={transactions} />
      )}
    </div>
  );
};

export default Dashboard;
