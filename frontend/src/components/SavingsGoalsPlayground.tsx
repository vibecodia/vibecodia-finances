import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  TooltipItem,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  LineController,
  BarController,
  DoughnutController,
  PieController,
  ScatterController,
  Filler,
} from "chart.js";
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  format,
  differenceInDays,
  subDays,
  addDays,
} from "date-fns";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  PieChart as PieChartIcon,
  Calculator,
  CheckCircle2,
  Eye,
  Filter,
  Info,
  Maximize2,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Printer,
  Target,
  Trash2,
  TrendingUp,
  PlusCircle,
} from "lucide-react";
import React, { useState, useMemo, useRef } from "react";
import { Doughnut, Line, Scatter } from "react-chartjs-2";

import { useTheme } from "../contexts/ThemeContext";
import { useLocalStorage } from "../hooks/trello/useLocalStorage";
import { useCurrencyInput } from "../hooks/useCurrencyInput";
import { cn } from "../lib/utils";
import { SavingsGoal, Transaction, Category } from "../types";
import {
  formatCurrency,
  formatBrazilDate,
  getCurrentBrazilDate,
  parseLocalDate,
  getBrazilDateString,
} from "../utils/helpers";

import DateRangePicker from "./DateRangePicker";
import TransactionForm from "./TransactionForm";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";

// Categoria/meio de pagamento podem ser objeto populado (modo autenticado) ou
// string (modo guest / dados legados). Esses helpers extraem o texto em
// minúsculas para os heurísticos do simulador sem quebrar com Category.
const categoryText = (c?: string | Category): string => {
  if (!c) return "";
  if (typeof c === "object")
    return `${c.name || ""} ${c.code || ""}`.toLowerCase();
  return String(c).toLowerCase();
};

const paymentMethodText = (p?: string | Category): string => {
  if (!p) return "";
  if (typeof p === "object")
    return `${p.name || ""} ${p.code || ""}`.toLowerCase();
  return String(p).toLowerCase();
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  LineController,
  BarController,
  DoughnutController,
  PieController,
  ScatterController,
  Filler,
);

interface DailyBalanceItem {
  date: string;
  revenues: number;
  expenses: number;
  total: number;
  balance?: number;
  openingBalance?: number;
  isNegative?: boolean;
  [key: string]: unknown;
}

interface SavingsGoalsPlaygroundProps {
  savingsGoals: SavingsGoal[];
  transactions: Transaction[];
  onAddTransaction?: (
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ) => Promise<Transaction>;
}

interface LayoutItem {
  id: string;
  label: string;
  collapsed: boolean;
  number: number;
}

const DEFAULT_LAYOUT: LayoutItem[] = [
  {
    id: "financial_simulators",
    label: "Simuladores Financeiros",
    collapsed: false,
    number: 1,
  },
  {
    id: "goals_countdown",
    label: "Contagem Regressiva de Metas",
    collapsed: false,
    number: 2,
  },
  {
    id: "contribution_timeline",
    label: "Linha do Tempo de Aportes",
    collapsed: true,
    number: 3,
  },
  {
    id: "goals_distribution",
    label: "Distribuição de Metas",
    collapsed: true,
    number: 4,
  },
  {
    id: "contribution_table",
    label: "Tabela de Aportes",
    collapsed: true,
    number: 5,
  },
  {
    id: "savings_vs_income",
    label: "Taxa de Poupança vs Receita",
    collapsed: true,
    number: 6,
  },
  {
    id: "priority_matrix",
    label: "Matriz de Prioridade",
    collapsed: true,
    number: 7,
  },
];

const SavingsGoalsPlayground: React.FC<SavingsGoalsPlaygroundProps> = ({
  savingsGoals,
  transactions,
  onAddTransaction,
}) => {
  const { theme } = useTheme();
  const [layout, setLayout] = useLocalStorage<LayoutItem[]>(
    "savings_playground_layout_v2",
    DEFAULT_LAYOUT,
  );
  const [showFilters, setShowFilters] = useLocalStorage<boolean>(
    "savings_playground_show_filters",
    true,
  );
  const [isSimCardCollapsed, setIsSimCardCollapsed] = useLocalStorage<boolean>(
    "savings_playground_sim_collapsed",
    false,
  );

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [countdownSimGoalId, setCountdownSimGoalId] = useState<string | null>(
    null,
  );
  const [countdownSimExtra, setCountdownSimExtra] = useState<number>(0);
  const [showAporteForm, setShowAporteForm] = useState(false);
  const [isSimInputFocused, setIsSimInputFocused] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [projectionDays, setProjectionDays] = useState<number>(5);
  const [projectionView, setProjectionView] = useState<"current" | "forward">(
    "current",
  );
  const [timeTravelDate, setTimeTravelDate] = useState<string | null>(null);
  const [catastrophicAmount] = useState<number>(0);
  const [catastrophicName, setCatastrophicName] = useState<string>("");

  const {
    inputProps: countdownSimExtraInputProps,
    numericValue: countdownSimExtraValue,
  } = useCurrencyInput(countdownSimExtra);
  const {
    inputProps: catastrophicAmountInputProps,
    numericValue: catastrophicAmountValue,
  } = useCurrencyInput(catastrophicAmount);

  const simulationRef = useRef<HTMLDivElement>(null);

  const handlePrintSimulation = () => {
    if (!simulationRef.current) return;

    const printWindow = window.open("", "", "height=800,width=1000");
    if (!printWindow) return;

    const isForward = projectionView === "forward";
    const reportTitle = isForward
      ? "Relatório de Projeção Financeira"
      : "Relatório de Fluxo do Período Filtrado";
    const viewLabel = isForward ? "Dias seguintes ao filtro" : "Filtro Atual";
    const goalName = countdownSimGoal?.name || "Nenhuma meta selecionada";

    const dailyData = isForward ? nextDaysData : currentPeriodDailyData;
    const finalBalance = isForward
      ? nextDaysData.total
      : countdownSimAvailableEndOfMonth;

    // --- CÁLCULO DE DADOS ATUAIS (SEM TIME TRAVEL) PARA COMPARAÇÃO ---
    const actualTotals = timeTravelDate
      ? (() => {
          const dayBeforeStart = format(
            subDays(parseLocalDate(startDate), 1),
            "yyyy-MM-dd",
          );

          const paidTransactionsBefore = transactions.filter((t) => {
            if (
              t.status === "deleted" ||
              categoryText(t.category).includes("aporte") ||
              !t.isPaid
            )
              return false;
            return t.date.slice(0, 10) <= dayBeforeStart;
          });

          const totalIncomeBefore = paidTransactionsBefore
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);

          const totalExpensesBefore = paidTransactionsBefore
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);

          const totalBalanceBefore = totalIncomeBefore - totalExpensesBefore;

          const totalGoalsImpactBefore = activeGoals.reduce((total, goal) => {
            const goalTotal = (goal.contributions || []).reduce(
              (sum, contribution) => {
                if (contribution.status === "deleted" || !contribution.isPaid)
                  return sum;
                const cDate = contribution.date.slice(0, 10);
                return (
                  sum + (cDate <= dayBeforeStart ? contribution.amount : 0)
                );
              },
              0,
            );
            return total + goalTotal;
          }, 0);

          const previousBalanceAdjusted =
            totalBalanceBefore - totalGoalsImpactBefore;

          const revenues = transactions
            .filter((t) => {
              const tDateStr = t.date.slice(0, 10);
              return (
                t.type === "income" &&
                t.status === "active" &&
                tDateStr >= startDate &&
                tDateStr <= endDate &&
                !t.description?.toLowerCase().includes("vero") &&
                !categoryText(t.category).includes("vero") &&
                !t.description?.toLowerCase().includes("flash") &&
                !categoryText(t.category).includes("flash")
              );
            })
            .reduce((sum, t) => sum + t.amount, 0);

          const expenses = transactions
            .filter((t) => {
              const tDateStr = t.date.slice(0, 10);
              return (
                t.type === "expense" &&
                t.status === "active" &&
                !categoryText(t.category).includes("aporte") &&
                !paymentMethodText(t.paymentMethod).includes("vero") &&
                !paymentMethodText(t.paymentMethod).includes("flash") &&
                tDateStr >= startDate &&
                tDateStr <= endDate
              );
            })
            .reduce((sum, t) => sum + t.amount, 0);

          const realContributions = transactions
            .filter((t) => {
              const tDateStr = t.date.slice(0, 10);
              return (
                t.type === "expense" &&
                t.isPaid === true &&
                t.status === "active" &&
                tDateStr >= startDate &&
                tDateStr <= endDate &&
                categoryText(t.category).includes("aporte")
              );
            })
            .reduce((sum, t) => sum + t.amount, 0);

          const actualNet =
            previousBalanceAdjusted +
            revenues -
            expenses -
            realContributions -
            catastrophicAmountValue;
          const actualGoalAmount = countdownSimGoal
            ? countdownSimGoal.currentAmount
            : 0;

          // Cálculo de Saldos Diários Atuais para Comparação
          const dailyStart = isForward
            ? addDays(parseLocalDate(endDate), 1)
            : parseLocalDate(startDate);
          const dailyDaysCount = isForward
            ? projectionDays
            : differenceInDays(
                parseLocalDate(endDate),
                parseLocalDate(startDate),
              ) + 1;
          const actualDailyData: Record<
            string,
            {
              balance: number;
              revenues: number;
              expenses: number;
              divergingItems: string[];
            }
          > = {};
          let runningDailyBalance = isForward
            ? actualNet - countdownSimExtraValue
            : previousBalanceAdjusted;

          for (let i = 0; i < dailyDaysCount; i++) {
            const currentDay = addDays(dailyStart, i);
            const currentDayStr = format(currentDay, "yyyy-MM-dd");

            // Itens que divergem: Transações criadas APÓS a data de congelamento
            const cutoff = new Date(timeTravelDate + "T23:59:59");
            const divergingTransactions = transactions.filter((t) => {
              const tDateStr = t.date.slice(0, 10);
              const desc = t.description?.toLowerCase() || "";
              const cat = categoryText(t.category) || "";
              const pm = paymentMethodText(t.paymentMethod) || "";

              return (
                tDateStr === currentDayStr &&
                t.status === "active" &&
                new Date(t.createdAt) > cutoff &&
                !desc.includes("vero") &&
                !cat.includes("vero") &&
                !pm.includes("vero") &&
                !desc.includes("flash") &&
                !cat.includes("flash") &&
                !pm.includes("flash") &&
                !(cat.includes("aporte") && !t.isPaid)
              );
            });

            const divergingDescriptions = divergingTransactions.map(
              (t) =>
                `${t.type === "income" ? "[+]" : "[-]"} ${t.description || "Sem descrição"} (${t.category}): ${formatCurrency(t.amount)}`,
            );

            const dayRevenues = transactions
              .filter((t) => {
                const tDateStr = t.date.slice(0, 10);
                const desc = t.description?.toLowerCase() || "";
                const cat = categoryText(t.category) || "";
                const pm = paymentMethodText(t.paymentMethod) || "";

                return (
                  t.type === "income" &&
                  t.status === "active" &&
                  tDateStr === currentDayStr &&
                  !desc.includes("vero") &&
                  !cat.includes("vero") &&
                  !pm.includes("vero") &&
                  !desc.includes("flash") &&
                  !cat.includes("flash") &&
                  !pm.includes("flash")
                );
              })
              .reduce((sum, t) => sum + t.amount, 0);

            const dayExpenses = transactions
              .filter((t) => {
                const tDateStr = t.date.slice(0, 10);
                const cat = categoryText(t.category) || "";
                const pm = paymentMethodText(t.paymentMethod) || "";
                const desc = t.description?.toLowerCase() || "";

                return (
                  t.type === "expense" &&
                  t.status === "active" &&
                  tDateStr === currentDayStr &&
                  !cat.includes("aporte") &&
                  !pm.includes("vero") &&
                  !desc.includes("vero") &&
                  !cat.includes("vero") &&
                  !pm.includes("flash") &&
                  !desc.includes("flash") &&
                  !cat.includes("flash")
                );
              })
              .reduce((sum, t) => sum + t.amount, 0);

            const dayContributions = transactions
              .filter((t) => {
                const tDateStr = t.date.slice(0, 10);
                return (
                  t.type === "expense" &&
                  t.isPaid === true &&
                  t.status === "active" &&
                  tDateStr === currentDayStr &&
                  categoryText(t.category).includes("aporte")
                );
              })
              .reduce((sum, t) => sum + t.amount, 0);

            runningDailyBalance =
              runningDailyBalance +
              dayRevenues -
              dayExpenses -
              dayContributions;
            actualDailyData[currentDayStr] = {
              balance: runningDailyBalance,
              revenues: dayRevenues,
              expenses: dayExpenses + dayContributions,
              divergingItems: divergingDescriptions,
            };
          }

          return {
            revenues,
            expenses,
            realContributions,
            net: actualNet,
            goalAmount: actualGoalAmount,
            dailyData: actualDailyData,
          };
        })()
      : null;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; background: white; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header h1 { margin: 0; color: #3b82f6; font-size: 24px; }
            .header p { margin: 5px 0 0 0; opacity: 0.7; font-size: 12px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; background: #3b82f6; color: white; margin-top: 10px; }
            .badge-amber { background: #f59e0b; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; background: #f8fafc; position: relative; overflow: hidden; }
            .card-title { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 10px; letter-spacing: 0.05em; }
            .value { font-size: 24px; font-weight: 900; color: #3b82f6; }
            .sub-value { font-size: 12px; color: #64748b; margin-top: 5px; }
            .details { font-size: 11px; margin-top: 15px; font-family: monospace; color: #64748b; }
            
            /* Estilos para Comparação */
            .comparison-grid { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px; }
            .comp-card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; background: white; }
            .comp-label { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
            .comp-values { display: flex; flex-direction: column; gap: 4px; }
            .comp-item { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
            .comp-item .frozen { color: #f59e0b; font-weight: 700; }
            .comp-item .actual { color: #3b82f6; font-weight: 700; }
            .comp-diff { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 900; }
            .diff-pos { background: #dcfce7; color: #166534; }
            .diff-neg { background: #fee2e2; color: #991b1b; }
            .diff-neutral { background: #f1f5f9; color: #475569; }

            .projection-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .projection-table th { text-align: left; font-size: 10px; color: #64748b; padding: 8px; border-bottom: 1px solid #e2e8f0; }
            .projection-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
            .projection-table .date { font-weight: 700; color: #3b82f6; }
            .projection-table .amount { font-family: monospace; font-weight: 700; text-align: right; }
            .pessimist-note { margin-top: 20px; padding: 15px; background: #fff1f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; }
            .alert-box { margin-top: 20px; padding: 15px; background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; color: #b91c1c; font-weight: 700; text-align: center; }
            .no-print-btn { 
              position: fixed; top: 20px; right: 20px; padding: 10px 20px; 
              background: #3b82f6; color: white; border: none; border-radius: 8px; 
              font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            @media print { 
              body { padding: 0; } 
              .card, .comp-card { break-inside: avoid; } 
              .no-print-btn { display: none; }
            }
          </style>
        </head>
        <body style="color: #1e293b; background: white;">
          <button class="no-print-btn" onclick="window.print()">IMPRIMIR PDF</button>
          
          <div class="header">
            <div>
              <h1>${reportTitle}</h1>
              <div class="badge">${viewLabel}</div>
              ${timeTravelDate ? `<div class="badge badge-amber">⏳ MODO TIME TRAVEL: ATÉ ${formatBrazilDate(parseLocalDate(timeTravelDate), "dd/MM/yyyy")}</div>` : ""}
              <p>Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
              <p>Período Base: ${formatBrazilDate(parseLocalDate(startDate), "dd/MM/yyyy")} até ${formatBrazilDate(parseLocalDate(endDate), "dd/MM/yyyy")}</p>
            </div>
            <div style="text-align: right">
              <div style="font-size: 10px; font-weight: 900; color: #64748b;">META SELECIONADA</div>
              <div style="font-weight: 700;">${goalName}</div>
            </div>
          </div>

          ${
            actualTotals
              ? `
            <div style="margin-bottom: 10px; font-size: 10px; font-weight: 900; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em;">
              📊 Comparativo: Congelado (${formatBrazilDate(parseLocalDate(timeTravelDate!), "dd/MM/yyyy")}) vs. Hoje (${format(new Date(), "dd/MM/yyyy")})
            </div>
            <div class="comparison-grid">
              <div class="comp-card">
                <div class="comp-label">Saldo Final</div>
                <div class="comp-values">
                  <div class="comp-item"><span>Congelado:</span> <span class="frozen">${formatCurrency(finalBalance)}</span></div>
                  <div class="comp-item"><span>Atual:</span> <span class="actual">${formatCurrency(actualTotals.net)}</span></div>
                  <div style="margin-top: 8px; text-align: right;">
                    <span class="comp-diff ${actualTotals.net - finalBalance >= 0 ? "diff-pos" : "diff-neg"}">
                      ${actualTotals.net - finalBalance >= 0 ? "▲" : "▼"} ${formatCurrency(Math.abs(actualTotals.net - finalBalance))}
                    </span>
                  </div>
                </div>
              </div>

              <div class="comp-card">
                <div class="comp-label">Receitas / Despesas</div>
                <div class="comp-values">
                  <div class="comp-item"><span>Rec. (Cong.):</span> <span class="frozen">${formatCurrency(monthlyTotals.revenues)}</span></div>
                  <div class="comp-item"><span>Rec. (Atual):</span> <span class="actual">${formatCurrency(actualTotals.revenues)}</span></div>
                  <div class="comp-item" style="margin-top: 4px;"><span>Desp. (Cong.):</span> <span class="frozen">${formatCurrency(monthlyTotals.expenses + monthlyTotals.realContributions)}</span></div>
                  <div class="comp-item"><span>Desp. (Atual):</span> <span class="actual">${formatCurrency(actualTotals.expenses + actualTotals.realContributions)}</span></div>
                </div>
              </div>

              <div class="comp-card">
                <div class="comp-label">Progresso da Meta</div>
                <div class="comp-values">
                  <div class="comp-item"><span>Valor (Cong.):</span> <span class="frozen">${formatCurrency(countdownSimGoal ? countdownSimGoal.currentAmount + countdownSimExtraValue : 0)}</span></div>
                  <div class="comp-item"><span>Valor (Atual):</span> <span class="actual">${formatCurrency(actualTotals.goalAmount)}</span></div>
                  <div style="margin-top: 8px; text-align: right;">
                    <span class="comp-diff ${actualTotals.goalAmount - (countdownSimGoal ? countdownSimGoal.currentAmount + countdownSimExtraValue : 0) >= 0 ? "diff-pos" : "diff-neg"}">
                      ${actualTotals.goalAmount - (countdownSimGoal ? countdownSimGoal.currentAmount + countdownSimExtraValue : 0) >= 0 ? "▲" : "▼"} ${formatCurrency(Math.abs(actualTotals.goalAmount - (countdownSimGoal ? countdownSimGoal.currentAmount + countdownSimExtraValue : 0)))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          `
              : ""
          }

          <div class="grid">
            <div class="card" ${timeTravelDate ? 'style="border-color: #f59e0b; background: #fffbeb;"' : ""}>
              ${timeTravelDate ? '<div style="position: absolute; top: 0; right: 0; background: #f59e0b; color: white; font-size: 7px; font-weight: 900; padding: 2px 8px; border-bottom-left-radius: 8px; text-transform: uppercase;">Congelado</div>' : ""}
              <div class="card-title">Impacto na Meta</div>
              <div class="value" ${timeTravelDate ? 'style="color: #d97706"' : ""}>${formatCurrency(countdownSimGoal ? countdownSimGoal.currentAmount + countdownSimExtraValue : 0)}</div>
              <div class="sub-value">Alvo: ${formatCurrency(countdownSimGoal?.targetAmount || 0)}</div>
              <div class="sub-value" style="color: #10b981; font-weight: 700;">
                ${countdownSimIsGoalAchieved ? "✅ Meta Atingida!" : `Restam ${formatCurrency((countdownSimGoal?.targetAmount || 0) - (countdownSimGoal ? countdownSimGoal.currentAmount + countdownSimExtraValue : 0))}`}
              </div>
            </div>
            <div class="card" ${timeTravelDate ? 'style="border-color: #f59e0b; background: #fffbeb;"' : ""}>
              ${timeTravelDate ? '<div style="position: absolute; top: 0; right: 0; background: #f59e0b; color: white; font-size: 7px; font-weight: 900; padding: 2px 8px; border-bottom-left-radius: 8px; text-transform: uppercase;">Congelado</div>' : ""}
              <div class="card-title">Disponibilidade Final ${isForward ? `D+${projectionDays}` : "do Período"}</div>
              <div class="value" ${timeTravelDate ? 'style="color: #d97706"' : ""}>${formatCurrency(finalBalance)}</div>
              <div class="details">
                Saldo Base: ${formatCurrency(isForward ? nextDaysData.baseBalance : monthlyTotals.previousMonthAdjustedBalance)}<br>
                + Receitas: ${formatCurrency(isForward ? nextDaysData.revenues : monthlyTotals.revenues)}<br>
                - Despesas: ${formatCurrency(isForward ? nextDaysData.expenses : monthlyTotals.expenses + monthlyTotals.realContributions)}<br>
                - Aportes Simulados: ${formatCurrency(countdownSimExtraValue)}
                ${catastrophicAmountValue > 0 ? `<br>- Extra (${catastrophicName || "Cenário Pessimista"}): ${formatCurrency(catastrophicAmountValue)}` : ""}
              </div>
            </div>
          </div>

          ${
            dailyData.negativeCount > 0
              ? `
            <div class="alert-box">
              🚨 ALERTA CRÍTICO: Detectado ${dailyData.negativeCount} ${dailyData.negativeCount === 1 ? "dia" : "dias"} com saldo negativo no período.
            </div>
          `
              : ""
          }

          ${
            catastrophicAmountValue > 0
              ? `
            <div class="pessimist-note">
              <strong>Cenário Pessimista Ativo:</strong> Foi simulado um gasto extra de <strong>${formatCurrency(catastrophicAmountValue)}</strong> 
              ${catastrophicName ? ` para "<em>${catastrophicName}</em>"` : ""}.
            </div>
          `
              : ""
          }

          <div class="card" style="margin-top: 20px;">
            <div class="card-title">${isForward ? `Projeção Diária (Próximos ${projectionDays} dias)` : "Fluxo Diário do Período"}</div>
            <table class="projection-table">
              <thead>
                <tr>
                  <th>DATA</th>
                  <th style="text-align: right">MOVIMENTAÇÃO</th>
                  ${actualTotals ? "<th>ITEM QUE DIVERGE</th>" : ""}
                  <th style="text-align: right">SALDO ${actualTotals ? "(CONGELADO)" : "ACUMULADO"}</th>
                  ${actualTotals ? '<th style="text-align: right">SALDO REAL (HOJE)</th><th style="text-align: right">DIFERENÇA</th>' : ""}
                </tr>
              </thead>
              <tbody>
                ${dailyData.dailyBalances
                  .map((day: DailyBalanceItem) => {
                    const actualDayData = actualTotals?.dailyData[day.date];
                    const actualDayBalance = actualDayData?.balance;
                    const diff =
                      actualDayBalance !== undefined
                        ? actualDayBalance - day.total
                        : null;

                    return `
                  <tr>
                    <td class="date">${formatBrazilDate(parseLocalDate(day.date), "dd/MM/yyyy")}</td>
                    <td style="text-align: right; font-size: 10px;">
                      ${day.revenues > 0 ? `<span style="color: #10b981">+${formatCurrency(day.revenues)}</span>` : ""}
                      ${day.expenses > 0 ? `<span style="color: #ef4444">-${formatCurrency(day.expenses)}</span>` : ""}
                      ${day.revenues === 0 && day.expenses === 0 ? "-" : ""}
                    </td>
                    ${
                      actualTotals
                        ? `
                      <td style="font-size: 9px; max-width: 150px; color: #64748b;">
                        ${
                          actualDayData &&
                          actualDayData.divergingItems.length > 0
                            ? actualDayData.divergingItems.join("<br>")
                            : "-"
                        }
                      </td>
                    `
                        : ""
                    }
                    <td class="amount" style="color: ${day.total < 0 ? "#ef4444" : actualTotals ? "#d97706" : "#10b981"}">
                      ${formatCurrency(day.total)}
                      ${day.isNegative ? '<br><span style="font-size: 8px; text-transform: uppercase;">⚠️ Negativo</span>' : ""}
                    </td>
                    ${
                      actualTotals && actualDayBalance !== undefined
                        ? `
                      <td class="amount" style="color: ${actualDayBalance < 0 ? "#ef4444" : "#3b82f6"}">
                        ${formatCurrency(actualDayBalance)}
                      </td>
                      <td class="amount" style="font-size: 10px;">
                        <span class="comp-diff ${diff! >= 0 ? (diff! === 0 ? "diff-neutral" : "diff-pos") : "diff-neg"}">
                          ${diff! > 0 ? "▲" : diff! < 0 ? "▼" : "="} ${formatCurrency(Math.abs(diff!))}
                        </span>
                      </td>
                    `
                        : ""
                    }
                  </tr>
                `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>

          <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px;">
            Vibecodia Finances - Planejamento com Liberdade
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
  };

  const simChartRef = useRef<ChartJS | null>(null);
  const timelineChartRef = useRef<ChartJS | null>(null);
  const distributionChartRef = useRef<ChartJS | null>(null);
  const savingsVsIncomeChartRef = useRef<ChartJS | null>(null);
  const matrixChartRef = useRef<ChartJS | null>(null);

  const toggleAll = (
    chartRef:
      | React.RefObject<ChartJS | null>
      | React.MutableRefObject<ChartJS | null>,
  ) => {
    const chart = chartRef.current;
    if (!chart || !chart.config) return;

    const isPieOrDoughnut = ["pie", "doughnut"].includes(
      (chart.config as { type?: string }).type || "",
    );

    if (isPieOrDoughnut) {
      const metadata = chart.getDatasetMeta(0);
      if (!metadata || !metadata.data) return;

      const allVisible = metadata.data.every(
        (_val: unknown, index: number) => chart.getDataVisibility(index) === true,
      );

      metadata.data.forEach((_val: unknown, index: number) => {
        if (allVisible) {
          chart.toggleDataVisibility(index);
        } else {
          if (chart.getDataVisibility(index) === false) {
            chart.toggleDataVisibility(index);
          }
        }
      });
    } else {
      if (!chart.data || !chart.data.datasets) return;
      const allVisible = chart.data.datasets.every((_ds: unknown, index: number) =>
        chart.isDatasetVisible(index),
      );

      chart.data.datasets.forEach((_ds: unknown, index: number) => {
        chart.setDatasetVisibility(index, !allVisible);
      });
    }
    chart.update();
  };

  // Simulator State
  const [simInitialAmount, setSimInitialAmount] = useState<number>(0);
  const [simMonthlyAmount] = useState<number>(500);
  const [simInterestRate, setSimInterestRate] = useState<number>(1);
  const [simPeriod, setSimPeriod] = useState<number>(12);
  const [simMode, setSimMode] = useState<"investment" | "goal_reach">(
    "investment",
  );
  const [simTargetGoalId, setSimTargetGoalId] = useState<string | null>(null);

  const {
    inputProps: simInitialAmountInputProps,
    numericValue: simInitialAmountValue,
  } = useCurrencyInput(simInitialAmount);
  const {
    inputProps: simMonthlyAmountInputProps,
    numericValue: simMonthlyAmountValue,
  } = useCurrencyInput(simMonthlyAmount);

  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(getCurrentBrazilDate()), "yyyy-MM-dd"),
  );

  const [endDate, setEndDate] = useState<string>(
    format(endOfMonth(getCurrentBrazilDate()), "yyyy-MM-dd"),
  );
  const [neededUnit, setNeededUnit] = useState<"daily" | "weekly" | "monthly">(
    "monthly",
  );
  const [daysUnit, setDaysUnit] = useState<"days" | "weeks" | "months">(
    "months",
  );
  const [showCountdownPrintDialog, setShowCountdownPrintDialog] =
    useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [countdownPrintSettings, setCountdownPrintSettings] = useState({
    title: "Contagem Regressiva de Metas",
    subtitle: "",
  });
  const countdownTableRef = React.useRef<HTMLDivElement>(null);

  const handleDaysUnitChange = (newUnit: "days" | "weeks" | "months") => {
    setDaysUnit(newUnit);
    setNeededUnit(
      newUnit === "days" ? "daily" : newUnit === "weeks" ? "weekly" : "monthly",
    );
  };

  const handleNeededUnitChange = (newUnit: "daily" | "weekly" | "monthly") => {
    setNeededUnit(newUnit);
    setDaysUnit(
      newUnit === "daily" ? "days" : newUnit === "weekly" ? "weeks" : "months",
    );
  };

  const handleCountdownPrintTable = () => {
    setShowCountdownPrintDialog(true);
  };

  const executeCountdownPrint = () => {
    if (!countdownTableRef.current) return;

    const printWindow = window.open("", "", "height=600,width=900");
    if (!printWindow) return;

    const tableElement = countdownTableRef.current.querySelector("table");
    if (!tableElement) return;

    const clonedTable = tableElement.cloneNode(true) as HTMLElement;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Contagem Regressiva de Metas</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              padding: 20px;
              background-color: #fff;
            }
            .print-header {
              margin-bottom: 30px;
              border-bottom: 2px solid #e0e0e0;
              padding-bottom: 15px;
            }
            .print-header h1 {
              font-size: 24px;
              margin-bottom: 5px;
              color: #000;
            }
            .print-header p {
              font-size: 12px;
              color: #666;
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            thead {
              background-color: #f5f5f5;
            }
            th {
              padding: 12px;
              text-align: left;
              font-weight: 600;
              border: 1px solid #ddd;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            th:last-child,
            th:nth-last-child(2),
            th:nth-last-child(3),
            th:nth-last-child(4) {
              text-align: right;
            }
            td {
              padding: 10px 12px;
              border: 1px solid #ddd;
              font-size: 13px;
            }
            tbody tr:nth-child(even) {
              background-color: #fafafa;
            }
            td:last-child,
            td:nth-last-child(2),
            td:nth-last-child(3),
            td:nth-last-child(4) {
              text-align: right;
              font-weight: 600;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #e0e0e0;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${countdownPrintSettings.title}</h1>
            ${countdownPrintSettings.subtitle ? `<p style="font-size: 14px; color: #555; margin-top: 5px;">${countdownPrintSettings.subtitle}</p>` : ""}
            <div style="margin-top: 15px; padding: 12px; background-color: #f0f0f0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; color: #666;"><strong>${activeGoals.length} metas</strong></span>
              <span style="font-size: 14px; color: #000; font-weight: bold;">Total Alvo: ${formatCurrency(activeGoals.reduce((sum, g) => sum + g.targetAmount, 0))}</span>
            </div>
          </div>
          
          ${clonedTable.outerHTML}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const toggleCollapse = (id: string) => {
    setLayout((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, collapsed: !item.collapsed } : item,
      ),
    );
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newLayout = [...layout];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newLayout.length) {
      [newLayout[index], newLayout[targetIndex]] = [
        newLayout[targetIndex],
        newLayout[index],
      ];
      setLayout(newLayout);
    }
  };

  // Filter out deleted goals for calculations and display
  const activeGoals = useMemo(() => {
    return savingsGoals.filter((g) => {
      if (showDeleted) return g.status === "deleted";
      return g.status !== "deleted";
    });
  }, [savingsGoals, showDeleted]);

  // Flatten all contributions for timeline - only relevant ones from active/deleted goals
  const allContributions = useMemo(() => {
    return activeGoals
      .flatMap((goal) =>
        (goal.contributions || [])
          .filter((c) => {
            if (showDeleted) return c.status === "deleted";
            // Filter out deleted AND unpaid contributions for the "real" timeline
            return c.status !== "deleted" && c.isPaid !== false;
          })
          .map((contrib) => ({
            ...contrib,
            goalId: goal.id,
            goalName: goal.name,
          })),
      )
      .sort(
        (a, b) =>
          parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
      );
  }, [activeGoals, showDeleted]);

  // Calcular disponível mensal (excluindo Vero e Flash)

  // Cálculo de dados para "Disponível Final do Mês" respeitando filtros de data
  const monthlyTotals = useMemo(() => {
    // Data limite para o saldo anterior (um dia antes do início do filtro)
    const dayBeforeStart = format(
      subDays(parseLocalDate(startDate), 1),
      "yyyy-MM-dd",
    );

    // 1. Saldo Anterior (Total Balance - Total Goals Impact até dayBeforeStart)
    const paidTransactionsBefore = transactions.filter((t) => {
      if (
        t.status === "deleted" ||
        categoryText(t.category).includes("aporte") ||
        !t.isPaid
      )
        return false;
      const tDateStr = t.date.slice(0, 10);
      const isBeforeCutoff =
        !timeTravelDate ||
        new Date(t.createdAt) <= new Date(timeTravelDate + "T23:59:59");
      return tDateStr <= dayBeforeStart && isBeforeCutoff;
    });

    const totalIncomeBefore = paidTransactionsBefore
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpensesBefore = paidTransactionsBefore
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalBalanceBefore = totalIncomeBefore - totalExpensesBefore;

    const totalGoalsImpactBefore = activeGoals.reduce((total, goal) => {
      const goalTotal = (goal.contributions || []).reduce(
        (sum, contribution) => {
          if (contribution.status === "deleted" || !contribution.isPaid)
            return sum;
          const cDate = contribution.date.slice(0, 10);
          const isBeforeCutoff =
            !timeTravelDate ||
            new Date(contribution.createdAt) <=
              new Date(timeTravelDate + "T23:59:59");
          return (
            sum +
            (cDate <= dayBeforeStart && isBeforeCutoff
              ? contribution.amount
              : 0)
          );
        },
        0,
      );
      return total + goalTotal;
    }, 0);

    const previousBalanceAdjusted = totalBalanceBefore - totalGoalsImpactBefore;

    // 2. Receitas do período (excluindo Vero e Flash) - Todas (incluindo não pagas)
    const revenues = transactions
      .filter((t) => {
        const tDateStr = t.date.slice(0, 10);
        const isBeforeCutoff =
          !timeTravelDate ||
          new Date(t.createdAt) <= new Date(timeTravelDate + "T23:59:59");
        return (
          t.type === "income" &&
          t.status === "active" &&
          tDateStr >= startDate &&
          tDateStr <= endDate &&
          !t.description?.toLowerCase().includes("vero") &&
          !categoryText(t.category).includes("vero") &&
          !t.description?.toLowerCase().includes("flash") &&
          !categoryText(t.category).includes("flash") &&
          isBeforeCutoff
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // 3. Despesas do período - Todas (incluindo não pagas)
    const expenses = transactions
      .filter((t) => {
        const tDateStr = t.date.slice(0, 10);
        const isBeforeCutoff =
          !timeTravelDate ||
          new Date(t.createdAt) <= new Date(timeTravelDate + "T23:59:59");
        return (
          t.type === "expense" &&
          t.status === "active" &&
          !categoryText(t.category).includes("aporte") &&
          !paymentMethodText(t.paymentMethod).includes("vero") &&
          !paymentMethodText(t.paymentMethod).includes("flash") &&
          tDateStr >= startDate &&
          tDateStr <= endDate &&
          isBeforeCutoff
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // 4. Aportes reais do período (apenas isPaid=true)
    const realContributions = transactions
      .filter((t) => {
        const tDateStr = t.date.slice(0, 10);
        const isBeforeCutoff =
          !timeTravelDate ||
          new Date(t.createdAt) <= new Date(timeTravelDate + "T23:59:59");
        return (
          t.type === "expense" &&
          t.isPaid === true &&
          t.status === "active" &&
          tDateStr >= startDate &&
          tDateStr <= endDate &&
          categoryText(t.category).includes("aporte") &&
          isBeforeCutoff
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      revenues,
      expenses,
      realContributions,
      previousMonthAdjustedBalance: previousBalanceAdjusted,
      net:
        previousBalanceAdjusted +
        revenues -
        expenses -
        realContributions -
        catastrophicAmountValue,
    };
  }, [
    transactions,
    savingsGoals,
    activeGoals,
    startDate,
    endDate,
    catastrophicAmountValue,
    timeTravelDate,
  ]);

  // Detalhamento diário para o período filtrado (Mês Atual)
  const currentPeriodDailyData = useMemo(() => {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    const daysCount = differenceInDays(end, start) + 1;

    const dailyBalances: DailyBalanceItem[] = [];
    let runningBalance = monthlyTotals.previousMonthAdjustedBalance;
    let negativeCount = 0;

    for (let i = 0; i < daysCount; i++) {
      const currentDay = addDays(start, i);
      const currentDayStr = format(currentDay, "yyyy-MM-dd");

      const dayRevenues = transactions
        .filter((t) => {
          const tDateStr = t.date.slice(0, 10);
          const isBeforeCutoff =
            !timeTravelDate ||
            new Date(t.createdAt) <= new Date(timeTravelDate + "T23:59:59");
          return (
            t.type === "income" &&
            t.status === "active" &&
            tDateStr === currentDayStr &&
            !t.description?.toLowerCase().includes("vero") &&
            !categoryText(t.category).includes("vero") &&
            !t.description?.toLowerCase().includes("flash") &&
            !categoryText(t.category).includes("flash") &&
            isBeforeCutoff
          );
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const dayExpenses = transactions
        .filter((t) => {
          const tDateStr = t.date.slice(0, 10);
          const isBeforeCutoff =
            !timeTravelDate ||
            new Date(t.createdAt) <= new Date(timeTravelDate + "T23:59:59");
          return (
            t.type === "expense" &&
            t.status === "active" &&
            tDateStr === currentDayStr &&
            !categoryText(t.category).includes("aporte") &&
            !paymentMethodText(t.paymentMethod).includes("vero") &&
            !paymentMethodText(t.paymentMethod).includes("flash") &&
            isBeforeCutoff
          );
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const dayContributions = transactions
        .filter((t) => {
          const tDateStr = t.date.slice(0, 10);
          const isBeforeCutoff =
            !timeTravelDate ||
            new Date(t.createdAt) <= new Date(timeTravelDate + "T23:59:59");
          return (
            t.type === "expense" &&
            t.isPaid === true &&
            t.status === "active" &&
            tDateStr === currentDayStr &&
            categoryText(t.category).includes("aporte") &&
            isBeforeCutoff
          );
        })
        .reduce((sum, t) => sum + t.amount, 0);

      runningBalance =
        runningBalance + dayRevenues - dayExpenses - dayContributions;

      // Aplicar o aporte simulado e o gasto extra no último dia do período para conciliar com o saldo final
      const isLastDay = i === daysCount - 1;
      if (isLastDay) {
        runningBalance =
          runningBalance - countdownSimExtraValue - catastrophicAmountValue;
      }

      if (runningBalance < 0) {
        negativeCount++;
      }

      dailyBalances.push({
        date: currentDayStr,
        total: runningBalance,
        revenues: dayRevenues,
        expenses:
          dayExpenses +
          dayContributions +
          (isLastDay ? countdownSimExtraValue + catastrophicAmountValue : 0),
        previousBalance:
          runningBalance -
          dayRevenues +
          (dayExpenses +
            dayContributions +
            (isLastDay ? countdownSimExtraValue + catastrophicAmountValue : 0)),
        isNegative: runningBalance < 0,
        openingBalance:
          i === 0 ? monthlyTotals.previousMonthAdjustedBalance : undefined,
      });
    }

    return { dailyBalances, negativeCount };
  }, [
    transactions,
    startDate,
    endDate,
    monthlyTotals.previousMonthAdjustedBalance,
    countdownSimExtraValue,
    catastrophicAmountValue,
    timeTravelDate,
  ]);

  // Cálculo para "Disponível próximos X dias" (após a data final do filtro) com detalhamento diário
  const nextDaysData = useMemo(() => {
    const filterEndDate = parseLocalDate(endDate);
    // Para a projeção futura, o saldo base é o saldo real ao final do filtro (sem as simulações do filtro)
    // E então aplicamos as simulações no primeiro dia da projeção para que apareçam na tabela
    const baseBalance =
      monthlyTotals.previousMonthAdjustedBalance +
      monthlyTotals.revenues -
      monthlyTotals.expenses -
      monthlyTotals.realContributions;

    const dailyBalances: DailyBalanceItem[] = [];
    let runningBalance = baseBalance;
    let negativeCount = 0;

    for (let i = 1; i <= projectionDays; i++) {
      const currentDay = addDays(filterEndDate, i);
      const currentDayStr = format(currentDay, "yyyy-MM-dd");

      const dayRevenues = transactions
        .filter((t) => {
          const tDateStr = t.date.slice(0, 10);
          const isBeforeCutoff =
            !timeTravelDate ||
            new Date(t.createdAt) <= new Date(timeTravelDate + "T23:59:59");
          return (
            t.type === "income" &&
            t.status === "active" &&
            tDateStr === currentDayStr &&
            !t.description?.toLowerCase().includes("vero") &&
            !categoryText(t.category).includes("vero") &&
            !t.description?.toLowerCase().includes("flash") &&
            !categoryText(t.category).includes("flash") &&
            isBeforeCutoff
          );
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const dayExpenses = transactions
        .filter((t) => {
          const tDateStr = t.date.slice(0, 10);
          const isBeforeCutoff =
            !timeTravelDate ||
            new Date(t.createdAt) <= new Date(timeTravelDate + "T23:59:59");
          return (
            t.type === "expense" &&
            t.status === "active" &&
            tDateStr === currentDayStr &&
            !categoryText(t.category).includes("aporte") &&
            !paymentMethodText(t.paymentMethod).includes("vero") &&
            !paymentMethodText(t.paymentMethod).includes("flash") &&
            isBeforeCutoff
          );
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const dayContributions = transactions
        .filter((t) => {
          const tDateStr = t.date.slice(0, 10);
          const isBeforeCutoff =
            !timeTravelDate ||
            new Date(t.createdAt) <= new Date(timeTravelDate + "T23:59:59");
          return (
            t.type === "expense" &&
            t.isPaid === true &&
            t.status === "active" &&
            tDateStr === currentDayStr &&
            categoryText(t.category).includes("aporte") &&
            isBeforeCutoff
          );
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const isFirstDay = i === 1;
      const simValues = isFirstDay
        ? countdownSimExtraValue + catastrophicAmountValue
        : 0;

      runningBalance =
        runningBalance +
        dayRevenues -
        dayExpenses -
        dayContributions -
        simValues;

      if (runningBalance < 0) {
        negativeCount++;
      }

      dailyBalances.push({
        date: currentDayStr,
        label: `D+${i}`,
        total: runningBalance,
        revenues: dayRevenues,
        expenses: dayExpenses + dayContributions + simValues,
        previousBalance:
          runningBalance -
          dayRevenues +
          (dayExpenses + dayContributions + simValues),
        isNegative: runningBalance < 0,
        negativeDayIndex: runningBalance < 0 ? negativeCount : 0,
        openingBalance: i === 1 ? baseBalance : undefined,
      });
    }

    return {
      dailyBalances,
      total: runningBalance,
      baseBalance,
      negativeCount,
      revenues: dailyBalances.reduce((sum, d) => sum + d.revenues, 0),
      expenses: dailyBalances.reduce((sum, d) => sum + d.expenses, 0),
    };
  }, [
    transactions,
    endDate,
    monthlyTotals,
    countdownSimExtraValue,
    catastrophicAmountValue,
    projectionDays,
    timeTravelDate,
  ]);

  // Limite de projeção: fim do mês seguinte ao filtro
  const maxProjectionDays = useMemo(() => {
    const filterEndDate = parseLocalDate(endDate);
    const endOfNextMonth = endOfMonth(addDays(endOfMonth(filterEndDate), 1));
    return differenceInDays(endOfNextMonth, filterEndDate);
  }, [endDate]);

  // Verificar se o filtro de data está ativo (diferente do mês atual)
  // const isFilterActive = useMemo(() => {
  //   const defaultStart = format(startOfMonth(getCurrentBrazilDate()), 'yyyy-MM-dd');
  //   const defaultEnd = format(endOfMonth(getCurrentBrazilDate()), 'yyyy-MM-dd');
  //   return startDate !== defaultStart || endDate !== defaultEnd;
  // }, [startDate, endDate]);

  const handleCountdownSimGoalChange = (goalId: string) => {
    setCountdownSimGoalId(goalId || null);
  };

  const handleRegisterAporte = async (
    transactionData: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ) => {
    if (onAddTransaction) {
      try {
        setFormError(null);
        await onAddTransaction(transactionData);
        // setShowAporteForm(false); // Removido para permitir que a animação termine
        setCountdownSimExtra(0);
      } catch (error: unknown) {
        console.error("Erro ao registrar aporte:", error);
        setFormError(
          error instanceof Error ? error.message : "Erro ao registrar aporte",
        );
        throw error; // Relança para o TransactionForm
      }
    }
  };

  // Simulator Calculations
  const simulationResults = useMemo(() => {
    const data: {
      month: number;
      total: number;
      invested: number;
      interest: number;
    }[] = [];
    let currentTotal = simInitialAmountValue;
    let currentInvested = simInitialAmountValue;

    for (let i = 0; i <= simPeriod; i++) {
      if (i > 0) {
        const interest = currentTotal * (simInterestRate / 100);
        currentTotal += interest + simMonthlyAmountValue;
        currentInvested += simMonthlyAmountValue;
      }
      data.push({
        month: i,
        total: currentTotal,
        invested: currentInvested,
        interest: currentTotal - currentInvested,
      });
    }
    return data;
  }, [
    simInitialAmountValue,
    simMonthlyAmountValue,
    simInterestRate,
    simPeriod,
  ]);

  const simChartData = useMemo(
    () => ({
      labels: simulationResults.map((r) => `Mês ${r.month}`),
      datasets: [
        {
          label: "Total Acumulado",
          data: simulationResults.map((r) => r.total),
          borderColor: theme.primary,
          backgroundColor: theme.primary + "33",
          fill: true,
          tension: 0.4,
        },
        {
          label: "Total Investido",
          data: simulationResults.map((r) => r.invested),
          borderColor: "#94a3b8",
          backgroundColor: "#94a3b833",
          fill: true,
          tension: 0.4,
        },
      ],
    }),
    [simulationResults, theme.primary],
  );

  // Salary History Analysis
  const salaryAnalysis = useMemo(() => {
    const monthlyData: Record<string, { income: number; savings: number }> = {};

    transactions
      .filter((t) => t.type === "income" && t.isPaid)
      .forEach((t) => {
        const month = format(parseLocalDate(t.date), "yyyy-MM");
        if (!monthlyData[month]) monthlyData[month] = { income: 0, savings: 0 };
        monthlyData[month].income += t.amount;
      });

    allContributions.forEach((c) => {
      const month = format(parseLocalDate(c.date), "yyyy-MM");
      if (!monthlyData[month]) monthlyData[month] = { income: 0, savings: 0 };
      monthlyData[month].savings += c.amount;
    });

    const months = Object.values(monthlyData);
    const avgIncome =
      months.length > 0
        ? months.reduce((sum, m) => sum + m.income, 0) / months.length
        : 0;
    const avgSavings =
      months.length > 0
        ? months.reduce((sum, m) => sum + m.savings, 0) / months.length
        : 0;
    const avgRate = avgIncome > 0 ? (avgSavings / avgIncome) * 100 : 0;

    return { avgIncome, avgSavings, avgRate, monthsCount: months.length };
  }, [transactions, allContributions]);

  // Chart Data: Progress Dashboard (used in JSX)
  useMemo(() => {
    const labels = savingsGoals.map((g) => g.name);
    const currentData = savingsGoals.map((g) => g.currentAmount);
    const remainingData = savingsGoals.map((g) =>
      Math.max(0, g.targetAmount - g.currentAmount),
    );

    return {
      labels,
      datasets: [
        {
          label: "Alcançado",
          data: currentData,
          backgroundColor: "#10b981",
          borderColor: theme.cardBackground,
          borderWidth: 2,
        },
        {
          label: "Faltante",
          data: remainingData,
          backgroundColor: "#ef4444",
          borderColor: theme.cardBackground,
          borderWidth: 2,
        },
      ],
    };
  }, [savingsGoals, theme.cardBackground]);

  // Chart Data: Contribution Timeline
  const timelineChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    allContributions.forEach((c) => {
      const monthKey = format(parseLocalDate(c.date), "yyyy-MM");
      grouped[monthKey] = (grouped[monthKey] || 0) + c.amount;
    });

    const sortedMonths = Object.keys(grouped).sort();

    return {
      labels: sortedMonths.map((m) => formatBrazilDate(m + "-01", "MMM/yy")),
      datasets: [
        {
          label: "Aportes Mensais",
          data: sortedMonths.map((m) => grouped[m]),
          borderColor: theme.primary,
          backgroundColor: theme.primary + "33",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: theme.primary,
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
        },
      ],
    };
  }, [allContributions, theme.primary]);

  // Chart Data: Goals Distribution
  const distributionChartData = useMemo(() => {
    const labels = savingsGoals.map((g) => g.name);
    const data = savingsGoals.map((g) => g.currentAmount);
    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#8BC34A",
      "#E91E63",
      "#00BCD4",
      "#FFEB3B",
      "#795548",
      "#607D8B",
    ];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: theme.cardBackground,
          borderWidth: 2,
        },
      ],
    };
  }, [savingsGoals, theme.cardBackground]);

  // Chart Data: Savings vs Income
  const savingsVsIncomeChartData = useMemo(() => {
    const months: Record<string, { income: number; savings: number }> = {};

    transactions
      .filter((t) => t.type === "income" && t.isPaid)
      .forEach((t) => {
        const monthKey = format(parseLocalDate(t.date), "yyyy-MM");
        if (!months[monthKey]) months[monthKey] = { income: 0, savings: 0 };
        months[monthKey].income += t.amount;
      });

    allContributions.forEach((c) => {
      const monthKey = format(parseLocalDate(c.date), "yyyy-MM");
      if (!months[monthKey]) months[monthKey] = { income: 0, savings: 0 };
      months[monthKey].savings += c.amount;
    });

    const sortedMonths = Object.keys(months).sort();

    return {
      labels: sortedMonths.map((m) => formatBrazilDate(m + "-01", "MMM/yy")),
      datasets: [
        {
          label: "Receita",
          data: sortedMonths.map((m) => months[m].income),
          borderColor: theme.primary,
          backgroundColor: theme.primary + "33",
          yAxisID: "y",
          tension: 0.4,
          pointRadius: 4,
        },
        {
          label: "Aportes",
          data: sortedMonths.map((m) => months[m].savings),
          borderColor: "#3b82f6",
          backgroundColor: "#3b82f633",
          yAxisID: "y",
          tension: 0.4,
          pointRadius: 4,
        },
      ],
    };
  }, [transactions, allContributions, theme.primary]);

  // Priority Matrix Data
  const matrixData = useMemo(() => {
    return savingsGoals.map((goal) => {
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
      let daysUntilDeadline: number | null = null;

      if (goal.deadline) {
        daysUntilDeadline = differenceInDays(
          parseLocalDate(goal.deadline),
          getCurrentBrazilDate(),
        );
      }

      return {
        x: daysUntilDeadline !== null ? daysUntilDeadline : 9999,
        y: remaining,
        r: goal.targetAmount / 100,
        label: goal.name,
        id: goal.id,
      };
    });
  }, [savingsGoals]);

  const matrixChartData = useMemo(() => {
    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#8BC34A",
      "#E91E63",
      "#00BCD4",
      "#FFEB3B",
    ];

    return {
      datasets: [
        {
          label: "Metas",
          data: matrixData,
          backgroundColor: matrixData.map((_, i) => colors[i % colors.length]),
          borderColor: theme.cardBackground,
          borderWidth: 2,
        },
      ],
    };
  }, [matrixData, theme.cardBackground]);

  // Goals Countdown Table Data
  const countdownSimGoalIdEffective =
    countdownSimGoalId ?? savingsGoals[0]?.id ?? null;

  const countdownTableData = useMemo(() => {
    return savingsGoals.map((goal) => {
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
      const percentage = (goal.currentAmount / goal.targetAmount) * 100;
      let daysLeft: number | null = null;
      let monthlyNeeded = 0;

      if (goal.deadline) {
        daysLeft = differenceInDays(
          parseLocalDate(goal.deadline),
          getCurrentBrazilDate(),
        );
        const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));
        monthlyNeeded = remaining / monthsLeft;
      }

      const simulatedExtra =
        countdownSimGoalIdEffective && goal.id === countdownSimGoalIdEffective
          ? countdownSimExtraValue
          : 0;
      const remainingAfterSimulated = Math.max(0, remaining - simulatedExtra);
      const monthsWithSimulated =
        monthlyNeeded > 0
          ? Math.ceil(remainingAfterSimulated / monthlyNeeded)
          : null;
      const monthsSaved =
        monthlyNeeded > 0 && simulatedExtra > 0
          ? Math.floor(simulatedExtra / monthlyNeeded)
          : 0;

      return {
        ...goal,
        remaining,
        percentage,
        daysLeft,
        monthlyNeeded,
        remainingAfterSimulated,
        monthsWithSimulated,
        monthsSaved,
        simulatedExtra,
        availableEndOfMonth: monthlyTotals.net - simulatedExtra,
      };
    });
  }, [
    savingsGoals,
    countdownSimExtraValue,
    countdownSimGoalIdEffective,
    monthlyTotals,
  ]);

  const countdownSimGoal = useMemo(() => {
    if (!countdownSimGoalIdEffective) return null;
    return (
      countdownTableData.find((g) => g.id === countdownSimGoalIdEffective) ||
      null
    );
  }, [countdownTableData, countdownSimGoalIdEffective]);

  // Se o aporte form for fechado ou o valor mudar, resetar o estado de aporte se necessário
  // (Opcional, mas ajuda a manter a consistência)

  const countdownSimAvailableEndOfMonth =
    monthlyTotals.net - countdownSimExtraValue;

  const isSimExceedsTarget = useMemo(() => {
    if (!countdownSimGoal || !countdownSimExtraValue) return false;
    const remaining =
      countdownSimGoal.targetAmount - countdownSimGoal.currentAmount;
    return countdownSimExtraValue > remaining + 0.01;
  }, [countdownSimGoal, countdownSimExtraValue]);

  const countdownSimIsGoalAchieved = countdownSimGoal
    ? countdownSimGoal.remainingAfterSimulated <= 0
    : false;

  // Contribution Table Data
  const contributionTableData = useMemo(() => {
    const filtered = allContributions.filter((c) => {
      const date = parseLocalDate(c.date);
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      if (!isWithinInterval(date, { start, end })) return false;
      if (selectedGoalId && c.goalId !== selectedGoalId) return false;
      return true;
    });

    return filtered.map((c) => {
      const goal = savingsGoals.find((g) => g.id === c.goalId);
      const percentOfGoal = goal ? (c.amount / goal.targetAmount) * 100 : 0;
      return { ...c, percentOfGoal };
    });
  }, [allContributions, startDate, endDate, selectedGoalId, savingsGoals]);

  const renderCardHeader = (
    id: string,
    label: string,
    icon: React.ReactNode,
    index: number,
    isCollapsed: boolean,
    onToggleAll?: () => void,
  ) => (
    <div className="p-4 border-b font-semibold text-foreground flex items-center justify-between group bg-muted/30 border-border">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs">
          {DEFAULT_LAYOUT.find((item) => item.id === id)?.number}
        </div>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm lg:text-base uppercase font-black tracking-tight">
            {label}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {onToggleAll && !isCollapsed && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAll();
            }}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="Alternar Todos"
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            moveItem(index, "up");
          }}
          disabled={index === 0}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 disabled:opacity-0"
          title="Mover para Cima"
        >
          <ArrowUp className="w-4 h-4" />
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            moveItem(index, "down");
          }}
          disabled={index === layout.length - 1}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 disabled:opacity-0"
          title="Mover para Baixo"
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
        <div className="w-[1px] h-4 mx-1 bg-border opacity-0 group-hover:opacity-100" />
        <Button
          onClick={() => toggleCollapse(id)}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title={isCollapsed ? "Expandir" : "Minimizar"}
        >
          {isCollapsed ? (
            <Maximize2 className="w-4 h-4" />
          ) : (
            <Minus className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10 max-w-full overflow-x-hidden relative">
      <style>
        {`
          @keyframes pulse-border {
            0% { border-color: ${theme.cardBorder}; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.1); }
            50% { border-color: rgba(239, 68, 68, 0.8); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0.3); }
            100% { border-color: ${theme.cardBorder}; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.1); }
          }
          .animate-pulse-border {
            animation: pulse-border 1.5s infinite ease-in-out;
          }
          input[type=range] {
            -webkit-appearance: none;
            background: transparent;
          }
          input[type=range]:focus {
            outline: none;
          }
          input[type=range]::-webkit-slider-runnable-track {
            width: 100%;
            height: 6px;
            cursor: pointer;
            background: ${theme.primary}33;
            border-radius: 8px;
          }
          input[type=range]::-webkit-slider-thumb {
            height: 14px;
            width: 14px;
            border-radius: 50%;
            background: ${theme.primary};
            cursor: pointer;
            -webkit-appearance: none;
            margin-top: -4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          }
          input[type=range]::-moz-range-track {
            width: 100%;
            height: 6px;
            cursor: pointer;
            background: ${theme.primary}33;
            border-radius: 8px;
          }
          input[type=range]::-moz-range-thumb {
            height: 14px;
            width: 14px;
            border-radius: 50%;
            background: ${theme.primary};
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            border: none;
          }
        `}
      </style>
      <div className="flex flex-col lg:flex-row gap-6 items-start mt-4">
        {/* Sidebar Filters */}
        {showFilters && (
          <div className="w-full lg:w-80 lg:sticky lg:top-24 space-y-4 flex-shrink-0 animate-in slide-in-from-left duration-300">
            <Card noPadding className="overflow-hidden shadow-sm">
              <div className="p-4 font-semibold text-foreground flex items-center justify-between border-b bg-muted/30 border-border">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  <span>Filtros</span>
                </div>
                <Button
                  onClick={() => setShowFilters(false)}
                  variant="ghost"
                  size="sm"
                  title="Esconder Filtros"
                  className="opacity-50 hover:opacity-100"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Período
                  </label>
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    theme={theme}
                  />
                </div>

                <div>
                  <Select
                    label="Meta (Tabela de Aportes)"
                    value={selectedGoalId || ""}
                    onChange={(e) => setSelectedGoalId(e.target.value || null)}
                  >
                    <option value="">Todas as Metas</option>
                    {activeGoals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {(savingsGoals.some((g) => g.status === "deleted") ||
                  savingsGoals.some((g) =>
                    g.contributions.some((c) => c.status === "deleted"),
                  )) && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Visibilidade
                    </label>
                    <Button
                      onClick={() => setShowDeleted(!showDeleted)}
                      variant={showDeleted ? "accent" : "outline"}
                      size="sm"
                      className="w-full uppercase text-[10px]"
                    >
                      <Trash2
                        className={cn(
                          "w-3 h-3 mr-2",
                          showDeleted && "animate-pulse",
                        )}
                      />
                      {showDeleted ? "Mostrando Excluídos" : "Ver Excluídos"}
                    </Button>
                  </div>
                )}

                <Button
                  onClick={() => {
                    setSelectedGoalId(null);
                    setStartDate(
                      format(
                        startOfMonth(getCurrentBrazilDate()),
                        "yyyy-MM-dd",
                      ),
                    );
                    setEndDate(
                      format(endOfMonth(getCurrentBrazilDate()), "yyyy-MM-dd"),
                    );
                  }}
                  variant="outline"
                  className="w-full text-xs"
                >
                  LIMPAR FILTROS
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 space-y-8 w-full">
          {!showFilters && (
            <Button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-2"
            >
              <PanelLeftOpen className="w-5 h-5" />
              MOSTRAR FILTROS
            </Button>
          )}
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-card border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                Total em Metas
              </p>
              <p className="text-2xl font-black text-primary">
                {formatCurrency(
                  activeGoals.reduce((sum, g) => sum + g.currentAmount, 0),
                )}
              </p>
            </Card>
            <Card className="p-4 bg-card border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                Total Alvo
              </p>
              <p className="text-2xl font-black text-accent">
                {formatCurrency(
                  activeGoals.reduce((sum, g) => sum + g.targetAmount, 0),
                )}
              </p>
            </Card>
            <Card className="p-4 bg-card border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                Qtd. de Metas
              </p>
              <p className="text-2xl font-black text-primary">
                {activeGoals.length}
              </p>
            </Card>
          </div>

          {/* Card de Disponibilidade Mensal */}
          <Card
            ref={simulationRef}
            noPadding
            className="relative group/simcard overflow-hidden shadow-md transition-all hover:shadow-lg"
          >
            <div className="p-4 border-b font-semibold text-foreground flex items-center justify-between bg-muted/30 border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs">
                  S
                </div>
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  <span className="text-sm lg:text-base uppercase font-black tracking-tight">
                    Faça Simulações aqui
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrintSimulation}
                  variant="ghost"
                  size="sm"
                  className="hidden group-hover/simcard:flex items-center gap-2 text-[10px] h-8"
                  title="Imprimir Simulação"
                >
                  <Printer className="w-4 h-4 text-primary" />
                  IMPRIMIR
                </Button>
                <div className="w-[1px] h-4 mx-1 bg-border hidden group-hover/simcard:block" />
                <Button
                  onClick={() => setIsSimCardCollapsed(!isSimCardCollapsed)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title={isSimCardCollapsed ? "Expandir" : "Minimizar"}
                >
                  {isSimCardCollapsed ? (
                    <Maximize2 className="w-4 h-4" />
                  ) : (
                    <Minus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {!isSimCardCollapsed && (
              <div className="p-6">
                <div className="flex flex-col gap-8">
                  {/* Container Superior: Simulação e Resumo */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Lado Esquerdo: Configuração e Impacto */}
                    <div className="space-y-6">
                      <div className="flex flex-col h-full">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px]">
                            1
                          </span>
                          Simulação e Impacto
                        </p>

                        <div className="flex-1 space-y-6">
                          {/* Seção de Input de Aporte */}
                          <div className="rounded-2xl border border-border p-5 bg-muted/5 space-y-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Meta Alvo
                              </p>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">
                                {countdownSimGoal ? (
                                  <>
                                    Atual:{" "}
                                    <span className="font-mono font-bold text-foreground">
                                      {formatCurrency(
                                        countdownSimGoal.currentAmount,
                                      )}
                                    </span>{" "}
                                    / Alvo:{" "}
                                    <span className="font-mono font-bold text-foreground">
                                      {formatCurrency(
                                        countdownSimGoal.targetAmount,
                                      )}
                                    </span>
                                  </>
                                ) : (
                                  <>Selecione uma meta para simular</>
                                )}
                              </p>
                            </div>

                            <div className="space-y-3">
                              <Select
                                value={countdownSimGoalIdEffective || ""}
                                onChange={(e) =>
                                  handleCountdownSimGoalChange(e.target.value)
                                }
                                disabled={savingsGoals.length === 0}
                                className="h-10 text-xs bg-background border-border text-foreground"
                              >
                                <option
                                  value=""
                                  disabled
                                  className="bg-card text-foreground"
                                >
                                  Selecione a meta...
                                </option>
                                {savingsGoals.map((g) => (
                                  <option
                                    key={g.id}
                                    value={g.id}
                                    className="bg-card text-foreground"
                                  >
                                    {g.name}
                                  </option>
                                ))}
                              </Select>

                              <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50 font-bold text-xs">
                                  R$
                                </div>
                                <Input
                                  {...countdownSimExtraInputProps}
                                  onFocus={() => setIsSimInputFocused(true)}
                                  onBlur={() => setIsSimInputFocused(false)}
                                  placeholder={
                                    !isSimInputFocused
                                      ? "Valor do aporte..."
                                      : "0"
                                  }
                                  className={cn(
                                    "pl-10 text-right transition-all duration-300 h-11 text-lg font-black bg-background text-foreground border-border",
                                    !isSimInputFocused &&
                                      !countdownSimExtraValue &&
                                      "animate-pulse-border",
                                    countdownSimExtraValue > 0 &&
                                      "border-primary ring-2 ring-primary/10 bg-primary/[0.02]",
                                  )}
                                  disabled={!countdownSimGoalIdEffective}
                                />
                              </div>

                              {countdownSimExtraValue > 0 &&
                                onAddTransaction && (
                                  <div className="animate-in fade-in zoom-in duration-300">
                                    <Button
                                      onClick={() =>
                                        !isSimExceedsTarget &&
                                        setShowAporteForm(true)
                                      }
                                      disabled={isSimExceedsTarget}
                                      size="sm"
                                      className="w-full text-[10px] font-black uppercase tracking-widest h-10 shadow-lg"
                                    >
                                      <PlusCircle className="w-4 h-4 mr-2" />
                                      {isSimExceedsTarget
                                        ? "VALOR EXCEDIDO"
                                        : "REGISTRAR APORTE"}
                                    </Button>
                                    {isSimExceedsTarget && countdownSimGoal && (
                                      <span className="text-[10px] text-destructive font-black animate-pulse text-center uppercase tracking-tighter block mt-2">
                                        Aporte maior que o restante (
                                        {formatCurrency(
                                          countdownSimGoal.targetAmount -
                                            countdownSimGoal.currentAmount,
                                        )}
                                        )
                                      </span>
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Seção de Simulação de Data e Gasto Catastrófico (Movido da Seção 3) */}
                          <div className="rounded-2xl border border-border p-5 bg-muted/5 space-y-5">
                            {/* Time Travel Simulation */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                                  ⏳ Simular dia...
                                </label>
                                {timeTravelDate && (
                                  <button
                                    onClick={() => setTimeTravelDate(null)}
                                    className="text-[9px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-tighter"
                                  >
                                    Limpar
                                  </button>
                                )}
                              </div>
                              <Input
                                type="date"
                                value={timeTravelDate || ""}
                                onChange={(e) =>
                                  setTimeTravelDate(e.target.value || null)
                                }
                                className="h-9 text-[11px] bg-background border-border"
                              />
                            </div>

                            {/* Gasto Catastrófico */}
                            <div className="pt-4 border-t border-border/40 space-y-3">
                              <label className="text-[9px] font-black uppercase text-destructive tracking-widest flex items-center gap-1.5">
                                💣 Inserir um gasto imprevisto para simular
                                cenário pessimista
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                <Input
                                  {...catastrophicAmountInputProps}
                                  placeholder="Valor R$"
                                  className="h-9 text-[11px] bg-background border-border"
                                />
                                <Input
                                  type="text"
                                  value={catastrophicName}
                                  onChange={(e) =>
                                    setCatastrophicName(e.target.value)
                                  }
                                  placeholder="Motivo..."
                                  className="h-9 text-[11px] bg-background border-border"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Seção de Impacto */}
                          <div
                            className={cn(
                              "rounded-2xl border p-5 transition-all duration-500",
                              countdownSimGoal && countdownSimExtraValue > 0
                                ? "bg-primary/[0.03] border-primary/30 shadow-sm"
                                : "bg-muted/5 border-border opacity-50",
                            )}
                          >
                            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-3 flex items-center justify-between">
                              Resultado Estimado
                              {countdownSimGoal &&
                                countdownSimExtraValue > 0 && (
                                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    Simulado
                                  </span>
                                )}
                            </p>

                            <div className="min-h-[60px] flex flex-col justify-center">
                              {countdownSimGoal &&
                              countdownSimExtraValue > 0 ? (
                                countdownSimIsGoalAchieved ? (
                                  <div className="flex items-center gap-3 text-primary animate-in zoom-in duration-300">
                                    <div className="p-2 rounded-full bg-primary/20">
                                      <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-black uppercase tracking-tight">
                                        Meta Atingida!
                                      </p>
                                      <p className="text-[10px] font-bold opacity-70">
                                        Aporte cobre o saldo restante.
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2 animate-in slide-in-from-left duration-300">
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-2xl font-black text-primary tracking-tighter">
                                        -{countdownSimGoal.monthsSaved}
                                      </span>
                                      <span className="text-xs font-bold text-primary uppercase">
                                        {countdownSimGoal.monthsSaved === 1
                                          ? "mês"
                                          : "meses"}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                      Restarão apenas{" "}
                                      {countdownSimGoal.monthsWithSimulated}{" "}
                                      {countdownSimGoal.monthsWithSimulated ===
                                      1
                                        ? "mês"
                                        : "meses"}{" "}
                                      para o alvo.
                                    </p>
                                  </div>
                                )
                              ) : (
                                <div className="flex flex-col items-center justify-center py-2 text-center">
                                  <Info className="w-5 h-5 text-muted-foreground/30 mb-2" />
                                  <p className="text-[10px] text-muted-foreground font-medium italic">
                                    Selecione uma meta e valor para ver o
                                    impacto no tempo de conclusão.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lado Direito (Topo): Resumo do Período */}
                    <div className="flex flex-col h-full">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px]">
                          2
                        </span>
                        Resumo Financeiro
                      </p>

                      <div
                        className="flex-1 rounded-2xl border border-border p-5 bg-muted/10 flex flex-col"
                        title={`Cálculo:\nSaldo Anterior: ${formatCurrency(monthlyTotals.previousMonthAdjustedBalance)}\nReceitas (+): ${formatCurrency(monthlyTotals.revenues)}\nDespesas (-): ${formatCurrency(monthlyTotals.expenses)}\nAportes Reais (-): ${formatCurrency(monthlyTotals.realContributions)}\nAporte Simulado (-): ${formatCurrency(countdownSimExtraValue)}\nGasto Extra (Catastrófico) (-): ${formatCurrency(catastrophicAmountValue)}\nTotal: ${formatCurrency(countdownSimAvailableEndOfMonth)}`}
                      >
                        <div className="mb-4">
                          <p className="text-[9px] font-bold uppercase text-muted-foreground/80 tracking-widest mb-1">
                            Período de Análise
                          </p>
                          <p className="text-[10px] font-black text-foreground">
                            {formatBrazilDate(
                              parseLocalDate(startDate),
                              "dd/MM/yyyy",
                            )}{" "}
                            —{" "}
                            {formatBrazilDate(
                              parseLocalDate(endDate),
                              "dd/MM/yyyy",
                            )}
                          </p>
                        </div>

                        <div
                          className={`flex flex-col gap-1 font-black \${countdownSimAvailableColorClass} p-4 rounded-xl bg-background/40 border border-border/50 mb-6`}
                        >
                          <div className="flex items-center gap-1.5">
                            {countdownSimAvailableEndOfMonth < 0 ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : countdownSimAvailableEndOfMonth < 500 ? (
                              <Pin className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span className="text-[10px] uppercase text-foreground/60 tracking-tight">
                              Saldo Final Estimado
                            </span>
                          </div>
                          <span className="text-3xl tracking-tighter">
                            {" "}
                            {formatCurrency(countdownSimAvailableEndOfMonth)}
                          </span>
                        </div>

                        <div className="text-[11px] text-muted-foreground/90 font-mono space-y-2.5">
                          <div className="flex justify-between items-center border-b border-border/40 pb-1.5">
                            <span className="opacity-80 text-foreground/70">
                              Saldo Anterior:
                            </span>
                            <span className="font-bold text-foreground">
                              {formatCurrency(
                                monthlyTotals.previousMonthAdjustedBalance,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-border/40 pb-1.5">
                            <span className="text-primary font-bold opacity-100">
                              + Receitas:
                            </span>
                            <span className="font-bold text-foreground">
                              {formatCurrency(monthlyTotals.revenues)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-border/40 pb-1.5">
                            <span className="text-destructive font-bold opacity-100">
                              - Despesas:
                            </span>
                            <span className="font-bold text-foreground">
                              {formatCurrency(monthlyTotals.expenses)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-border/40 pb-1.5">
                            <span className="text-destructive font-bold opacity-100">
                              - Aportes Reais:
                            </span>
                            <span className="font-bold text-foreground">
                              {formatCurrency(monthlyTotals.realContributions)}
                            </span>
                          </div>
                          {countdownSimExtraValue > 0 && (
                            <div className="flex justify-between items-center border-b border-border/40 pb-1.5 text-primary bg-primary/5 px-2 -mx-2 rounded-md">
                              <span className="font-bold uppercase text-[9px]">
                                Aporte Simulado:
                              </span>
                              <span className="font-black underline underline-offset-4">
                                {formatCurrency(countdownSimExtraValue)}
                              </span>
                            </div>
                          )}
                          {catastrophicAmountValue > 0 && (
                            <div className="flex justify-between items-center border-b border-border/40 pb-1.5 text-accent bg-accent/5 px-2 -mx-2 rounded-md">
                              <span className="font-bold uppercase text-[9px]">
                                Gastos Extra:
                              </span>
                              <span className="font-black underline underline-offset-4">
                                {formatCurrency(catastrophicAmountValue)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Container Inferior: Projeção de Caixa (Full Width) */}
                  <div className="flex flex-col border-t border-border pt-8">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px]">
                        3
                      </span>
                      Projeção de Caixa
                    </p>

                    <div
                      className={cn(
                        "flex-1 rounded-2xl border border-border p-6 transition-all duration-300 bg-muted/10",
                        timeTravelDate &&
                          "border-amber-500 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.1)]",
                      )}
                    >
                      <div className="lg:flex lg:gap-8 h-full">
                        {/* Controles da Projeção */}
                        <div className="lg:w-1/4 space-y-6">
                          {/* Toggle de Visualização */}
                          <div className="flex gap-2 p-1.5 bg-muted rounded-xl border border-border">
                            <Button
                              onClick={() => setProjectionView("current")}
                              variant={
                                projectionView === "current"
                                  ? "primary"
                                  : "ghost"
                              }
                              size="sm"
                              className="flex-1 text-[10px] font-bold h-8"
                            >
                              FILTRO
                            </Button>
                            <Button
                              onClick={() => setProjectionView("forward")}
                              variant={
                                projectionView === "forward"
                                  ? "primary"
                                  : "ghost"
                              }
                              size="sm"
                              className="flex-1 text-[10px] font-bold h-8"
                            >
                              FUTURO
                            </Button>
                          </div>

                          {/* Configurações da Projeção */}
                          <div className="space-y-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                                  {projectionView === "forward"
                                    ? "Dias à frente"
                                    : "Dias no período"}
                                </label>
                                <span className="text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20">
                                  {projectionView === "forward"
                                    ? `${projectionDays}d`
                                    : `${currentPeriodDailyData.dailyBalances.length}d`}
                                </span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max={Math.min(maxProjectionDays, 60)}
                                value={projectionDays}
                                onChange={(e) =>
                                  setProjectionDays(Number(e.target.value))
                                }
                                disabled={projectionView === "current"}
                                className={cn(
                                  "w-full cursor-pointer h-2 bg-muted rounded-lg appearance-none transition-opacity",
                                  projectionView === "current"
                                    ? "opacity-30 cursor-not-allowed"
                                    : "opacity-100",
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Detalhamento e Saldo Final */}
                        <div className="lg:w-3/4 flex flex-col h-full mt-8 lg:mt-0">
                          <div className="flex-1 overflow-x-auto min-h-[300px] max-h-[450px] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr
                                  className="bg-muted/40"
                                  style={{ color: theme.text }}
                                >
                                  <th
                                    className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider"
                                    style={{ borderColor: theme.cardBorder }}
                                  >
                                    Data
                                  </th>
                                  <th
                                    className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider"
                                    style={{ borderColor: theme.cardBorder }}
                                  >
                                    Saldo Inicial
                                  </th>
                                  <th
                                    className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider"
                                    style={{ borderColor: theme.cardBorder }}
                                  >
                                    Receitas
                                  </th>
                                  <th
                                    className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider"
                                    style={{ borderColor: theme.cardBorder }}
                                  >
                                    Despesas
                                  </th>
                                  <th
                                    className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right"
                                    style={{ borderColor: theme.cardBorder }}
                                  >
                                    Saldo Final
                                  </th>
                                </tr>
                              </thead>
                              <tbody
                                className="divide-y"
                                style={{ borderColor: theme.cardBorder }}
                              >
                                {(projectionView === "forward"
                                  ? nextDaysData.dailyBalances
                                  : currentPeriodDailyData.dailyBalances
                                ).map((day: DailyBalanceItem) => (
                                  <tr
                                    key={day.date}
                                    className={cn(
                                      "text-foreground hover:bg-primary/5 transition-colors group",
                                      day.isNegative && "bg-destructive/10",
                                    )}
                                  >
                                    <td
                                      className="p-4 border-r font-mono text-xs"
                                      style={{ borderColor: theme.cardBorder }}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-bold">
                                          {formatBrazilDate(
                                            parseLocalDate(day.date),
                                            "dd/MM",
                                          )}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">
                                          {formatBrazilDate(
                                            parseLocalDate(day.date),
                                            "EEEE",
                                          )}
                                        </span>
                                      </div>
                                    </td>
                                    <td
                                      className="p-4 border-r font-mono text-xs opacity-70"
                                      style={{ borderColor: theme.cardBorder }}
                                    >
                                      {day.openingBalance !== undefined
                                        ? formatCurrency(day.openingBalance)
                                        : "-"}
                                    </td>
                                    <td
                                      className="p-4 border-r font-mono text-xs"
                                      style={{ borderColor: theme.cardBorder }}
                                    >
                                      {day.revenues > 0 ? (
                                        <span className="text-primary font-bold">
                                          +{formatCurrency(day.revenues)}
                                        </span>
                                      ) : (
                                        <span className="opacity-20">-</span>
                                      )}
                                    </td>
                                    <td
                                      className="p-4 border-r font-mono text-xs"
                                      style={{ borderColor: theme.cardBorder }}
                                    >
                                      {day.expenses > 0 ? (
                                        <span className="text-destructive font-bold">
                                          -{formatCurrency(day.expenses)}
                                        </span>
                                      ) : (
                                        <span className="opacity-20">-</span>
                                      )}
                                    </td>
                                    <td
                                      className={cn(
                                        "p-4 text-right font-black text-base",
                                        day.isNegative
                                          ? "text-destructive animate-pulse"
                                          : day.total < 500
                                            ? "text-amber-500"
                                            : "text-primary",
                                      )}
                                    >
                                      {formatCurrency(day.total)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Resumo Final da Projeção */}
                          <div className="mt-6 pt-6 border-t border-border/40">
                            <div className="flex justify-between items-end">
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                                  Saldo Final Projetado
                                </p>
                                <span
                                  className={cn(
                                    "text-3xl lg:text-5xl font-black tracking-tighter",
                                    (projectionView === "forward"
                                      ? nextDaysData.total
                                      : countdownSimAvailableEndOfMonth) < 0
                                      ? "text-destructive"
                                      : "text-primary",
                                  )}
                                >
                                  {formatCurrency(
                                    projectionView === "forward"
                                      ? nextDaysData.total
                                      : countdownSimAvailableEndOfMonth,
                                  )}
                                </span>
                              </div>
                              {(projectionView === "forward"
                                ? nextDaysData.negativeCount
                                : currentPeriodDailyData.negativeCount) > 0 && (
                                <div className="text-right">
                                  <span className="bg-destructive text-destructive-foreground text-[10px] font-black px-3 py-2 rounded-xl animate-bounce inline-block uppercase tracking-widest shadow-lg border border-white/20">
                                    {projectionView === "forward"
                                      ? nextDaysData.negativeCount
                                      : currentPeriodDailyData.negativeCount}{" "}
                                    DIAS NEGATIVOS DETECTADOS ⚠️
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {showAporteForm && (
            <TransactionForm
              type="expense"
              savingsGoals={savingsGoals}
              submitError={formError}
              replicateTransaction={
                {
                  id: "simulated",
                  amount: countdownSimExtraValue,
                  description: `Aporte: ${countdownSimGoal?.name || ""}`,
                  category: "Aporte",
                  date: getBrazilDateString(),
                  dueDate: getBrazilDateString(),
                  isPaid: true,
                  recurrence: "none",
                  type: "expense",
                  savingsGoalId: countdownSimGoalIdEffective || undefined,
                  createdAt: getCurrentBrazilDate().toISOString(),
                  updatedAt: getCurrentBrazilDate().toISOString(),
                }
              }
              onSubmit={handleRegisterAporte}
              onClose={() => {
                setShowAporteForm(false);
                setFormError(null);
              }}
            />
          )}

          {/* Renderable Sections */}
          {layout.map((item, index) => {
            switch (item.id) {
              case "financial_simulators":
                return (
                  <Card
                    key={item.id}
                    noPadding
                    className="overflow-hidden shadow-md transition-all hover:shadow-lg"
                  >
                    {renderCardHeader(
                      item.id,
                      item.label,
                      <Calculator className="w-5 h-5 text-primary" />,
                      index,
                      item.collapsed,
                      () => toggleAll(simChartRef),
                    )}
                    {!item.collapsed && (
                      <div className="p-6 md:p-8 space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <div className="flex gap-2 p-1 bg-muted/30 rounded-xl border border-border">
                              <Button
                                onClick={() => setSimMode("investment")}
                                variant={
                                  simMode === "investment" ? "primary" : "ghost"
                                }
                                size="sm"
                                className="flex-1 text-[10px] font-bold h-8"
                              >
                                Investimento Livre
                              </Button>
                              <Button
                                onClick={() => setSimMode("goal_reach")}
                                variant={
                                  simMode === "goal_reach" ? "primary" : "ghost"
                                }
                                size="sm"
                                className="flex-1 text-[10px] font-bold h-8"
                              >
                                Alcance de Meta
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <Input
                                {...simInitialAmountInputProps}
                                label="Valor Inicial (R$)"
                                className="font-bold bg-background border-border text-foreground"
                              />
                              <Input
                                {...simMonthlyAmountInputProps}
                                label="Aporte Mensal (R$)"
                                className="font-bold bg-background border-border text-foreground"
                              />
                              <Input
                                type="number"
                                step="0.1"
                                value={simInterestRate}
                                onChange={(e) =>
                                  setSimInterestRate(Number(e.target.value))
                                }
                                label="Juros Mensal (%)"
                                className="font-bold bg-background border-border text-foreground"
                              />
                              <Input
                                type="number"
                                value={simPeriod}
                                onChange={(e) =>
                                  setSimPeriod(Number(e.target.value))
                                }
                                label="Período (Meses)"
                                className="font-bold bg-background border-border text-foreground"
                              />
                            </div>

                            {simMode === "goal_reach" && (
                              <Select
                                label="Vincular a Meta Existente"
                                value={simTargetGoalId || ""}
                                className="bg-background border-border text-foreground"
                                onChange={(e) => {
                                  const goalId = e.target.value;
                                  setSimTargetGoalId(goalId);
                                  const goal = activeGoals.find(
                                    (g) => g.id === goalId,
                                  );
                                  if (goal) {
                                    setSimInitialAmount(goal.currentAmount);
                                    const remaining =
                                      goal.targetAmount - goal.currentAmount;
                                    if (simMonthlyAmountValue > 0) {
                                      setSimPeriod(
                                        Math.ceil(
                                          remaining / simMonthlyAmountValue,
                                        ),
                                      );
                                    }
                                  }
                                }}
                              >
                                <option
                                  value=""
                                  className="bg-card text-foreground"
                                >
                                  Nenhuma Meta
                                </option>
                                {activeGoals.map((g) => (
                                  <option
                                    key={g.id}
                                    value={g.id}
                                    className="bg-card text-foreground"
                                  >
                                    {g.name} ({formatCurrency(g.targetAmount)})
                                  </option>
                                ))}
                              </Select>
                            )}

                            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-bold uppercase text-foreground/60">
                                  Total ao Final
                                </p>
                                <p className="text-2xl font-black text-primary">
                                  {formatCurrency(
                                    simulationResults[
                                      simulationResults.length - 1
                                    ].total,
                                  )}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold uppercase text-foreground/60">
                                  Juros Ganhos
                                </p>
                                <p className="text-xl font-black text-accent">
                                  {formatCurrency(
                                    simulationResults[
                                      simulationResults.length - 1
                                    ].interest,
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="h-full min-h-[300px]">
                            <Line
                              ref={(r) => {
                                simChartRef.current = (r as ChartJS) || null;
                              }}
                              data={simChartData}
                              options={{
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    display: true,
                                    labels: { color: theme.text },
                                  },
                                },
                                scales: {
                                  y: {
                                    ticks: {
                                      color: theme.text,
                                      callback: (v) =>
                                        formatCurrency(v as number),
                                    },
                                    grid: { color: theme.cardBorder },
                                  },
                                  x: {
                                    ticks: { color: theme.text },
                                    grid: { color: theme.cardBorder },
                                  },
                                },
                              }}
                            />
                          </div>
                        </div>

                        <div className="pt-8 border-t border-border">
                          <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-foreground">
                            <Info className="w-4 h-4 text-primary" />
                            Análise Baseada no seu Histórico de Salário
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl border bg-muted/10 border-border">
                              <p className="text-[10px] font-bold uppercase text-muted-foreground/80 mb-1">
                                Média Salarial Mensal
                              </p>
                              <p className="text-lg font-black text-foreground">
                                {formatCurrency(salaryAnalysis.avgIncome)}
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 mt-1">
                                Baseado em {salaryAnalysis.monthsCount} meses
                              </p>
                            </div>
                            <div className="p-4 rounded-xl border bg-muted/10 border-border">
                              <p className="text-[10px] font-bold uppercase text-muted-foreground/80 mb-1">
                                Média de Aportes
                              </p>
                              <p className="text-lg font-black text-primary">
                                {formatCurrency(salaryAnalysis.avgSavings)}
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 mt-1">
                                ({salaryAnalysis.avgRate.toFixed(1)}% do
                                salário)
                              </p>
                            </div>
                            <div className="p-4 rounded-xl border bg-primary/10 border-primary/30">
                              <p className="text-[10px] font-bold uppercase text-primary/70 mb-1">
                                Potencial em 1 Ano
                              </p>
                              <p className="text-lg font-black text-primary">
                                {formatCurrency(
                                  salaryAnalysis.avgSavings *
                                    12 *
                                    (1 + (simInterestRate / 100) * 6),
                                )}
                              </p>
                              <p className="text-[10px] text-primary/50 mt-1">
                                Se mantiver a média + juros
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );

              case "contribution_timeline":
                return (
                  <Card
                    key={item.id}
                    noPadding
                    className="overflow-hidden shadow-md transition-all hover:shadow-lg"
                  >
                    {renderCardHeader(
                      item.id,
                      item.label,
                      <TrendingUp className="w-5 h-5 text-primary" />,
                      index,
                      item.collapsed,
                      () => toggleAll(timelineChartRef),
                    )}
                    {!item.collapsed && (
                      <div className="p-8 h-80">
                        {allContributions.length > 0 ? (
                          <Line
                            ref={(r) => {
                              timelineChartRef.current = (r as ChartJS) || null;
                            }}
                            data={timelineChartData}
                            options={{
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { labels: { color: theme.text } },
                              },
                              scales: {
                                y: {
                                  ticks: { color: theme.text },
                                  grid: { color: theme.cardBorder },
                                },
                                x: {
                                  ticks: { color: theme.text },
                                  grid: { color: theme.cardBorder },
                                },
                              },
                            }}
                          />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-foreground opacity-40 text-sm italic gap-2">
                            <TrendingUp className="w-12 h-12 opacity-10" />
                            <span>Nenhum aporte registrado</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );

              case "goals_distribution":
                return (
                  <Card
                    key={item.id}
                    noPadding
                    className="overflow-hidden shadow-md transition-all hover:shadow-lg"
                  >
                    {renderCardHeader(
                      item.id,
                      item.label,
                      <PieChartIcon className="w-5 h-5 text-primary" />,
                      index,
                      item.collapsed,
                      () => toggleAll(distributionChartRef),
                    )}
                    {!item.collapsed && (
                      <div className="p-8 h-80">
                        {activeGoals.length > 0 ? (
                          <Doughnut
                            ref={(r) => {
                              distributionChartRef.current =
                                (r as ChartJS) || null;
                            }}
                            data={distributionChartData}
                            options={{
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { labels: { color: theme.text } },
                              },
                            }}
                          />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-foreground opacity-40 text-sm italic gap-2">
                            <PieChartIcon className="w-12 h-12 opacity-10" />
                            <span>Nenhuma meta cadastrada</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );

              case "contribution_table":
                return (
                  <Card
                    key={item.id}
                    noPadding
                    className="overflow-hidden shadow-md transition-all hover:shadow-lg"
                  >
                    {renderCardHeader(
                      item.id,
                      item.label,
                      <BarChart3 className="w-5 h-5 text-primary" />,
                      index,
                      item.collapsed,
                    )}
                    {!item.collapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-muted/50 text-foreground">
                              <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider">
                                Data
                              </th>
                              <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider">
                                Meta
                              </th>
                              <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider">
                                Aporte
                              </th>
                              <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider text-center">
                                <Trash2 className="w-3 h-3 mx-auto" />
                              </th>
                              <th className="p-4 border-b border-border font-bold uppercase text-[10px] tracking-wider text-right">
                                % da Meta
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {contributionTableData.length > 0 ? (
                              contributionTableData.map((c) => {
                                const isDeleted =
                                  c.status === "deleted" || showDeleted;
                                return (
                                  <tr
                                    key={c.id}
                                    className={`text-foreground hover:bg-primary/5 transition-colors ${isDeleted ? "opacity-50 grayscale-[0.5]" : ""}`}
                                  >
                                    <td
                                      className={`p-4 whitespace-nowrap border-r font-mono text-xs opacity-70 ${isDeleted ? "line-through" : ""}`}
                                      style={{ borderColor: theme.cardBorder }}
                                    >
                                      {formatBrazilDate(c.date, "dd/MM/yyyy")}
                                    </td>
                                    <td
                                      className={`p-4 border-r ${isDeleted ? "line-through" : ""}`}
                                      style={{ borderColor: theme.cardBorder }}
                                    >
                                      <span className="font-semibold">
                                        {c.goalName}
                                      </span>
                                    </td>
                                    <td
                                      className={`p-4 border-r font-black text-primary ${isDeleted ? "line-through opacity-60" : ""}`}
                                      style={{ borderColor: theme.cardBorder }}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <span>{formatCurrency(c.amount)}</span>
                                        {c.isPaid === false && !isDeleted && (
                                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFE0B2] text-black">
                                            pending
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td
                                      className="p-4 border-r text-center"
                                      style={{ borderColor: theme.cardBorder }}
                                    >
                                      {isDeleted && (
                                        <span className="text-[8px] font-black bg-accent/20 text-accent px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                          EXCLUÍDO
                                        </span>
                                      )}
                                    </td>
                                    <td
                                      className={`p-4 text-right text-xs font-bold opacity-70 ${isDeleted ? "line-through" : ""}`}
                                    >
                                      {c.percentOfGoal.toFixed(1)}%
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="p-8 text-center text-foreground opacity-40 text-sm italic"
                                >
                                  Nenhum aporte encontrado
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                );

              case "savings_vs_income":
                return (
                  <Card
                    key={item.id}
                    noPadding
                    className="overflow-hidden shadow-md transition-all hover:shadow-lg"
                  >
                    {renderCardHeader(
                      item.id,
                      item.label,
                      <BarChart3 className="w-5 h-5 text-primary" />,
                      index,
                      item.collapsed,
                      () => toggleAll(savingsVsIncomeChartRef),
                    )}
                    {!item.collapsed && (
                      <div className="p-8 h-80">
                        {transactions.some((t) => t.type === "income") ? (
                          <Line
                            ref={(r) => {
                              savingsVsIncomeChartRef.current =
                                (r as ChartJS) || null;
                            }}
                            data={savingsVsIncomeChartData}
                            options={{
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { labels: { color: theme.text } },
                              },
                              scales: {
                                y: {
                                  ticks: { color: theme.text },
                                  grid: { color: theme.cardBorder },
                                },
                                x: {
                                  ticks: { color: theme.text },
                                  grid: { color: theme.cardBorder },
                                },
                              },
                            }}
                          />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-foreground opacity-40 text-sm italic gap-2">
                            <BarChart3 className="w-12 h-12 opacity-10" />
                            <span>Dados insuficientes para este período</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );

              case "priority_matrix":
                return (
                  <Card
                    key={item.id}
                    noPadding
                    className="overflow-hidden shadow-md transition-all hover:shadow-lg"
                  >
                    {renderCardHeader(
                      item.id,
                      item.label,
                      <AlertCircle className="w-5 h-5 text-primary" />,
                      index,
                      item.collapsed,
                      () => toggleAll(matrixChartRef),
                    )}
                    {!item.collapsed && (
                      <div className="p-8 h-96">
                        {activeGoals.some((g) => g.deadline) ? (
                          <Scatter
                            ref={(r) => {
                              matrixChartRef.current = (r as ChartJS) || null;
                            }}
                            data={matrixChartData}
                            options={{
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  callbacks: {
                                    label: (context: TooltipItem<"scatter">) => {
                                      const point = context.raw as {
                                        label: string;
                                        y: number;
                                      };
                                      return `${point.label}: ${point.y > 0 ? formatCurrency(point.y) : "Completo"}`;
                                    },
                                  },
                                },
                              },
                              scales: {
                                x: {
                                  ticks: { color: theme.text },
                                  grid: { color: theme.cardBorder },
                                  title: {
                                    display: true,
                                    text: "Dias até Prazo",
                                    color: theme.text,
                                  },
                                },
                                y: {
                                  ticks: { color: theme.text },
                                  grid: { color: theme.cardBorder },
                                  title: {
                                    display: true,
                                    text: "Valor Faltante (R$)",
                                    color: theme.text,
                                  },
                                },
                              },
                            }}
                          />
                        ) : (
                          <div
                            className="h-full flex flex-col items-center justify-center text-foreground opacity-40 text-center gap-4 border-2 border-dashed rounded-3xl"
                            style={{ borderColor: theme.cardBorder }}
                          >
                            <AlertCircle className="w-16 h-16 opacity-10" />
                            <div className="max-w-xs">
                              <p className="text-base font-bold mb-1">
                                Sem Prazos Definidos
                              </p>
                              <p className="text-xs italic">
                                Defina prazos nas metas para visualizar a matriz
                                de prioridade.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );

              case "goals_countdown":
                return (
                  <Card
                    key={item.id}
                    noPadding
                    className="overflow-hidden shadow-md transition-all hover:shadow-lg"
                    ref={countdownTableRef}
                  >
                    <div className="p-4 border-b font-semibold text-foreground flex items-center justify-between group bg-muted/30 border-border">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs">
                          {
                            DEFAULT_LAYOUT.find((it) => it.id === item.id)
                              ?.number
                          }
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-primary" />
                          <span className="text-sm lg:text-base">
                            {item.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCountdownPrintTable();
                          }}
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100"
                          title="Imprimir tabela"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveItem(index, "up");
                          }}
                          disabled={index === 0}
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100"
                          title="Mover para Cima"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveItem(index, "down");
                          }}
                          disabled={index === layout.length - 1}
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100"
                          title="Mover para Baixo"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <div className="w-[1px] h-4 mx-1 bg-muted opacity-0 group-hover:opacity-100" />
                        <Button
                          onClick={() => toggleCollapse(item.id)}
                          variant="ghost"
                          size="sm"
                          className="opacity-50 hover:opacity-100"
                          title={item.collapsed ? "Expandir" : "Minimizar"}
                        >
                          {item.collapsed ? (
                            <Maximize2 className="w-4 h-4" />
                          ) : (
                            <Minus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {!item.collapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-muted/50 text-foreground">
                              <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider">
                                Meta
                              </th>
                              <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider">
                                Prazo
                              </th>
                              <th
                                onClick={() =>
                                  handleDaysUnitChange(
                                    daysUnit === "days"
                                      ? "weeks"
                                      : daysUnit === "weeks"
                                        ? "months"
                                        : "days",
                                  )
                                }
                                className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider cursor-pointer transition-colors hover:bg-primary/10 rounded"
                                title="Clique para alternar entre dias, semanas e meses"
                              >
                                {daysUnit === "days"
                                  ? "Dias"
                                  : daysUnit === "weeks"
                                    ? "Semanas"
                                    : "Meses"}
                              </th>
                              <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider text-right">
                                Alvo
                              </th>
                              <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider text-right">
                                Atual
                              </th>
                              <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider text-right">
                                % Completo
                              </th>
                              <th
                                onClick={() =>
                                  handleNeededUnitChange(
                                    neededUnit === "daily"
                                      ? "weekly"
                                      : neededUnit === "weekly"
                                        ? "monthly"
                                        : "daily",
                                  )
                                }
                                className="p-4 border-b border-border font-bold uppercase text-[10px] tracking-wider text-right cursor-pointer transition-colors hover:bg-primary/10 rounded"
                                title="Clique para alternar entre diário, semanal e mensal"
                              >
                                {neededUnit === "daily"
                                  ? "Diário Necessário"
                                  : neededUnit === "weekly"
                                    ? "Semanal Necessário"
                                    : "Mensal Necessário"}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {countdownTableData.length > 0 ? (
                              countdownTableData.map((goal) => {
                                const statusColor =
                                  goal.percentage >= 100
                                    ? "text-green-500"
                                    : goal.daysLeft !== null &&
                                        goal.daysLeft > 0 &&
                                        ((goal.targetAmount -
                                          goal.currentAmount) /
                                          goal.daysLeft) *
                                          30 <=
                                          goal.monthlyNeeded
                                      ? "text-green-500"
                                      : goal.daysLeft !== null &&
                                          goal.daysLeft <= 30
                                        ? "text-destructive"
                                        : "text-amber-500";

                                return (
                                  <tr
                                    key={goal.id}
                                    className="text-foreground hover:bg-primary/5 transition-colors"
                                  >
                                    <td className="p-4 border-r border-border font-bold">
                                      {goal.name}
                                    </td>
                                    <td className="p-4 border-r border-border whitespace-nowrap text-xs opacity-70">
                                      {goal.deadline
                                        ? formatBrazilDate(
                                            goal.deadline,
                                            "dd/MM/yyyy",
                                          )
                                        : "-"}
                                    </td>
                                    <td
                                      className={cn(
                                        "p-4 border-r border-border text-sm font-bold",
                                        statusColor,
                                      )}
                                    >
                                      {goal.daysLeft !== null
                                        ? daysUnit === "days"
                                          ? goal.daysLeft
                                          : daysUnit === "weeks"
                                            ? Math.ceil(goal.daysLeft / 7)
                                            : Math.ceil(goal.daysLeft / 30)
                                        : "-"}
                                    </td>
                                    <td className="p-4 border-r border-border text-right text-xs font-black opacity-70">
                                      {formatCurrency(goal.targetAmount)}
                                    </td>
                                    <td className="p-4 border-r border-border text-right text-xs font-black text-primary">
                                      {formatCurrency(goal.currentAmount)}
                                    </td>
                                    <td
                                      className={cn(
                                        "p-4 border-r border-border text-right text-xs font-bold",
                                        statusColor,
                                      )}
                                    >
                                      {goal.percentage.toFixed(1)}%
                                    </td>
                                    <td className="p-4 text-right text-xs font-bold text-accent">
                                      {neededUnit === "daily" &&
                                      goal.daysLeft !== null &&
                                      goal.daysLeft > 0
                                        ? formatCurrency(
                                            (goal.targetAmount -
                                              goal.currentAmount) /
                                              goal.daysLeft,
                                          )
                                        : neededUnit === "weekly" &&
                                            goal.daysLeft !== null &&
                                            goal.daysLeft > 0
                                          ? formatCurrency(
                                              (goal.targetAmount -
                                                goal.currentAmount) /
                                                Math.ceil(goal.daysLeft / 7),
                                            )
                                          : goal.monthlyNeeded > 0
                                            ? formatCurrency(goal.monthlyNeeded)
                                            : "-"}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="p-8 text-center text-foreground opacity-40 text-sm italic"
                                >
                                  Nenhuma meta cadastrada
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                );

              default:
                return null;
            }
          })}
        </div>
      </div>

      {/* Print Dialog - Countdown Table */}
      {showCountdownPrintDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Imprimir Contagem Regressiva
            </h3>

            <div className="space-y-4">
              <Input
                label="Título"
                type="text"
                value={countdownPrintSettings.title}
                onChange={(e) =>
                  setCountdownPrintSettings((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
              />

              <Input
                label="Subtítulo (Opcional)"
                type="text"
                value={countdownPrintSettings.subtitle}
                onChange={(e) =>
                  setCountdownPrintSettings((prev) => ({
                    ...prev,
                    subtitle: e.target.value,
                  }))
                }
                placeholder="Ex: Relatório de Março de 2026"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowCountdownPrintDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  executeCountdownPrint();
                  setShowCountdownPrintDialog(false);
                }}
                className="flex-1"
              >
                Imprimir
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SavingsGoalsPlayground;
