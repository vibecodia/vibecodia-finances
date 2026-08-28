import {
  Chart as ChartJS,
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
  Filler,
} from "chart.js";
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  format,
  subMonths,
} from "date-fns";
import {
  Filter,
  Search,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  Sparkles,
  Bot,
  Loader2,
  Clipboard,
  Check,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Doughnut, Pie, Line, Bar } from "react-chartjs-2";
import { useLocation, useNavigate } from "react-router-dom";

import { useTheme } from "../contexts/ThemeContext";
// import { ptBR } from 'date-fns/locale';
import { useLocalStorage } from "../hooks/trello/useLocalStorage";
import { useCategories } from "../hooks/useCategories";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import {
  Transaction,
  SavingsGoal,
  Category,
  StructuredNotes,
  ReceiptItem,
} from "../types";
import { getCategoryName, isPassiveIncome } from "../utils/categoryUtils";
import {
  buildCategoryDistributionChartData,
  buildPaymentMethodDistributionChartData,
} from "../utils/chartTransformers";
import {
  formatCurrency,
  formatPaymentMethod,
  parseLocalDate,
  formatBrazilDate,
  getCurrentBrazilDate,
  getTransactionsWithRecurrence,
} from "../utils/helpers";

import DateRangePicker from "./DateRangePicker";
import { MaximizedChartModal } from "./playground/MaximizedChartModal";
import { CategoriesSection } from "./playground/sections/CategoriesSection";
import { DiscountAnalysisSection } from "./playground/sections/DiscountAnalysisSection";
import { ExpenseTimelineSection } from "./playground/sections/ExpenseTimelineSection";
import { IncomeTimelineSection } from "./playground/sections/IncomeTimelineSection";
import { PassiveIncomeEvolutionSection } from "./playground/sections/PassiveIncomeEvolutionSection";
import { PaymentMethodsSection } from "./playground/sections/PaymentMethodsSection";
import { PriceEvolutionSection } from "./playground/sections/PriceEvolutionSection";
import { TransactionsTableSection } from "./playground/sections/TransactionsTableSection";
import { PlaygroundCardHeader } from "./ui/PlaygroundCardHeader";

const FinanciamentoCasaPlayground = React.lazy(
  () => import("./FinanciamentoCasaPlayground"),
);
const SavingsGoalsPlayground = React.lazy(
  () => import("./SavingsGoalsPlayground"),
);

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
  Filler,
);

interface TimelineDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  [key: string]: unknown;
}

interface TimelineChartData {
  labels: string[];
  datasets: TimelineDataset[];
  totalCount?: number;
  totalAmount?: number;
  noMatch?: boolean;
}

interface AIStats {
  near_limit?: boolean;
  usage_percentage: number;
  current_tokens: number;
  token_limit: number;
  [key: string]: unknown;
}

type NavigatorWithBadge = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
};

interface StackedBarElement {
  x: number;
  y: number;
  base: number;
  width?: number;
}

const stackedBarTotalPlugin = {
  id: "stackedBarTotal",
  afterDraw: (chart: ChartJS) => {
    const { ctx, scales, data } = chart;
    const y = scales.y as
      | (typeof scales.y & {
          options?: { stacked?: boolean; ticks?: { color?: string } };
        })
      | undefined;
    const x = scales.x;
    const chartType = (chart.config as { type?: string }).type;
    if (chartType !== "bar" || !y?.options?.stacked) return;

    ctx.save();

    // Draw totals at the top of each bar
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    const totals = new Array(data.labels?.length || 0).fill(0);
    data.datasets.forEach((dataset) => {
      dataset.data.forEach((val, i) => {
        if (typeof val === "number") {
          totals[i] += val;
        }
      });
    });

    data.labels?.forEach((_label: unknown, i: number) => {
      const xPos = x.getPixelForTick(i);
      const yPos = y.getPixelForValue(totals[i]);
      if (totals[i] > 0) {
        ctx.fillStyle = y.options?.ticks?.color || "#000";
        ctx.fillText(
          new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 0,
          }).format(totals[i]),
          xPos,
          yPos - 5,
        );
      }
    });

    // Draw individual segment values overlayed on the colors
    data.datasets.forEach((dataset, datasetIndex: number) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;

      meta.data.forEach((element, index: number) => {
        const bar = element as unknown as StackedBarElement;
        const rawVal = dataset.data[index];
        const value = typeof rawVal === "number" ? rawVal : 0;
        if (value > 0) {
          const height = Math.abs(bar.y - bar.base);
          const xPosInside = bar.x;
          const yPos = (bar.y + bar.base) / 2;

          // Format number concisely
          let label;
          if (value >= 1000) {
            label = (value / 1000).toFixed(1).replace(".0", "") + "k";
          } else {
            label = Math.round(value).toString();
          }

          ctx.save();
          if (height > 15) {
            // Draw inside the bar with a "High-Contrast Badge" style
            ctx.font = "bold 10px sans-serif";
            const textMetrics = ctx.measureText(label);
            const paddingX = 6;
            const paddingY = 2;
            const boxWidth = textMetrics.width + paddingX * 2;
            const boxHeight = 10 + paddingY * 2;

            const rectX = xPosInside - boxWidth / 2;
            const rectY = yPos - boxHeight / 2;

            // Draw semi-transparent background box
            ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(rectX, rectY, boxWidth, boxHeight, 4);
              ctx.fill();
            } else {
              ctx.fillRect(rectX, rectY, boxWidth, boxHeight);
            }

            // Draw text
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#ffffff";
            ctx.fillText(label, xPosInside, yPos);
          } else if (height > 4) {
            // Draw on the right side if too small but still visible
            ctx.font = "600 8px sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.shadowBlur = 0;
            ctx.fillStyle = y.options?.ticks?.color || "#666";
            const xPosOutside = bar.x + (bar.width || 0) / 2 + 3;
            ctx.fillText(label, xPosOutside, yPos);
          }
          ctx.restore();
        }
      });
    });

    ctx.restore();
  },
};
ChartJS.register(stackedBarTotalPlugin);

interface PlaygroundProps {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  onAddTransaction?: (
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ) => Promise<Transaction>;
}

interface LayoutItem {
  id: string;
  label: string;
  collapsed: boolean;
}

const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: "income_timeline", label: "Cronograma de Receitas", collapsed: false },
  {
    id: "passive_income_evolution",
    label: "Evolução dos Rendimentos Passivos",
    collapsed: false,
  },
  { id: "expense_timeline", label: "Cronograma de Despesas", collapsed: false },
  { id: "categories", label: "Distribuição por Categoria", collapsed: false },
  { id: "payments", label: "Distribuição por Pagamento", collapsed: false },
  { id: "table", label: "Planilha de Transações", collapsed: false },
  { id: "price_evolution", label: "Evolução de Preços", collapsed: false },
  { id: "discount_analysis", label: "Análise de Descontos", collapsed: false },
];

type PlaygroundFilterState = {
  startDate: string;
  endDate: string;
  selectedCategories: string[];
  selectedPaymentMethods: string[];
  searchTerm: string;
  typeFilter: "all" | "expense" | "income";
  statusFilter: "all" | "paid" | "pending";
  showDeleted: boolean;
  dateField: "date" | "createdAt";
  removedTransactionIds: string[];
};

const isValidYyyyMmDd = (value: string | null): value is string => {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

const parseCsvParam = (value: string | null): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const serializePlaygroundFiltersToSearch = (
  filters: PlaygroundFilterState,
  view: string | null,
): string => {
  const sp = new URLSearchParams();

  if (filters.startDate) sp.set("de", filters.startDate);
  if (filters.endDate) sp.set("ate", filters.endDate);
  if (filters.selectedCategories.length > 0)
    sp.set("categoria", filters.selectedCategories.join(","));
  if (filters.selectedPaymentMethods.length > 0)
    sp.set("pagamento", filters.selectedPaymentMethods.join(","));

  const trimmedSearch = filters.searchTerm.trim();
  if (trimmedSearch) sp.set("busca", trimmedSearch);
  if (filters.typeFilter !== "all") sp.set("tipo", filters.typeFilter);
  if (filters.statusFilter !== "all") sp.set("status", filters.statusFilter);
  if (filters.showDeleted) sp.set("excluidos", "1");
  if (filters.dateField !== "date") sp.set("campoDat", filters.dateField);
  if (filters.removedTransactionIds.length > 0)
    sp.set("removidos", filters.removedTransactionIds.join(","));
  if (view) sp.set("view", view);

  return sp.toString();
};

const Playground: React.FC<PlaygroundProps> = ({
  transactions,
  savingsGoals,
  onAddTransaction,
}) => {
  const { theme } = useTheme();
  const { expenseCategories, incomeCategories } = useCategories();
  const { paymentMethods } = usePaymentMethods();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "transactions" | "savings" | "financiamento"
  >("transactions");
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  // Using a new version key to reset layout to the simplified structure
  const [layout, setLayout] = useLocalStorage<LayoutItem[]>(
    "playground_layout_v8",
    DEFAULT_LAYOUT,
  );
  const [showFilters, setShowFilters] = useLocalStorage<boolean>(
    "playground_show_filters",
    true,
  );
  const tableRef = useRef<HTMLDivElement>(null);
  const incomeChartRef = useRef<ChartJS | null>(null);
  const passiveIncomeChartRef = useRef<ChartJS | null>(null);
  const expenseChartRef = useRef<ChartJS | null>(null);
  const categoryChartRef = useRef<ChartJS | null>(null);
  const paymentChartRef = useRef<ChartJS | null>(null);
  const priceChartRef = useRef<ChartJS | null>(null);
  const discountChartRef = useRef<ChartJS | null>(null);
  const maximizedChartRef = useRef<ChartJS | null>(null);

  const setChartRef =
    (refObj: React.MutableRefObject<ChartJS | null>) =>
    (instance: unknown) => {
      refObj.current = (instance as ChartJS) || null;
    };

  useEffect(() => {
    setLayout((prev) => {
      if (prev.some((i) => i.id === "discount_analysis")) return prev;
      return [
        ...prev,
        {
          id: "discount_analysis",
          label: "Análise de Descontos",
          collapsed: false,
        },
      ];
    });
  }, []);

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

  // Filters State
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(getCurrentBrazilDate()), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState<string>(
    format(endOfMonth(getCurrentBrazilDate()), "yyyy-MM-dd"),
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<
    string[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expenseItemSearch, setExpenseItemSearch] = useState("");
  const [priceEvolutionItemSearch, setPriceEvolutionItemSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">(
    "all",
  );
  const [showDeleted, setShowDeleted] = useState(false);
  const [dateField, setDateField] = useState<"date" | "createdAt">("date");
  const [visibleDatasets, setVisibleDatasets] = useState<string[]>([]);

  const getTransactionDateSource = (t: Transaction): string => {
    if (dateField === "createdAt") return t.createdAt || t.date;
    if (t.type === "expense" && t.dueDate) return t.dueDate;
    return t.date;
  };

  const dateColumnLabel = dateField === "createdAt" ? "Criação" : "Vencimento";

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (startDate) count++;
    if (endDate) count++;
    count += selectedCategories.length;
    count += selectedPaymentMethods.length;
    if (searchTerm.trim()) count++;
    if (typeFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    if (showDeleted) count++;
    if (dateField !== "date") count++;
    return count;
  }, [
    startDate,
    endDate,
    selectedCategories.length,
    selectedPaymentMethods.length,
    searchTerm,
    typeFilter,
    statusFilter,
    showDeleted,
    dateField,
  ]);

  // Removed Transactions State
  const [removedTransactionIds, setRemovedTransactionIds] = useState<string[]>(
    [],
  );

  // Sort State
  const [sortBy, setSortBy] = useState<
    "date" | "description" | "category" | "paymentMethod" | "amount"
  >("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Print Dialog State
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    title: "Planilha de Transações",
    subtitle: "",
  });

  const [showChartPrintDialog, setShowChartPrintDialog] = useState(false);
  const [chartPrintSettings, setChartPrintSettings] = useState({
    title: "Cronograma de Despesas",
    subtitle: "",
  });

  // Price Comparison State
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiStats, setAiStats] = useState<AIStats | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [showAIObsModal, setShowAIObsModal] = useState(false);
  const [aiObservation, setAiObservation] = useState("");

  const isFocusMode = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get("view") === "focus";
  }, [location.search]);

  useEffect(() => {
    if (isFocusMode) {
      document.body.classList.add("shortcut-focus-mode");
      // Ensure the table is expanded in focus mode, only update if needed
      setLayout((prev) => {
        const tableItem = prev.find((item) => item.id === "table");
        if (tableItem && tableItem.collapsed) {
          return prev.map((item) =>
            item.id === "table" ? { ...item, collapsed: false } : item,
          );
        }
        return prev;
      });
    } else {
      document.body.classList.remove("shortcut-focus-mode");
    }
    return () => {
      document.body.classList.remove("shortcut-focus-mode");
    };
  }, [isFocusMode, setLayout]);

  const copyToClipboard = () => {
    if (!aiAnalysis) return;
    navigator.clipboard.writeText(aiAnalysis);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const didInitFiltersFromUrlRef = useRef(false);
  const skipFirstUrlSyncRef = useRef(true);

  useEffect(() => {
    if (didInitFiltersFromUrlRef.current) return;
    didInitFiltersFromUrlRef.current = true;

    const sp = new URLSearchParams(location.search);

    const de = sp.get("de");
    const ate = sp.get("ate");
    const categoria = sp.get("categoria");
    const pagamento = sp.get("pagamento");
    const busca = sp.get("busca");
    const tipo = sp.get("tipo");
    const status = sp.get("status");
    const excluidos = sp.get("excluidos");
    const campoDat = sp.get("campoDat");
    const removidos = sp.get("removidos");

    if (isValidYyyyMmDd(de)) setStartDate(de);
    if (isValidYyyyMmDd(ate)) setEndDate(ate);
    if (categoria !== null) setSelectedCategories(parseCsvParam(categoria));
    if (pagamento !== null) setSelectedPaymentMethods(parseCsvParam(pagamento));
    if (busca !== null) setSearchTerm(busca);
    if (tipo === "all" || tipo === "income" || tipo === "expense")
      setTypeFilter(tipo);
    if (status === "all" || status === "paid" || status === "pending")
      setStatusFilter(status);
    if (excluidos !== null)
      setShowDeleted(excluidos === "1" || excluidos === "true");
    if (campoDat === "createdAt") setDateField("createdAt");
    if (removidos !== null) setRemovedTransactionIds(parseCsvParam(removidos));
  }, [location.search]);

  useEffect(() => {
    if (skipFirstUrlSyncRef.current) {
      skipFirstUrlSyncRef.current = false;
      return;
    }

    const nextSearchString = serializePlaygroundFiltersToSearch(
      {
        startDate,
        endDate,
        selectedCategories,
        selectedPaymentMethods,
        searchTerm,
        typeFilter,
        statusFilter,
        showDeleted,
        dateField,
        removedTransactionIds,
      },
      isFocusMode ? "focus" : null,
    );

    const currentSearchString = location.search.startsWith("?")
      ? location.search.slice(1)
      : location.search;
    if (nextSearchString === currentSearchString) return;

    navigate(
      {
        pathname: location.pathname,
        search: nextSearchString ? `?${nextSearchString}` : "",
      },
      { replace: true },
    );
  }, [
    startDate,
    endDate,
    selectedCategories,
    selectedPaymentMethods,
    searchTerm,
    typeFilter,
    statusFilter,
    showDeleted,
    dateField,
    removedTransactionIds,
    location.pathname,
    location.search,
    navigate,
  ]);

  const handleShareUrl = async () => {
    const nextSearchString = serializePlaygroundFiltersToSearch(
      {
        startDate,
        endDate,
        selectedCategories,
        selectedPaymentMethods,
        searchTerm,
        typeFilter,
        statusFilter,
        showDeleted,
        dateField,
        removedTransactionIds,
      },
      isFocusMode ? "focus" : null,
    );

    const currentSearchString = location.search.startsWith("?")
      ? location.search.slice(1)
      : location.search;
    if (nextSearchString !== currentSearchString) {
      navigate(
        {
          pathname: location.pathname,
          search: nextSearchString ? `?${nextSearchString}` : "",
        },
        { replace: true },
      );
    }

    const url = new URL(window.location.href);
    url.search = nextSearchString ? `?${nextSearchString}` : "";
    const shareUrl = url.toString();

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setIsShareCopied(true);
    setTimeout(() => setIsShareCopied(false), 2000);
  };

  const formatAIText = (text: string) => {
    return text
      .replace(/\n/g, "<br/>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");
  };

  const handleAnalyzeWithAI = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    setAiStats(null);
    setShowAIObsModal(false);

    // Prepare data summary
    const totalIncome = filteredTransactions
      .filter((t: Transaction) => t.type === "income")
      .reduce((acc: number, t: Transaction) => acc + t.amount, 0);
    const totalExpense = filteredTransactions
      .filter((t: Transaction) => t.type === "expense")
      .reduce((acc: number, t: Transaction) => acc + t.amount, 0);
    const balance = totalIncome - totalExpense;

    // Prepare active filters summary
    const activeFilters: string[] = [];
    if (selectedCategories.length > 0)
      activeFilters.push(`Categorias: ${selectedCategories.join(", ")}`);
    if (selectedPaymentMethods.length > 0)
      activeFilters.push(`Métodos: ${selectedPaymentMethods.join(", ")}`);
    if (searchTerm) activeFilters.push(`Busca: "${searchTerm}"`);
    if (typeFilter !== "all")
      activeFilters.push(
        `Tipo: ${typeFilter === "income" ? "Apenas Receitas" : "Apenas Despesas"}`,
      );
    if (statusFilter !== "all") activeFilters.push(`Status: ${statusFilter}`);

    const filterContext =
      activeFilters.length > 0
        ? `⚠️ ATENÇÃO: Os dados estão FILTRADOS por: ${activeFilters.join(" | ")}. Analise APENAS o que está visível e não considere a ausência de receitas/despesas como um erro se o filtro for específico.`
        : "Análise de visão geral (sem filtros ativos).";

    const categorySummary =
      categoryChartData.labels?.map(
        (label: string, i: number) =>
          `${label}: ${formatCurrency(categoryChartData.datasets[0].data[i] as number)}`,
      ) || [];

    const payments =
      paymentChartData.labels?.map(
        (label: string, i: number) =>
          `${label}: ${formatCurrency(paymentChartData.datasets[0].data[i] as number)}`,
      ) || [];

    const topExpenses = filteredTransactions
      .filter((t: Transaction) => t.type === "expense")
      .sort((a: Transaction, b: Transaction) => b.amount - a.amount)
      .slice(0, 5)
      .map(
        (t: Transaction) =>
          `- ${t.description}: ${formatCurrency(t.amount)} (${getCategoryName(categories, t.category)})`,
      );

    const expenseRatio =
      totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

    let prompt = `Você é um Analista Financeiro Sênior. 
CONTEXTO:
- Período: ${startDate} até ${endDate}
- ${filterContext}

DADOS:
- RECEITA: ${formatCurrency(totalIncome)}
- DESPESA: ${formatCurrency(totalExpense)}
- SALDO: ${formatCurrency(balance)} ${totalIncome > 0 ? `(${expenseRatio.toFixed(1)}% comprometido)` : ""}

CATEGORIAS:
${categorySummary.join("\n")}

PAGAMENTOS:
${payments.join("\n")}

MAIORES GASTOS:
${topExpenses.join("\n")}

INSTRUÇÕES:
1. Analise os dados fornecidos. Se houver filtros, foque no que está visível.
2. Identifique o padrão de consumo no período.
3. Formate a resposta exatamente assim:
   - 📌 **DIAGNÓSTICO DO PERÍODO** (Resumo específico)
   - 🕵️ **ANÁLISE DE PADRÃO** (O que os dados revelam)
   - 🚀 **RECOMENDAÇÃO ESTRATÉGICA** (Sugestões práticas).`;

    if (aiObservation.trim()) {
      prompt += `\n\n⚠️ **OBSERVAÇÃO DO USUÁRIO:**\n${aiObservation.trim()}\n(Leve esta observação em conta na sua análise).`;
    }

    try {
      // Usando o proxy local para evitar problemas de CORS
      const response = await fetch("/api/ai-proxy", {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          persona: "finances",
          message: prompt,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) throw new Error("Falha na resposta da API via Proxy");

      const data = await response.json();
      console.log("🤖 Resposta bruta da IA:", data);

      // Salvar estatísticas de token se existirem
      if (data.token_stats) {
        setAiStats(data.token_stats);
      }

      // Mapeamento resiliente para a resposta da IA
      let responseText = "";

      if (typeof data === "string") {
        responseText = data;
      } else if (data) {
        // Tenta encontrar o texto em diversos campos possíveis
        responseText =
          data.assistant_reply ||
          data.content ||
          data.response ||
          data.message ||
          data.text ||
          data.analysis ||
          (data.choices && data.choices[0]?.message?.content) ||
          (data.data && (data.data.assistant_reply || data.data.content)) ||
          "";
      }

      // Se ainda estiver vazio mas o objeto parece válido, pode ser um erro de geração
      if (
        !responseText &&
        data &&
        (data.assistant_reply === "" || data.content === "")
      ) {
        responseText =
          "A IA processou a requisição, mas retornou uma resposta vazia. Tente ajustar os filtros ou a observação.";
      } else if (!responseText) {
        responseText =
          "Análise concluída, mas o formato da resposta é desconhecido.";
        console.warn("⚠️ Resposta da IA com formato não mapeado:", data);
      }

      setAiAnalysis(responseText);
    } catch (error) {
      console.error("Erro ao analisar com IA:", error);
      setAiAnalysis(
        "Desculpe, ocorreu um erro ao tentar processar sua análise. Por favor, tente novamente mais tarde.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Income Timeline Grouping State
  const [incomeGroupBy, setIncomeGroupBy] = useState<
    "category" | "description"
  >("category");

  // Income Comparison Mode State
  const [incomeMode, setIncomeMode] = useState<"range" | "comparison">("range");
  const [incomeComparisonMonth1, setIncomeComparisonMonth1] = useState<string>(
    format(getCurrentBrazilDate(), "yyyy-MM"),
  );
  const [incomeComparisonMonth2, setIncomeComparisonMonth2] = useState<string>(
    format(subMonths(getCurrentBrazilDate(), 1), "yyyy-MM"),
  );

  // Expense Timeline Grouping State
  const [expenseGroupBy, setExpenseGroupBy] = useState<
    "category" | "paymentMethod"
  >("category");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<
    "all" | "paid" | "pending"
  >("all");
  const [expenseDateField, setExpenseDateField] = useState<
    "date" | "createdAt"
  >("date");

  const toggleExpenseTimeRange = () => {
    if (transactions.length === 0) return;

    const startOfCurrentMonth = format(
      startOfMonth(getCurrentBrazilDate()),
      "yyyy-MM-dd",
    );
    const endOfCurrentMonth = format(
      endOfMonth(getCurrentBrazilDate()),
      "yyyy-MM-dd",
    );

    // If it's already NOT the current month (could be all time or any other), we reset to current month
    // OR if we want to be specific about "is it all time?", we calculate min/max
    const dates = transactions
      .map((t) => parseLocalDate(t.date).getTime())
      .filter((d) => !isNaN(d));

    if (dates.length === 0) return;

    const minDateStr = format(new Date(Math.min(...dates)), "yyyy-MM-dd");
    const maxDateStr = format(new Date(Math.max(...dates)), "yyyy-MM-dd");

    const isCurrentlyAllTime =
      expenseTimelineStartDate === minDateStr &&
      expenseTimelineEndDate === maxDateStr;

    if (isCurrentlyAllTime) {
      // Switch to Current Month
      setExpenseTimelineStartDate(startOfCurrentMonth);
      setExpenseTimelineEndDate(endOfCurrentMonth);
    } else {
      // Switch to All Time
      setExpenseTimelineStartDate(minDateStr);
      setExpenseTimelineEndDate(maxDateStr);
    }
    setExpenseMode("range");
  };

  // Expense Timeline Date Range State (default to last 6 months for better closing view)
  const [expenseTimelineStartDate, setExpenseTimelineStartDate] =
    useState<string>(
      format(startOfMonth(subMonths(getCurrentBrazilDate(), 6)), "yyyy-MM-dd"),
    );
  const [expenseTimelineEndDate, setExpenseTimelineEndDate] = useState<string>(
    format(endOfMonth(getCurrentBrazilDate()), "yyyy-MM-dd"),
  );

  // Expense Comparison Mode State
  const [expenseMode, setExpenseMode] = useState<"range" | "comparison">(
    "range",
  );
  const [expenseComparisonMonth1, setExpenseComparisonMonth1] =
    useState<string>(format(getCurrentBrazilDate(), "yyyy-MM"));
  const [expenseComparisonMonth2, setExpenseComparisonMonth2] =
    useState<string>(format(subMonths(getCurrentBrazilDate(), 1), "yyyy-MM"));

  const categories = [...expenseCategories, ...incomeCategories];

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Skip removed transactions (manual playground hide)
      if (removedTransactionIds.includes(t.id)) return false;

      // Handle soft-deleted status
      if (showDeleted) {
        if (t.status !== "deleted") return false;
      } else {
        if (t.status === "deleted") return false;
      }

      const date = parseLocalDate(getTransactionDateSource(t));
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);

      const isInDateRange = isWithinInterval(date, { start, end });
      const isInCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(getCategoryName(categories, t.category));
      const isInPaymentMethod =
        selectedPaymentMethods.length === 0 ||
        (t.paymentMethod &&
          selectedPaymentMethods.includes(
            formatPaymentMethod(t.paymentMethod),
          ));
      const searchTerms = searchTerm
        .split(",")
        .map((term) => term.trim().toLowerCase())
        .filter((term) => term.length >= 1);

      const matchesSearch =
        searchTerms.length === 0 ||
        searchTerms.some((term) => t.description.toLowerCase().includes(term));
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "paid" ? t.isPaid : !t.isPaid);

      return (
        isInDateRange &&
        isInCategory &&
        isInPaymentMethod &&
        matchesSearch &&
        matchesType &&
        matchesStatus
      );
    });
  }, [
    transactions,
    startDate,
    endDate,
    selectedCategories,
    selectedPaymentMethods,
    searchTerm,
    typeFilter,
    statusFilter,
    removedTransactionIds,
    showDeleted,
    dateField,
  ]);

  const todayPendingCount = useMemo(() => {
    const now = getCurrentBrazilDate();

    // Início e fim do dia para expansão de recorrência
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );

    // Expande recorrências para o dia de hoje
    const allOccurrences = getTransactionsWithRecurrence(
      transactions,
      startOfDay,
      endOfDay,
    );

    // Filtra apenas as pendências (não pagas e não deletadas)
    return allOccurrences.filter((t) => !t.isPaid && t.status !== "deleted")
      .length;
  }, [transactions]);

  useEffect(() => {
    const nav = navigator as NavigatorWithBadge;
    if (nav.setAppBadge) {
      const updateBadge = () => {
        if (todayPendingCount > 0) {
          nav.setAppBadge?.(todayPendingCount).catch(() => {});
        } else {
          nav.clearAppBadge?.().catch(() => {});
        }
      };

      // Pequeno delay para não competir com a renderização dos gráficos
      const timer = setTimeout(updateBadge, 100);
      return () => clearTimeout(timer);
    }
  }, [todayPendingCount]);

  // Chart Data: Category Distribution
  const categoryChartData = useMemo(() => {
    return buildCategoryDistributionChartData(
      filteredTransactions,
      categories,
      theme.cardBackground,
    );
  }, [filteredTransactions, categories, theme.cardBackground]);

  // Chart Data: Payment Method Distribution
  const paymentChartData = useMemo(() => {
    return buildPaymentMethodDistributionChartData(
      filteredTransactions,
      theme.cardBackground,
    );
  }, [filteredTransactions, theme.cardBackground]);

  // Income Timeline Chart Data
  const incomeTimelineChartData = useMemo(() => {
    const incomeTransactions = transactions.filter((t: Transaction) => {
      const isIncome = t.type === "income";
      if (!isIncome) return false;

      // Handle soft-deleted status
      if (showDeleted) {
        if (t.status !== "deleted") return false;
      } else {
        if (t.status === "deleted") return false;
      }

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "paid" ? t.isPaid : !t.isPaid);
      if (!matchesStatus) return false;

      const date = parseLocalDate(t.date);

      if (incomeMode === "range") {
        const start = parseLocalDate(startDate);
        const end = parseLocalDate(endDate);
        return isWithinInterval(date, { start, end });
      } else {
        const monthKey = format(date, "yyyy-MM");
        return (
          monthKey === incomeComparisonMonth1 ||
          monthKey === incomeComparisonMonth2
        );
      }
    });
    const groupedData: Record<string, Record<string, number>> = {};
    const labelsInOrder: string[] = [];

    // Group by selected criteria (description or category)
    incomeTransactions
      .sort(
        (a: Transaction, b: Transaction) =>
          parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
      )
      .forEach((t: Transaction) => {
        const date = parseLocalDate(t.date);
        const dateStr =
          incomeMode === "range"
            ? formatBrazilDate(t.date, "dd/MM/yy")
            : format(date, "MMM/yy");
        const groupKey =
          incomeGroupBy === "category"
            ? getCategoryName(categories, t.category)
            : t.description;

        if (!groupedData[dateStr]) {
          groupedData[dateStr] = {};
          labelsInOrder.push(dateStr);
        }
        groupedData[dateStr][groupKey] =
          (groupedData[dateStr][groupKey] || 0) + t.amount;
      });

    const sortedDates =
      incomeMode === "range"
        ? labelsInOrder
        : Array.from(new Set(labelsInOrder));

    // Get all unique group keys
    const allGroupKeys = Array.from(
      new Set(
        Object.values(groupedData).flatMap((dateData) => Object.keys(dateData)),
      ),
    );

    const colors = [
      "#4CAF50",
      "#2196F3",
      "#FF9800",
      "#E91E63",
      "#9C27B0",
      "#00BCD4",
      "#4FC3F7",
      "#66BB6A",
      "#FFA726",
      "#AB47BC",
      "#EC407A",
      "#29B6F6",
    ];

    const datasets = allGroupKeys.map((key, idx) => ({
      label: key,
      data: sortedDates.map((date) => groupedData[date][key] || 0),
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length] + "33",
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: colors[idx % colors.length],
      pointBorderColor: theme.cardBackground,
      pointBorderWidth: 1,
    }));

    return {
      labels: sortedDates,
      datasets,
    };
  }, [
    transactions,
    incomeGroupBy,
    statusFilter,
    theme.cardBackground,
    startDate,
    endDate,
    incomeMode,
    incomeComparisonMonth1,
    incomeComparisonMonth2,
    showDeleted,
  ]);

  // Passive Income Evolution Chart Data
  const passiveIncomeEvolutionChartData = useMemo(() => {
    const passiveTransactions = transactions.filter(
      (t) =>
        t.type === "income" &&
        t.status !== "deleted" &&
        isPassiveIncome(t.category, categories),
    );

    const groupedData: Record<string, number> = {};
    const labelsInOrder: string[] = [];

    passiveTransactions
      .sort(
        (a, b) =>
          parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
      )
      .forEach((t) => {
        const date = parseLocalDate(t.date);
        const dateStr = format(date, "MMM/yy");

        if (!groupedData[dateStr]) {
          labelsInOrder.push(dateStr);
        }
        groupedData[dateStr] = (groupedData[dateStr] || 0) + t.amount;
      });

    const uniqueLabels = Array.from(new Set(labelsInOrder));

    return {
      labels: uniqueLabels,
      datasets: [
        {
          label: "Rendimentos",
          data: uniqueLabels.map((label) => groupedData[label]),
          borderColor: "#F97316",
          backgroundColor: "#F9731633",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointBackgroundColor: "#F97316",
          pointBorderColor: theme.cardBackground,
          pointBorderWidth: 2,
        },
      ],
    };
  }, [transactions, theme.cardBackground]);

  // Helper to normalize item names for better grouping
  const normalizeItemName = (name: string): string => {
    if (!name) return "";
    let normalized = name.toLowerCase().trim();
    
    // Remove common weight/volume units and numbers (e.g., "1kg", "500g", "2L", "10un")
    const unitPatterns = [
      /\b\d+([.,]\d+)?\s*(kg|g|mg|l|ml|litro(s)?|litro(s)?|un|unidade(s)?|pct|pacote(s)?|pac|kg|g|ml|l)\b/gi,
      /\b(kg|g|mg|l|ml|litro(s)?|litro(s)?|un|unidade(s)?|pct|pacote(s)?|pac)\s*\d+([.,]\d+)?\b/gi,
    ];
    unitPatterns.forEach(pattern => {
      normalized = normalized.replace(pattern, "");
    });
    
    // Remove extra spaces
    normalized = normalized.replace(/\s+/g, " ").trim();
    
    // Remove common suffixes/prefixes that don't change the product
    normalized = normalized.replace(/\b(xyz|abc|123|original|novo|novo\s+produto)\b/gi, "");
    
    // Remove extra spaces again
    normalized = normalized.replace(/\s+/g, " ").trim();
    
    return normalized;
  };

  // Extract Items from Notes for Price Comparison with normalization
  const allItems = useMemo(() => {
    const itemsMap: Record<string, { date: string; price: number; originalName: string }[]> = {};
    const nameMapping: Record<string, string> = {}; // maps normalized name to a "prettiest" original name

    transactions.forEach((t: Transaction) => {
      // Handle soft-deleted status
      if (showDeleted) {
        if (t.status !== "deleted") return;
      } else {
        if (t.status === "deleted") return;
      }

      let items: ReceiptItem[] = [];
      if (t.notes) {
        if (
          typeof t.notes === "object" &&
          t.notes !== null &&
          "items" in t.notes &&
          Array.isArray((t.notes as StructuredNotes).items)
        ) {
          items = (t.notes as StructuredNotes).items || [];
        } else if (typeof t.notes === "string") {
          try {
            const parsed = JSON.parse(t.notes);
            if (Array.isArray(parsed.items)) {
              items = parsed.items;
            }
          } catch {
            // Not JSON
          }
        }
      }

      items.forEach((item) => {
        const originalName = item.description || item.name;
        const price = item.unitPrice || item.price;
        if (originalName && typeof price === "number") {
          const normalized = normalizeItemName(originalName);
          
          // Skip discount items
          if (originalName.toLowerCase().includes("descontos")) return;
          
          // Choose the shortest original name as the "pretty" one for display
          if (!nameMapping[normalized] || originalName.length < nameMapping[normalized].length) {
            nameMapping[normalized] = originalName;
          }
          
          const displayName = nameMapping[normalized];
          if (!itemsMap[displayName]) itemsMap[displayName] = [];
          itemsMap[displayName].push({ date: t.date, price, originalName });
        }
      });
    });

    return itemsMap;
  }, [transactions, showDeleted]);

  const sortedItemNames = useMemo(() => {
    const keys = Object.keys(allItems);
    const searchLower = priceEvolutionItemSearch.toLowerCase().trim();
    
    let filteredKeys = keys;
    if (searchLower) {
      filteredKeys = keys.filter(name => name.toLowerCase().includes(searchLower));
    }
    
    // Separate duplicates (items with multiple prices) from unique items
    const duplicates = filteredKeys.filter((name) => allItems[name].length > 1).sort();
    const unique = filteredKeys.filter((name) => allItems[name].length === 1).sort();
    // Put duplicates on top
    return [...duplicates, ...unique];
  }, [allItems, priceEvolutionItemSearch]);

  // Expense Timeline Chart Data
  const expenseTimelineChartData: TimelineChartData = useMemo(() => {
    const getExpenseTimelineDateSource = (t: Transaction): string => {
      if (expenseDateField === "createdAt") return t.createdAt || t.date;
      return t.date;
    };

    const searchTerms = expenseItemSearch
      .split(",")
      .map((term) => term.trim().toLowerCase())
      .filter((term) => term.length >= 2);

    if (searchTerms.length > 0) {
      // Filter transactions by ANY of the search terms AND date range
      const matchedTransactions = transactions.filter((t) => {
        const isExpense = t.type === "expense";
        if (!isExpense) return false;

        // Handle soft-deleted status
        if (showDeleted) {
          if (t.status !== "deleted") return false;
        } else {
          if (t.status === "deleted") return false;
        }

        // Multiple Search match: Check if description matches ANY of the terms
        const desc = t.description.toLowerCase();
        if (!searchTerms.some((term) => desc.includes(term))) return false;

        // Filter by global categories/payment methods
        const isInCategory =
          selectedCategories.length === 0 ||
          selectedCategories.includes(getCategoryName(categories, t.category));
        const isInPaymentMethod =
          selectedPaymentMethods.length === 0 ||
          (t.paymentMethod &&
            selectedPaymentMethods.includes(
              formatPaymentMethod(t.paymentMethod),
            ));

        if (!isInCategory || !isInPaymentMethod) return false;

        // Date match
        const date = parseLocalDate(getExpenseTimelineDateSource(t));
        if (expenseMode === "range") {
          const start = parseLocalDate(expenseTimelineStartDate);
          const end = parseLocalDate(expenseTimelineEndDate);
          return isWithinInterval(date, { start, end });
        } else {
          const monthKey = format(date, "yyyy-MM");
          return (
            monthKey === expenseComparisonMonth1 ||
            monthKey === expenseComparisonMonth2
          );
        }
      });

      if (matchedTransactions.length > 0) {
        // Sort first to ensure chronological month collection
        const sortedMatched = [...matchedTransactions].sort(
          (a, b) =>
            parseLocalDate(getExpenseTimelineDateSource(a)).getTime() -
            parseLocalDate(getExpenseTimelineDateSource(b)).getTime(),
        );

        // Group by Description (Case-Insensitive) AND Month
        const groupedData: Record<string, Record<string, number>> = {};
        const prettyNames: Record<string, string> = {};
        const chronologicalMonths: string[] = [];
        const normalizedDescriptions = new Set<string>();

        sortedMatched.forEach((t) => {
          const date = parseLocalDate(getExpenseTimelineDateSource(t));
          const monthKey = format(date, "MMM/yy");
          const originalDesc = t.description;
          const normalizedDesc = originalDesc.toLowerCase().trim();

          if (!groupedData[normalizedDesc]) {
            groupedData[normalizedDesc] = {};
            prettyNames[normalizedDesc] = originalDesc;
          }
          groupedData[normalizedDesc][monthKey] =
            (groupedData[normalizedDesc][monthKey] || 0) + t.amount;

          if (!chronologicalMonths.includes(monthKey)) {
            chronologicalMonths.push(monthKey);
          }
          normalizedDescriptions.add(normalizedDesc);
        });

        const colors = [
          "#EF4444",
          "#F97316",
          "#F59E0B",
          "#10B981",
          "#3B82F6",
          "#6366F1",
          "#8B5CF6",
          "#EC4899",
          "#64748B",
          "#06B6D4",
          "#84CC16",
          "#0891B2",
        ];

        const datasets = Array.from(normalizedDescriptions).map(
          (normDesc, idx) => ({
            label: prettyNames[normDesc],
            data: chronologicalMonths.map((m) => groupedData[normDesc][m] || 0),
            borderColor: colors[idx % colors.length],
            backgroundColor: colors[idx % colors.length] + "33",
            fill: false,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: colors[idx % colors.length],
            pointBorderColor: theme.cardBackground,
            pointBorderWidth: 1,
          }),
        );

        return {
          labels: chronologicalMonths,
          datasets,
          isItemSearch: true,
          totalAmount: matchedTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          ),
          totalCount: matchedTransactions.length,
          noMatch: false,
        };
      } else {
        return {
          labels: [],
          datasets: [],
          isItemSearch: true,
          totalAmount: 0,
          totalCount: 0,
          noMatch: true,
        };
      }
    }

    const expenseTransactions = transactions.filter((t: Transaction) => {
      const isExpense = t.type === "expense";
      if (!isExpense) return false;

      // Handle soft-deleted status
      if (showDeleted) {
        if (t.status !== "deleted") return false;
      } else {
        if (t.status === "deleted") return false;
      }

      const matchesStatus =
        expenseStatusFilter === "all" ||
        (expenseStatusFilter === "paid" ? t.isPaid : !t.isPaid);
      if (!matchesStatus) return false;

      // Filter by global categories/payment methods
      const isInCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(getCategoryName(categories, t.category));
      const isInPaymentMethod =
        selectedPaymentMethods.length === 0 ||
        (t.paymentMethod &&
          selectedPaymentMethods.includes(
            formatPaymentMethod(t.paymentMethod),
          ));

      if (!isInCategory || !isInPaymentMethod) return false;

      const date = parseLocalDate(getExpenseTimelineDateSource(t));

      if (expenseMode === "range") {
        const start = parseLocalDate(expenseTimelineStartDate);
        const end = parseLocalDate(expenseTimelineEndDate);
        return isWithinInterval(date, { start, end });
      } else {
        const monthKey = format(date, "yyyy-MM");
        return (
          monthKey === expenseComparisonMonth1 ||
          monthKey === expenseComparisonMonth2
        );
      }
    });
    const groupedData: Record<string, Record<string, number>> = {};
    const labelsInOrder: string[] = [];

    // Group by month/year and selected criteria (description or category)
    expenseTransactions
      .sort(
        (a: Transaction, b: Transaction) =>
          parseLocalDate(getExpenseTimelineDateSource(a)).getTime() -
          parseLocalDate(getExpenseTimelineDateSource(b)).getTime(),
      )
      .forEach((t: Transaction) => {
        const date = parseLocalDate(getExpenseTimelineDateSource(t));
        const dateStr = format(date, "MMM/yy"); // e.g., Jan/26
        const groupKey =
          expenseGroupBy === "category"
            ? getCategoryName(categories, t.category)
            : t.paymentMethod
              ? formatPaymentMethod(t.paymentMethod)
              : "Sem Pagamento";

        if (!groupedData[dateStr]) {
          groupedData[dateStr] = {};
          labelsInOrder.push(dateStr);
        }
        groupedData[dateStr][groupKey] =
          (groupedData[dateStr][groupKey] || 0) + t.amount;
      });

    const sortedDates = Array.from(new Set(labelsInOrder));

    // Get all unique group keys
    const allGroupKeys = Array.from(
      new Set(
        Object.values(groupedData).flatMap((dateData) => Object.keys(dateData)),
      ),
    );

    const colors = [
      "#EF4444",
      "#F97316",
      "#F59E0B",
      "#10B981",
      "#3B82F6",
      "#6366F1",
      "#8B5CF6",
      "#EC4899",
      "#64748B",
      "#06B6D4",
      "#84CC16",
      "#0891B2",
    ];

    const datasets = allGroupKeys.map((key, idx) => ({
      label: key,
      data: sortedDates.map((date) => groupedData[date][key] || 0),
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length] + "33",
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: colors[idx % colors.length],
      pointBorderColor: theme.cardBackground,
      pointBorderWidth: 1,
    }));

    return {
      labels: sortedDates,
      datasets,
      totalAmount: expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
      totalCount: expenseTransactions.length,
    };
  }, [
    transactions,
    expenseGroupBy,
    expenseStatusFilter,
    theme.cardBackground,
    expenseTimelineStartDate,
    expenseTimelineEndDate,
    expenseMode,
    expenseComparisonMonth1,
    expenseComparisonMonth2,
    showDeleted,
    expenseDateField,
    expenseItemSearch,
    allItems,
    selectedCategories,
    selectedPaymentMethods,
  ]);

  // Sync visible datasets when data changes
  useEffect(() => {
    if (expenseTimelineChartData.datasets) {
      setVisibleDatasets(
        expenseTimelineChartData.datasets.map((d: TimelineDataset) => d.label),
      );
    }
  }, [expenseTimelineChartData]);

  // ── Average expense calculation for the badge ──
  const totalExpensesWithContext = useMemo(() => {
    const chartData = expenseTimelineChartData;
    if (!chartData?.datasets) return 0;

    // Only sum datasets that are currently visible
    let sum = 0;
    chartData.datasets.forEach((ds: TimelineDataset) => {
      if (visibleDatasets.includes(ds.label)) {
        ds.data.forEach((val: number) => {
          sum += val;
        });
      }
    });
    return sum;
  }, [expenseTimelineChartData, visibleDatasets]);

  const monthsCount = expenseTimelineChartData.labels?.length || 1;
  const averageExpense =
    monthsCount > 0 ? totalExpensesWithContext / monthsCount : 0;

  const showAverage =
    visibleDatasets.length >= 1 &&
    visibleDatasets.length <= 2 &&
    totalExpensesWithContext > 0 &&
    monthsCount > 0;
  // ── end average ──

  // Price Evolution Chart Data
  const priceChartData = useMemo(() => {
    if (!selectedItem || !allItems[selectedItem]) return null;

    const dataPoints = allItems[selectedItem].sort(
      (a, b) =>
        parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
    );

    return {
      labels: dataPoints.map((dp) => formatBrazilDate(dp.date, "dd/MM/yyyy")),
      datasets: [
        {
          label: `Preço de ${selectedItem}`,
          data: dataPoints.map((dp) => dp.price),
          borderColor: theme.primary,
          backgroundColor: theme.primary + "33",
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [selectedItem, allItems, theme.primary]);

  const weekdaysPt = useMemo(
    () => ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const,
    [],
  );
  const weekdaysPtMondayFirst = useMemo(
    () => ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const,
    [],
  );

  const discountEvents = useMemo(() => {
    const events: {
      store: string;
      weekday: (typeof weekdaysPt)[number];
      discount: number;
    }[] = [];

    filteredTransactions.forEach((t: Transaction) => {
      if (!t?.notes) return;

      let notes: StructuredNotes | null = null;
      if (typeof t.notes === "object" && t.notes !== null) {
        notes = t.notes as StructuredNotes;
      } else if (typeof t.notes === "string") {
        try {
          notes = JSON.parse(t.notes);
        } catch {
          notes = null;
        }
      }

      if (!notes || notes.source !== "SEFAZ") return;

      const items: ReceiptItem[] = Array.isArray(notes.items)
        ? (notes.items as ReceiptItem[])
        : [];
      const discountTotal = items.reduce((acc, item) => {
        if (
          item?.description === "(-) DESCONTOS TOTAIS" &&
          typeof item.unitPrice === "number" &&
          item.unitPrice < 0
        ) {
          return acc + Math.abs(item.unitPrice);
        }
        return acc;
      }, 0);

      if (discountTotal <= 0) return;

      const createdAt = t.createdAt || t.date;
      const weekday = weekdaysPt[parseLocalDate(createdAt).getDay()];
      const store =
        typeof notes.store === "string" && notes.store.trim()
          ? notes.store.trim()
          : "Loja desconhecida";

      events.push({ store, weekday, discount: discountTotal });
    });

    return events;
  }, [filteredTransactions, weekdaysPt]);

  const discountAnalysis = useMemo(() => {
    const discountByWeekday: Record<string, number> = {};
    const storeTotals: Record<string, { total: number; visits: number }> = {};
    const comboTotals: Record<
      string,
      { store: string; weekday: string; total: number; visits: number }
    > = {};

    let totalDiscount = 0;

    discountEvents.forEach((e) => {
      totalDiscount += e.discount;
      discountByWeekday[e.weekday] =
        (discountByWeekday[e.weekday] || 0) + e.discount;

      if (!storeTotals[e.store]) storeTotals[e.store] = { total: 0, visits: 0 };
      storeTotals[e.store].total += e.discount;
      storeTotals[e.store].visits += 1;

      const comboKey = `${e.store}__${e.weekday}`;
      if (!comboTotals[comboKey])
        comboTotals[comboKey] = {
          store: e.store,
          weekday: e.weekday,
          total: 0,
          visits: 0,
        };
      comboTotals[comboKey].total += e.discount;
      comboTotals[comboKey].visits += 1;
    });

    const storeRanking = Object.entries(storeTotals)
      .map(([store, v]) => ({
        store,
        total: v.total,
        visits: v.visits,
        avg: v.total / Math.max(1, v.visits),
      }))
      .sort((a, b) => b.total - a.total);

    const bestCombos = Object.values(comboTotals)
      .map((v) => ({
        store: v.store,
        weekday: v.weekday,
        total: v.total,
        visits: v.visits,
        avg: v.total / Math.max(1, v.visits),
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    return {
      totalDiscount,
      discountByWeekday,
      storeRanking,
      bestCombos,
      visits: discountEvents.length,
      uniqueStores: Object.keys(storeTotals).length,
    };
  }, [discountEvents]);

  const discountByWeekdayChartData = useMemo(() => {
    const labels = [...weekdaysPtMondayFirst];
    return {
      labels,
      datasets: [
        {
          label: "Descontos",
          data: labels.map((d) => discountAnalysis.discountByWeekday[d] || 0),
          backgroundColor: theme.primary + "66",
          borderColor: theme.primary,
          borderWidth: 2,
        },
      ],
    };
  }, [
    discountAnalysis.discountByWeekday,
    theme.primary,
    weekdaysPtMondayFirst,
  ]);

  const toggleCategory = (cat: string | Category) => {
    const name = typeof cat === "string" ? cat : cat?.name || String(cat);
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  };

  const togglePaymentMethod = (
    pm: string | Category | { label?: string; name?: string },
  ) => {
    const name =
      typeof pm === "string"
        ? pm
        : ("label" in pm && typeof pm.label === "string"
            ? pm.label
            : pm.name) || String(pm);
    setSelectedPaymentMethods((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  };

  const toggleCollapse = (id: string) => {
    setLayout((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, collapsed: !item.collapsed } : item,
      ),
    );
  };

  const removeTransaction = (transactionId: string) => {
    setRemovedTransactionIds((prev) => [...prev, transactionId]);
  };

  const resetRemovedTransactions = () => {
    setRemovedTransactionIds([]);
  };

  const handleSort = (
    column: "date" | "description" | "category" | "paymentMethod" | "amount",
  ) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const getSortedTransactions = () => {
    return [...filteredTransactions].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortBy === "date") {
        aVal = parseLocalDate(getTransactionDateSource(a)).getTime();
        bVal = parseLocalDate(getTransactionDateSource(b)).getTime();
      } else if (sortBy === "amount") {
        aVal = a.amount;
        bVal = b.amount;
      } else if (sortBy === "paymentMethod") {
        aVal =
          typeof a.paymentMethod === "string"
            ? a.paymentMethod
            : a.paymentMethod?.name || "";
        bVal =
          typeof b.paymentMethod === "string"
            ? b.paymentMethod
            : b.paymentMethod?.name || "";
      } else {
        const rawA = a[sortBy as keyof Transaction];
        const rawB = b[sortBy as keyof Transaction];
        aVal =
          typeof rawA === "string"
            ? rawA
            : typeof rawA === "number"
              ? rawA
              : "";
        bVal =
          typeof rawB === "string"
            ? rawB
            : typeof rawB === "number"
              ? rawB
              : "";
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (tableRef.current) {
        // Scroll to the table card
        tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        // Optional: briefly pulse or flash the card to indicate focus
        tableRef.current.style.transition = "box-shadow 0.3s";
        tableRef.current.style.boxShadow = `0 0 15px ${theme.primary}`;
        setTimeout(() => {
          if (tableRef.current) tableRef.current.style.boxShadow = "";
        }, 1000);
      }
    }
  };

  const handlePrintTable = () => {
    setShowPrintDialog(true);
  };

  const executePrint = () => {
    if (!tableRef.current) return;

    // Create a new window for printing
    const printWindow = window.open("", "", "height=600,width=800");
    if (!printWindow) return;

    // Get table HTML
    const tableElement = tableRef.current.querySelector("table");
    if (!tableElement) return;

    // Clone the table to avoid modifying the original
    const clonedTable = tableElement.cloneNode(true) as HTMLElement;

    // Remove all remove buttons from the cloned table
    const removeButtons = clonedTable.querySelectorAll("button");
    removeButtons.forEach((button) => {
      button.remove();
    });

    // Create print-friendly HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Planilha de Transações</title>
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
            td {
              padding: 10px 12px;
              border: 1px solid #ddd;
              font-size: 13px;
            }
            tbody tr:nth-child(even) {
              background-color: #fafafa;
            }
            td:last-child {
              text-align: right;
              font-weight: 600;
            }
            .positive {
              color: #10b981;
            }
            .negative {
              color: #ef4444;
            }
            .badge {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              background-color: #e0e0e0;
            }
            .payment-badge {
              background-color: #dbeafe;
              color: #0369a1;
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
            <h1>${printSettings.title}</h1>
            ${printSettings.subtitle ? `<p style="font-size: 14px; color: #555; margin-top: 5px;">${printSettings.subtitle}</p>` : ""}
            <div style="margin-top: 15px; padding: 12px; background-color: #f0f0f0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; color: #666;"><strong>${filteredTransactions.length} itens</strong> • Período: ${startDate} até ${endDate}</span>
              <span style="font-size: 14px; color: #000; font-weight: bold;">Total Despesas: ${formatCurrency(filteredTransactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0))}</span>
            </div>
          </div>
          
          ${clonedTable.outerHTML}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handlePrintExpenseChart = () => {
    setChartPrintSettings({
      title: "Cronograma de Despesas",
      subtitle:
        expenseMode === "range"
          ? `Período: ${format(parseLocalDate(expenseTimelineStartDate), "dd/MM/yyyy")} até ${format(parseLocalDate(expenseTimelineEndDate), "dd/MM/yyyy")}`
          : `Comparação: ${expenseComparisonMonth1} vs ${expenseComparisonMonth2}`,
    });
    setShowChartPrintDialog(true);
  };

  const executePrintChart = () => {
    if (!expenseChartRef.current) return;

    // Get chart image
    const chartImage = expenseChartRef.current.toBase64Image();

    // Create a new window for printing
    const printWindow = window.open("", "", "height=600,width=900");
    if (!printWindow) return;

    // Create print-friendly HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${chartPrintSettings.title}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              padding: 40px;
              background-color: #fff;
            }
            .print-header {
              margin-bottom: 30px;
              border-bottom: 2px solid #e0e0e0;
              padding-bottom: 15px;
              text-align: left;
            }
            .print-header h1 {
              font-size: 28px;
              margin-bottom: 10px;
              color: #000;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: -0.5px;
            }
            .print-header p {
              font-size: 14px;
              color: #666;
              font-weight: 500;
            }
            .chart-container {
              margin-top: 40px;
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
            }
            img {
              max-width: 100%;
              height: auto;
              border: 1px solid #eee;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #999;
              text-align: left;
            }
            @media print {
              body { padding: 0; }
              img { box-shadow: none; border: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${chartPrintSettings.title}</h1>
            ${chartPrintSettings.subtitle ? `<p>${chartPrintSettings.subtitle}</p>` : ""}
          </div>
          
          <div class="chart-container">
            <img src="${chartImage}" alt="Gráfico" />
          </div>

          <div class="footer">
            Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")} - Vibecodia Finances
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const renderCardHeader = (
    id: string,
    label: string,
    icon: React.ReactNode,
    index: number,
    isCollapsed: boolean,
    onToggleAll?: () => void,
  ) => (
    <PlaygroundCardHeader
      id={id}
      label={label}
      icon={icon}
      index={index}
      isCollapsed={isCollapsed}
      totalItems={layout.length}
      borderColor={theme.cardBorder}
      backgroundColor={theme.cardBorder + "33"}
      onToggleAll={onToggleAll}
      onMoveItem={moveItem}
      onMaximize={setMaximizedId}
      onToggleCollapse={toggleCollapse}
    />
  );

  const renderMaximizedModal = () => {
    if (!maximizedId) return null;
    const item = layout.find((i) => i.id === maximizedId);
    if (!item) return null;

    return (
      <MaximizedChartModal
        isOpen={Boolean(maximizedId)}
        onClose={() => setMaximizedId(null)}
        title={item.label}
        cardBorder={theme.cardBorder}
        cardBackground={theme.cardBackground}
        showToggleAll={maximizedId !== "table"}
        onToggleAll={() => toggleAll(maximizedChartRef)}
        badge={
          <>
            {maximizedId === "table" && (
              <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-bold">
                {filteredTransactions.length} itens
              </span>
            )}
            {maximizedId === "expense_timeline" && showAverage && (
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 animate-in fade-in zoom-in duration-300"
                title="Média simples entre os meses do período filtrado"
              >
                <span className="text-[9px] font-black text-primary uppercase tracking-tighter">
                  Média mensal
                </span>
                <span className="text-sm font-black text-primary">
                  {formatCurrency(averageExpense)}
                </span>
                <span className="text-[9px] text-muted-foreground font-bold uppercase">
                  ({monthsCount} {monthsCount === 1 ? "mês" : "meses"})
                </span>
              </div>
            )}
          </>
        }
      >
            {maximizedId === "income_timeline" && (
              <div className="h-full min-h-[500px]">
                {incomeMode === "range" ? (
                  <Line
                    ref={setChartRef(maximizedChartRef)}
                    data={incomeTimelineChartData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: { color: theme.text, font: { size: 14 } },
                        },
                      },
                      scales: {
                        y: {
                          ticks: {
                            color: theme.text,
                            font: { size: 12 },
                            callback: (value) =>
                              formatCurrency(value as number),
                          },
                          grid: { color: theme.cardBorder },
                        },
                        x: {
                          ticks: { color: theme.text, font: { size: 12 } },
                          grid: { color: theme.cardBorder },
                        },
                      },
                    }}
                  />
                ) : (
                  <Bar
                    ref={setChartRef(maximizedChartRef)}
                    data={incomeTimelineChartData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: { color: theme.text, font: { size: 14 } },
                        },
                      },
                      scales: {
                        y: {
                          stacked: true,
                          grace: "10%",
                          ticks: {
                            color: theme.text,
                            font: { size: 12 },
                            callback: (value) =>
                              formatCurrency(value as number),
                          },
                          grid: { color: theme.cardBorder },
                        },
                        x: {
                          stacked: true,
                          ticks: { color: theme.text, font: { size: 12 } },
                          grid: { color: theme.cardBorder },
                        },
                      },
                    }}
                  />
                )}
              </div>
            )}
            {maximizedId === "passive_income_evolution" && (
              <div className="h-full min-h-[500px]">
                <Line
                  ref={setChartRef(maximizedChartRef)}
                  data={passiveIncomeEvolutionChartData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: { color: theme.text, font: { size: 14 } },
                      },
                    },
                    scales: {
                      y: {
                        ticks: {
                          color: theme.text,
                          font: { size: 12 },
                          callback: (value) => formatCurrency(value as number),
                        },
                        grid: { color: theme.cardBorder },
                      },
                      x: {
                        ticks: { color: theme.text, font: { size: 12 } },
                        grid: { color: theme.cardBorder },
                      },
                    },
                  }}
                />
              </div>
            )}
            {maximizedId === "expense_timeline" && (
              <div className="h-full min-h-[500px]">
                {expenseItemSearch.trim().length >= 2 ? (
                  expenseTimelineChartData.noMatch ? (
                    <div className="h-full flex flex-col items-center justify-center text-foreground opacity-40 text-xl italic gap-4 animate-in fade-in duration-300">
                      <div className="p-6 bg-muted/20 rounded-full">
                        <Search className="w-20 h-20 opacity-20" />
                      </div>
                      <span className="text-2xl font-bold">
                        Nenhum item encontrado para "{expenseItemSearch}"
                      </span>
                      <span className="text-sm opacity-60">
                        Tente termos mais genéricos ou verifique se as
                        transações estão dentro do período selecionado.
                      </span>
                    </div>
                  ) : (
                    <Line
                      ref={setChartRef(maximizedChartRef)}
                      data={expenseTimelineChartData}
                      options={{
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: {
                              color: theme.text,
                              font: { size: 14 },
                            },
                          },
                        },
                        scales: {
                          y: {
                            ticks: {
                              color: theme.text,
                              font: { size: 12 },
                              callback: (value) =>
                                formatCurrency(value as number),
                            },
                            grid: { color: theme.cardBorder },
                          },
                          x: {
                            ticks: { color: theme.text, font: { size: 12 } },
                            grid: { color: theme.cardBorder },
                          },
                        },
                      }}
                    />
                  )
                ) : (
                  <Bar
                    ref={setChartRef(maximizedChartRef)}
                    data={expenseTimelineChartData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: {
                            color: theme.text,
                            font: { size: 14 },
                          },
                        },
                      },
                      scales: {
                        y: {
                          stacked: true,
                          grace: "10%",
                          ticks: {
                            color: theme.text,
                            font: { size: 12 },
                            callback: (value) =>
                              formatCurrency(value as number),
                          },
                          grid: { color: theme.cardBorder },
                        },
                        x: {
                          stacked: true,
                          ticks: { color: theme.text, font: { size: 12 } },
                          grid: { color: theme.cardBorder },
                        },
                      },
                    }}
                  />
                )}
              </div>
            )}
            {maximizedId === "categories" && (
              <div className="h-full min-h-[500px] flex items-center justify-center">
                <div className="w-full h-full">
                  <Doughnut
                    ref={setChartRef(maximizedChartRef)}
                    data={categoryChartData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "right",
                          labels: { color: theme.text, font: { size: 14 } },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            )}
            {maximizedId === "payments" && (
              <div className="h-full min-h-[500px] flex items-center justify-center">
                <div className="w-full h-full">
                  <Pie
                    ref={setChartRef(maximizedChartRef)}
                    data={paymentChartData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "right",
                          labels: { color: theme.text, font: { size: 14 } },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            )}
            {maximizedId === "price_evolution" && (
              <div className="h-full min-h-[500px] space-y-6">
                {priceChartData ? (
                  <>
                    {/* Stats Cards */}
                    {selectedItem && allItems[selectedItem] && (
                      (() => {
                        const prices = allItems[selectedItem].map(d => d.price);
                        const min = Math.min(...prices);
                        const max = Math.max(...prices);
                        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
                        const count = prices.length;
                        
                        return (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-2xl border bg-muted/20" style={{ borderColor: theme.cardBorder }}>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Preço Mínimo</p>
                              <p className="text-2xl font-black text-emerald-600">{formatCurrency(min)}</p>
                            </div>
                            <div className="p-4 rounded-2xl border bg-muted/20" style={{ borderColor: theme.cardBorder }}>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Preço Máximo</p>
                              <p className="text-2xl font-black text-red-600">{formatCurrency(max)}</p>
                            </div>
                            <div className="p-4 rounded-2xl border bg-muted/20" style={{ borderColor: theme.cardBorder }}>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Preço Médio</p>
                              <p className="text-2xl font-black text-primary">{formatCurrency(avg)}</p>
                            </div>
                            <div className="p-4 rounded-2xl border bg-muted/20" style={{ borderColor: theme.cardBorder }}>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Compras</p>
                              <p className="text-2xl font-black text-foreground">{count}</p>
                            </div>
                          </div>
                        );
                      })()
                    )}
                    {/* Chart */}
                    <div className="h-[400px]">
                      <Line
                        ref={setChartRef(maximizedChartRef)}
                        data={priceChartData}
                        options={{
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: true,
                              labels: { color: theme.text },
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  return formatCurrency(context.parsed.y);
                                }
                              }
                            }
                          },
                          scales: {
                            y: {
                              ticks: {
                                color: theme.text,
                                callback: (value) =>
                                  formatCurrency(value as number),
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
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-foreground opacity-40 italic text-xl">
                    Nenhum item selecionado para evolução de preços
                  </div>
                )}
              </div>
            )}
            {maximizedId === "discount_analysis" && (
              <div className="space-y-10">
                {discountEvents.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-bold">
                        Total: {formatCurrency(discountAnalysis.totalDiscount)}
                      </span>
                      <span className="px-3 py-1 bg-muted/40 text-foreground rounded-full text-xs font-bold">
                        Visitas: {discountAnalysis.visits}
                      </span>
                      <span className="px-3 py-1 bg-muted/40 text-foreground rounded-full text-xs font-bold">
                        Lojas: {discountAnalysis.uniqueStores}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="text-sm font-black text-foreground uppercase tracking-wide">
                          Descontos por dia da semana
                        </div>
                      </div>
                      <div className="h-[520px]">
                        <Bar
                          ref={setChartRef(maximizedChartRef)}
                          data={discountByWeekdayChartData}
                          options={{
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              y: {
                                ticks: {
                                  color: theme.text,
                                  font: { size: 12 },
                                  callback: (value) =>
                                    formatCurrency(value as number),
                                },
                                grid: { color: theme.cardBorder },
                              },
                              x: {
                                ticks: {
                                  color: theme.text,
                                  font: { size: 12 },
                                },
                                grid: { color: theme.cardBorder },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div
                        className="rounded-2xl border overflow-hidden"
                        style={{ borderColor: theme.cardBorder }}
                      >
                        <div
                          className="px-5 py-4 border-b font-black text-foreground uppercase tracking-wide text-xs bg-muted bg-opacity-40"
                          style={{ borderColor: theme.cardBorder }}
                        >
                          Ranking de lojas por desconto
                        </div>
                        <div className="overflow-auto max-h-[520px]">
                          <table className="w-full text-left text-sm border-collapse">
                            <thead>
                              <tr
                                className="bg-muted bg-opacity-30"
                                style={{ color: theme.text }}
                              >
                                <th
                                  className="p-4 border-b font-bold uppercase text-[10px] tracking-wider"
                                  style={{ borderColor: theme.cardBorder }}
                                >
                                  Loja
                                </th>
                                <th
                                  className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right"
                                  style={{ borderColor: theme.cardBorder }}
                                >
                                  Visitas
                                </th>
                                <th
                                  className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right"
                                  style={{ borderColor: theme.cardBorder }}
                                >
                                  Desconto
                                </th>
                                <th
                                  className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right"
                                  style={{ borderColor: theme.cardBorder }}
                                >
                                  Médio/visita
                                </th>
                              </tr>
                            </thead>
                            <tbody
                              className="divide-y"
                              style={{ borderColor: theme.cardBorder }}
                            >
                              {discountAnalysis.storeRanking.map((row) => (
                                <tr
                                  key={row.store}
                                  className="text-foreground hover:bg-primary/5 transition-colors"
                                >
                                  <td className="p-4 font-bold">{row.store}</td>
                                  <td className="p-4 text-right font-mono opacity-80">
                                    {row.visits}
                                  </td>
                                  <td className="p-4 text-right font-black text-primary">
                                    {formatCurrency(row.total)}
                                  </td>
                                  <td className="p-4 text-right font-bold opacity-90">
                                    {formatCurrency(row.avg)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div
                        className="rounded-2xl border overflow-hidden"
                        style={{ borderColor: theme.cardBorder }}
                      >
                        <div
                          className="px-5 py-4 border-b font-black text-foreground uppercase tracking-wide text-xs bg-muted bg-opacity-40"
                          style={{ borderColor: theme.cardBorder }}
                        >
                          Melhor combinação loja + dia (top 5)
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm border-collapse">
                            <thead>
                              <tr
                                className="bg-muted bg-opacity-30"
                                style={{ color: theme.text }}
                              >
                                <th
                                  className="p-4 border-b font-bold uppercase text-[10px] tracking-wider"
                                  style={{ borderColor: theme.cardBorder }}
                                >
                                  Loja
                                </th>
                                <th
                                  className="p-4 border-b font-bold uppercase text-[10px] tracking-wider"
                                  style={{ borderColor: theme.cardBorder }}
                                >
                                  Dia
                                </th>
                                <th
                                  className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right"
                                  style={{ borderColor: theme.cardBorder }}
                                >
                                  Médio/visita
                                </th>
                                <th
                                  className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right"
                                  style={{ borderColor: theme.cardBorder }}
                                >
                                  Visitas
                                </th>
                                <th
                                  className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right"
                                  style={{ borderColor: theme.cardBorder }}
                                >
                                  Total
                                </th>
                              </tr>
                            </thead>
                            <tbody
                              className="divide-y"
                              style={{ borderColor: theme.cardBorder }}
                            >
                              {discountAnalysis.bestCombos.map((row) => (
                                <tr
                                  key={`${row.store}__${row.weekday}`}
                                  className="text-foreground hover:bg-primary/5 transition-colors"
                                >
                                  <td className="p-4 font-bold">{row.store}</td>
                                  <td className="p-4 font-mono opacity-80">
                                    {row.weekday}
                                  </td>
                                  <td className="p-4 text-right font-black text-primary">
                                    {formatCurrency(row.avg)}
                                  </td>
                                  <td className="p-4 text-right font-mono opacity-80">
                                    {row.visits}
                                  </td>
                                  <td className="p-4 text-right font-bold opacity-90">
                                    {formatCurrency(row.total)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full min-h-[500px] flex items-center justify-center text-foreground opacity-40 italic text-xl">
                    Nenhum desconto SEFAZ encontrado com os filtros atuais
                  </div>
                )}
              </div>
            )}
            {maximizedId === "table" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr
                      className="bg-muted bg-opacity-40"
                      style={{ color: theme.text }}
                    >
                      <th
                        className="p-4 border-r border-b font-bold uppercase text-xs tracking-wider"
                        style={{ borderColor: theme.cardBorder }}
                      >
                        {dateColumnLabel}
                      </th>
                      <th
                        className="p-4 border-r border-b font-bold uppercase text-xs tracking-wider"
                        style={{ borderColor: theme.cardBorder }}
                      >
                        Descrição
                      </th>
                      <th
                        className="p-4 border-r border-b font-bold uppercase text-xs tracking-wider"
                        style={{ borderColor: theme.cardBorder }}
                      >
                        Categoria
                      </th>
                      <th
                        className="p-4 border-r border-b font-bold uppercase text-xs tracking-wider"
                        style={{ borderColor: theme.cardBorder }}
                      >
                        Pagamento
                      </th>
                      <th
                        className="p-4 border-r border-b font-bold uppercase text-xs tracking-wider text-center"
                        style={{ borderColor: theme.cardBorder }}
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </th>
                      <th
                        className="p-4 border-b font-bold uppercase text-xs tracking-wider text-right"
                        style={{ borderColor: theme.cardBorder }}
                      >
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className="divide-y"
                    style={{ borderColor: theme.cardBorder }}
                  >
                    {getSortedTransactions().map((t) => (
                      <tr
                        key={t.id}
                        className={`text-foreground hover:bg-primary/5 transition-colors group ${t.status === "deleted" ? "opacity-50 grayscale-[0.5]" : ""}`}
                      >
                        <td
                          className={`p-4 whitespace-nowrap border-r font-mono text-sm opacity-70 ${t.status === "deleted" ? "line-through" : ""}`}
                          style={{ borderColor: theme.cardBorder }}
                        >
                          {formatBrazilDate(
                            getTransactionDateSource(t),
                            "dd/MM/yyyy",
                          )}
                        </td>
                        <td
                          className={`p-4 font-bold border-r text-base ${t.status === "deleted" ? "line-through" : ""}`}
                          style={{ borderColor: theme.cardBorder }}
                        >
                          {t.description}
                        </td>
                        <td
                          className={`p-4 border-r ${t.status === "deleted" ? "line-through" : ""}`}
                          style={{ borderColor: theme.cardBorder }}
                        >
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted/50">
                            {getCategoryName(categories, t.category)}
                          </span>
                        </td>
                        <td
                          className={`p-4 border-r ${t.status === "deleted" ? "line-through" : ""}`}
                          style={{ borderColor: theme.cardBorder }}
                        >
                          {t.paymentMethod ? (
                            <span className="text-xs opacity-80 uppercase font-black bg-primary/10 px-2 py-1 rounded text-primary">
                              {formatPaymentMethod(t.paymentMethod)}
                            </span>
                          ) : (
                            <span className="opacity-20">-</span>
                          )}
                        </td>
                        <td
                          className="p-4 border-r text-center"
                          style={{ borderColor: theme.cardBorder }}
                        >
                          {t.status === "deleted" && (
                            <span className="text-[10px] font-black bg-accent/20 text-accent px-2 py-1 rounded-full uppercase">
                              EXCLUÍDA
                            </span>
                          )}
                        </td>
                        <td
                          className={`p-4 text-right font-black text-xl ${t.type === "income" ? "text-orange-500" : "text-accent"} ${t.status === "deleted" ? "line-through opacity-60" : ""}`}
                        >
                          {formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </MaximizedChartModal>
    );
  };

  const renderAIAnalysisModal = () => {
    if (!aiAnalysis && !isAnalyzing) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 md:p-6 animate-in fade-in duration-200">
        <div
          className="w-full max-w-2xl bg-card rounded-3xl border-2 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
          style={{
            borderColor: theme.primary,
            backgroundColor: theme.cardBackground,
          }}
        >
          {/* Header */}
          <div
            className="p-6 border-b flex items-center justify-between"
            style={{ borderColor: theme.cardBorder }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-xl">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <span className="text-xl font-bold text-foreground block">
                  Análise Inteligente (IA)
                </span>
                <span className="text-xs text-muted-foreground uppercase font-black tracking-widest">
                  Powered by Vibecodia AI
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setAiAnalysis(null);
                setIsAnalyzing(false);
              }}
              className="p-2 hover:bg-muted rounded-xl transition-all text-foreground"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6 md:p-8 space-y-4">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                  <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2 animate-pulse">
                    Cruzando dados e gerando insights...
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Nossa inteligência artificial está analisando sua saúde
                    financeira.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-primary/5 border border-primary/20 rounded-2xl overflow-hidden group">
                  {/* Toolbar da Resposta */}
                  <div className="flex items-center justify-between p-3 px-6 border-b border-primary/10 bg-primary/10">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase text-primary tracking-widest">
                        Insights Estratégicos
                      </span>
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className="p-1.5 px-3 bg-white/20 hover:bg-white/40 rounded-lg transition-all text-primary border border-primary/20 flex items-center gap-2 text-[10px] font-bold shadow-sm"
                      title="Copiar Texto"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Clipboard className="w-3.5 h-3.5" />
                      )}
                      <span>{isCopied ? "COPIADO!" : "COPIAR ANÁLISE"}</span>
                    </button>
                  </div>

                  {/* Texto da Resposta */}
                  <div className="p-6 md:p-8">
                    <div
                      className="text-foreground leading-relaxed whitespace-pre-wrap text-sm md:text-base prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: formatAIText(aiAnalysis || ""),
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-4 bg-muted/20 rounded-xl border border-border">
                  <div className="flex justify-between items-end mb-1">
                    <p className="text-[10px] font-black uppercase text-foreground opacity-40">
                      Uso da Inteligência (Tokens):
                    </p>
                    {aiStats && (
                      <span
                        className={`text-[10px] font-black ${aiStats.near_limit ? "text-accent" : "text-primary"}`}
                      >
                        {aiStats.usage_percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  {aiStats && (
                    <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          aiStats.usage_percentage > 80
                            ? "bg-accent"
                            : aiStats.usage_percentage > 50
                              ? "bg-yellow-500"
                              : "bg-primary"
                        }`}
                        style={{ width: `${aiStats.usage_percentage}%` }}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] font-bold px-2 py-1 bg-primary/10 text-primary rounded">
                      {filteredTransactions.length} Transações
                    </span>
                    <span className="text-[10px] font-bold px-2 py-1 bg-primary/10 text-primary rounded">
                      {startDate} → {endDate}
                    </span>
                    {aiStats && (
                      <span className="text-[10px] font-bold px-2 py-1 bg-muted/40 text-muted-foreground rounded">
                        {aiStats.current_tokens} / {aiStats.token_limit} tokens
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!isAnalyzing && (
            <div
              className="p-6 border-t flex justify-end"
              style={{ borderColor: theme.cardBorder }}
            >
              <button
                onClick={() => setAiAnalysis(null)}
                className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:scale-105 transition-all"
              >
                ENTENDIDO
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAIObsModal = () => {
    if (!showAIObsModal) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4 md:p-6 animate-in fade-in duration-200">
        <div
          className="w-full max-w-lg bg-card rounded-3xl border-2 shadow-2xl flex flex-col overflow-hidden"
          style={{
            borderColor: theme.primary,
            backgroundColor: theme.cardBackground,
          }}
        >
          {/* Header */}
          <div
            className="p-6 border-b flex items-center justify-between"
            style={{ borderColor: theme.cardBorder }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-xl">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <span className="text-lg font-bold text-foreground block">
                  Deseja adicionar alguma observação?
                </span>
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                  Opcional • Enriquecer análise
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowAIObsModal(false)}
              className="p-2 hover:bg-muted rounded-xl transition-all text-foreground"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Conte para a IA detalhes que os números não mostram. Ex: "Este mês
              tive um gasto extra com conserto de carro" ou "Quero focar em
              reduzir gastos com lazer".
            </p>
            <textarea
              value={aiObservation}
              onChange={(e) => setAiObservation(e.target.value)}
              placeholder="Digite sua observação aqui..."
              className="w-full h-32 p-4 rounded-2xl border-2 bg-transparent text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all"
              style={{ borderColor: theme.cardBorder }}
              autoFocus
            />
          </div>

          {/* Footer */}
          <div
            className="p-6 border-t flex gap-3"
            style={{ borderColor: theme.cardBorder }}
          >
            <button
              onClick={() => {
                setAiObservation("");
                handleAnalyzeWithAI();
              }}
              className="flex-1 py-3 px-4 bg-muted/30 text-foreground rounded-xl font-bold text-sm hover:bg-muted/50 transition-all"
            >
              IGNORAR
            </button>
            <button
              onClick={handleAnalyzeWithAI}
              className="flex-[2] py-3 px-4 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              ENVIAR PARA ANÁLISE
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10 max-w-full overflow-x-hidden relative">
      {renderMaximizedModal()}
      {renderAIAnalysisModal()}
      {renderAIObsModal()}
      {/* Tab Navigation */}
      {!isFocusMode && (
        <div
          className="flex flex-col md:flex-row md:items-center justify-between py-8 gap-6 border-b"
          style={{ borderColor: theme.cardBorder }}
        >
          <div className="flex-1">
            <h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-2">
              {activeTab === "transactions"
                ? "📊 Playground Financeiro"
                : activeTab === "savings"
                  ? "🎯 Análise de Metas"
                  : "🏠 Financiamento Imobiliário"}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {activeTab === "transactions"
                ? "Organize e analise seus dados com total liberdade"
                : activeTab === "savings"
                  ? "Visualize o progresso de suas metas e aportes"
                  : "Gestão completa das parcelas e simulação de quitação"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <button
              onClick={() => setActiveTab("transactions")}
              className={`flex-1 md:flex-none px-6 py-3 md:py-2.5 rounded-xl font-bold text-sm transition-all border ${
                activeTab === "transactions"
                  ? "bg-primary text-white border-primary shadow-md"
                  : "bg-transparent text-foreground border-border hover:bg-muted/30"
              }`}
            >
              Transações
            </button>
            <button
              onClick={() => setActiveTab("savings")}
              className={`flex-1 md:flex-none px-6 py-3 md:py-2.5 rounded-xl font-bold text-sm transition-all border ${
                activeTab === "savings"
                  ? "bg-primary text-white border-primary shadow-md"
                  : "bg-transparent text-foreground border-border hover:bg-muted/30"
              }`}
            >
              Metas de Poupança
            </button>
            <button
              onClick={() => setActiveTab("financiamento")}
              className={`flex-1 md:flex-none px-6 py-3 md:py-2.5 rounded-xl font-bold text-sm transition-all border flex items-center justify-center gap-2 ${
                activeTab === "financiamento"
                  ? "bg-primary text-white border-primary shadow-md"
                  : "bg-transparent text-foreground border-border hover:bg-muted/30"
              }`}
            >
              Financiamento
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "transactions" && (
        <div className="flex flex-col lg:flex-row gap-6 items-start mt-4">
          {/* Sidebar Filters - Sticky on desktop */}
          {showFilters && !isFocusMode && (
            <div className="w-full lg:w-80 lg:sticky lg:top-24 space-y-4 flex-shrink-0 animate-in slide-in-from-left duration-300">
              <div
                className="rounded-2xl border overflow-hidden shadow-sm"
                style={{
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.cardBorder,
                }}
              >
                <div
                  className="p-4 font-semibold text-foreground flex items-center justify-between border-b"
                  style={{
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.cardBorder + "33",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    <span>Filtros Rápidos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleShareUrl}
                      className="px-2.5 py-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:opacity-100 text-xs font-bold flex items-center gap-1.5"
                      title="Compartilhar"
                    >
                      {isShareCopied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Clipboard className="w-4 h-4" />
                      )}
                      <span>{isShareCopied ? "Copiado!" : "Compartilhar"}</span>
                    </button>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:opacity-100"
                      title="Esconder Filtros"
                    >
                      <PanelLeftClose className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Tipo de Lançamento
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(["all", "income", "expense"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setTypeFilter(type)}
                          className={`py-1.5 rounded-md text-[10px] transition-all border font-bold uppercase ${
                            typeFilter === type
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-transparent text-muted-foreground border-border hover:bg-muted/30"
                          }`}
                          style={{
                            backgroundColor:
                              typeFilter === type
                                ? theme.primary
                                : "transparent",
                            color: typeFilter === type ? "#fff" : theme.text,
                          }}
                        >
                          {type === "all"
                            ? "Todas"
                            : type === "income"
                              ? "Receitas"
                              : "Gastos"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Status (Pagamento/Recebimento)
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(["all", "paid", "pending"] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`py-1.5 rounded-md text-[10px] transition-all border font-bold uppercase ${
                            statusFilter === status
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-transparent text-muted-foreground border-border hover:bg-muted/30"
                          }`}
                          style={{
                            backgroundColor:
                              statusFilter === status
                                ? theme.primary
                                : "transparent",
                            color:
                              statusFilter === status ? "#fff" : theme.text,
                          }}
                        >
                          {status === "all"
                            ? "Todos"
                            : status === "paid"
                              ? "Pagos"
                              : "Pendentes"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {transactions.some((t) => t.status === "deleted") && (
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        Visibilidade
                      </label>
                      <button
                        onClick={() => setShowDeleted(!showDeleted)}
                        className={`w-full py-2 rounded-md text-[10px] transition-all border font-bold uppercase flex items-center justify-center gap-2 ${
                          showDeleted
                            ? "bg-accent text-white border-accent shadow-sm"
                            : "bg-transparent text-muted-foreground border-border hover:bg-muted/30"
                        }`}
                        style={{
                          backgroundColor: showDeleted
                            ? theme.accent
                            : "transparent",
                          color: showDeleted ? "#fff" : theme.text,
                        }}
                      >
                        <Trash2
                          className={`w-3 h-3 ${showDeleted ? "animate-pulse" : ""}`}
                        />
                        {showDeleted ? "Mostrando Excluídos" : "Ver Excluídos"}
                      </button>
                    </div>
                  )}

                  <div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        Campo de Data
                      </label>
                      <div className="grid grid-cols-2 gap-1 mb-2">
                        {(["date", "createdAt"] as const).map((field) => (
                          <button
                            key={field}
                            onClick={() => setDateField(field)}
                            className={`py-1.5 rounded-md text-[10px] transition-all border font-bold uppercase ${
                              dateField === field
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-transparent text-muted-foreground border-border hover:bg-muted/30"
                            }`}
                            style={{
                              backgroundColor:
                                dateField === field
                                  ? theme.primary
                                  : "transparent",
                              color: dateField === field ? "#fff" : theme.text,
                            }}
                          >
                            {field === "date" ? "Vencimento" : "Criação"}
                          </button>
                        ))}
                      </div>
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
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Buscar na Planilha (Enter para focar)
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Ex: Supermercado, Aluguel..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        style={{
                          backgroundColor: theme.cardBackground,
                          borderColor: theme.cardBorder,
                          color: theme.text,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Categorias
                    </label>
                    <div className="flex flex-wrap gap-1 p-0.5">
                      {categories.map((cat, idx) => {
                        const catName =
                          typeof cat === "string"
                            ? cat
                            : cat?.name || "Categoria";
                        const isFirstIncomeCategory =
                          incomeCategories.includes(cat) &&
                          (idx === 0 ||
                            !incomeCategories.includes(categories[idx - 1]));

                        return (
                          <React.Fragment key={catName}>
                            {isFirstIncomeCategory && idx > 0 && (
                              <div className="w-full h-px bg-muted/40 my-3" />
                            )}
                            <button
                              onClick={() => toggleCategory(cat)}
                              className={`px-2.5 py-1.5 rounded-md text-[10px] transition-all border font-medium ${
                                selectedCategories.includes(catName)
                                  ? "bg-primary text-white border-primary shadow-sm scale-105"
                                  : "bg-transparent text-muted-foreground border-border"
                              }`}
                              style={{
                                backgroundColor: selectedCategories.includes(
                                  catName,
                                )
                                  ? theme.primary
                                  : "transparent",
                                color: selectedCategories.includes(catName)
                                  ? "#fff"
                                  : theme.text,
                              }}
                            >
                              {catName}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Cartões
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {paymentMethods.map((pm) => {
                        const pmName =
                          typeof pm === "string" ? pm : pm?.name || "Cartão";
                        const pmEmoji =
                          typeof pm === "string" ? "" : pm?.emoji || "";
                        return (
                          <button
                            key={pmName}
                            onClick={() => togglePaymentMethod(pm)}
                            className={`px-2.5 py-1.5 rounded-md text-[10px] transition-all border font-medium ${
                              selectedPaymentMethods.includes(pmName)
                                ? "bg-primary text-white border-primary shadow-sm scale-105"
                                : "bg-transparent text-muted-foreground border-border"
                            }`}
                            style={{
                              backgroundColor:
                                selectedPaymentMethods.includes(pmName)
                                  ? theme.primary
                                  : "transparent",
                              color: selectedPaymentMethods.includes(pmName)
                                ? "#fff"
                                : theme.text,
                            }}
                          >
                            {pmEmoji ? `${pmEmoji} ` : ""}
                            {pmName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAIObsModal(true)}
                    disabled={isAnalyzing || filteredTransactions.length === 0}
                    className="w-full py-4 text-xs bg-primary text-white font-black border border-primary rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
                    )}
                    <span>ANALISAR COM IA</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedCategories([]);
                      setSelectedPaymentMethods([]);
                      setSearchTerm("");
                      setTypeFilter("all");
                      setStatusFilter("all");
                      setStartDate(
                        format(
                          startOfMonth(getCurrentBrazilDate()),
                          "yyyy-MM-dd",
                        ),
                      );
                      setEndDate(
                        format(
                          endOfMonth(getCurrentBrazilDate()),
                          "yyyy-MM-dd",
                        ),
                      );
                      setDateField("date");
                    }}
                    className="w-full py-2.5 text-xs text-primary font-bold border border-primary rounded-xl hover:bg-primary hover:text-white transition-all mt-2 shadow-sm"
                  >
                    LIMPAR TODOS OS FILTROS
                  </button>
                  {activeFiltersCount > 0 && (
                    <p
                      className="text-[10px] font-bold mt-1 text-right"
                      style={{ color: theme.text, opacity: 0.6 }}
                    >
                      {activeFiltersCount}{" "}
                      {activeFiltersCount === 1
                        ? "filtro aplicado"
                        : "filtros aplicados"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 space-y-8 w-full">
            {!showFilters && (
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:scale-105 transition-all animate-in slide-in-from-left duration-300"
              >
                <PanelLeftOpen className="w-5 h-5" />
                MOSTRAR FILTROS
              </button>
            )}
            {/* Summary Stats Row */}
            {!isFocusMode &&
              (() => {
                const passiveIncomeSum = filteredTransactions
                  .filter(
                    (t) =>
                      t.type === "income" &&
                      isPassiveIncome(t.category, categories),
                  )
                  .reduce((acc, t) => acc + t.amount, 0);

                const hasPassiveIncome = passiveIncomeSum > 0;

                return (
                  <div
                    className={`grid grid-cols-1 ${hasPassiveIncome ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"} gap-4`}
                  >
                    <div
                      className="rounded-2xl border p-4 shadow-sm"
                      style={{
                        backgroundColor: theme.cardBackground,
                        borderColor: theme.cardBorder,
                      }}
                    >
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                        Renda Operacional
                      </p>
                      <p className="text-2xl font-black text-orange-500">
                        {formatCurrency(
                          filteredTransactions
                            .filter(
                              (t) =>
                                t.type === "income" &&
                                !isPassiveIncome(t.category, categories),
                            )
                            .reduce((acc, t) => acc + t.amount, 0),
                        )}
                      </p>
                    </div>
                    {hasPassiveIncome && (
                      <div
                        className="rounded-2xl border p-4 shadow-sm"
                        style={{
                          backgroundColor: theme.cardBackground,
                          borderColor: theme.cardBorder,
                        }}
                      >
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                          Rendimento Passivo
                        </p>
                        <p className="text-2xl font-black text-orange-500">
                          {formatCurrency(passiveIncomeSum)}
                        </p>
                      </div>
                    )}
                    <div
                      className="rounded-2xl border p-4 shadow-sm"
                      style={{
                        backgroundColor: theme.cardBackground,
                        borderColor: theme.cardBorder,
                      }}
                    >
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                        Total Despesas
                      </p>
                      <p className="text-2xl font-black text-accent">
                        {formatCurrency(
                          filteredTransactions
                            .filter((t) => t.type === "expense")
                            .reduce((acc, t) => acc + t.amount, 0),
                        )}
                      </p>
                    </div>
                    <div
                      className="rounded-2xl border p-4 shadow-sm"
                      style={{
                        backgroundColor: theme.cardBackground,
                        borderColor: theme.cardBorder,
                      }}
                    >
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                        Saldo do Período
                      </p>
                      <p
                        className={`text-2xl font-black ${
                          filteredTransactions.reduce(
                            (acc, t) =>
                              acc +
                              (t.type === "income" ? t.amount : -t.amount),
                            0,
                          ) >= 0
                            ? "text-primary"
                            : "text-accent"
                        }`}
                      >
                        {formatCurrency(
                          filteredTransactions.reduce(
                            (acc, t) =>
                              acc +
                              (t.type === "income" ? t.amount : -t.amount),
                            0,
                          ),
                        )}
                      </p>
                    </div>
                  </div>
                );
              })()}

            {layout.map((item, index) => {
              if (isFocusMode && item.id !== "table") return null;

              switch (item.id) {
                case "income_timeline":
                  return (
                    <IncomeTimelineSection
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      index={index}
                      collapsed={item.collapsed}
                      incomeMode={incomeMode}
                      onIncomeModeChange={setIncomeMode}
                      incomeComparisonMonth1={incomeComparisonMonth1}
                      onIncomeComparisonMonth1Change={setIncomeComparisonMonth1}
                      incomeComparisonMonth2={incomeComparisonMonth2}
                      onIncomeComparisonMonth2Change={setIncomeComparisonMonth2}
                      incomeGroupBy={incomeGroupBy}
                      onIncomeGroupByChange={setIncomeGroupBy}
                      statusFilter={statusFilter}
                      onStatusFilterChange={setStatusFilter}
                      hasIncomeTransactions={
                        transactions.filter(
                          (t: Transaction) => t.type === "income",
                        ).length > 0
                      }
                      chartData={incomeTimelineChartData}
                      chartRefCallback={setChartRef(incomeChartRef)}
                      textColor={theme.text}
                      cardBackground={theme.cardBackground}
                      cardBorder={theme.cardBorder}
                      onToggleAll={() => toggleAll(incomeChartRef)}
                      onMoveItem={moveItem}
                      onMaximize={setMaximizedId}
                      onToggleCollapse={toggleCollapse}
                      isFirst={index === 0}
                      isLast={index === layout.length - 1}
                    />
                  );

                case "passive_income_evolution": {
                  const passiveTransactionsCount = transactions.filter(
                    (t) =>
                      t.type === "income" &&
                      t.status !== "deleted" &&
                      isPassiveIncome(t.category, categories),
                  ).length;

                  return (
                    <PassiveIncomeEvolutionSection
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      index={index}
                      collapsed={item.collapsed}
                      passiveTransactionsCount={passiveTransactionsCount}
                      chartData={passiveIncomeEvolutionChartData}
                      chartRefCallback={setChartRef(passiveIncomeChartRef)}
                      textColor={theme.text}
                      cardBackground={theme.cardBackground}
                      cardBorder={theme.cardBorder}
                      renderCardHeader={renderCardHeader}
                      onToggleAll={() => toggleAll(passiveIncomeChartRef)}
                    />
                  );
                }

                case "expense_timeline": {
                  const dates = transactions
                    .map((t) => parseLocalDate(t.date).getTime())
                    .filter((d) => !isNaN(d));
                  const isFullPeriod = (() => {
                    if (dates.length === 0) return false;
                    const minStr = format(new Date(Math.min(...dates)), "yyyy-MM-dd");
                    const maxStr = format(new Date(Math.max(...dates)), "yyyy-MM-dd");
                    return expenseTimelineStartDate === minStr && expenseTimelineEndDate === maxStr;
                  })();

                  return (
                    <ExpenseTimelineSection
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      index={index}
                      collapsed={item.collapsed}
                      expenseItemSearch={expenseItemSearch}
                      onExpenseItemSearchChange={setExpenseItemSearch}
                      expenseTimelineChartData={expenseTimelineChartData}
                      expenseMode={expenseMode}
                      onExpenseModeChange={setExpenseMode}
                      expenseDateField={expenseDateField}
                      onExpenseDateFieldChange={setExpenseDateField}
                      expenseTimelineStartDate={expenseTimelineStartDate}
                      onExpenseTimelineStartDateChange={setExpenseTimelineStartDate}
                      expenseTimelineEndDate={expenseTimelineEndDate}
                      onExpenseTimelineEndDateChange={setExpenseTimelineEndDate}
                      expenseComparisonMonth1={expenseComparisonMonth1}
                      onExpenseComparisonMonth1Change={setExpenseComparisonMonth1}
                      expenseComparisonMonth2={expenseComparisonMonth2}
                      onExpenseComparisonMonth2Change={setExpenseComparisonMonth2}
                      toggleExpenseTimeRange={toggleExpenseTimeRange}
                      timeRangeButtonTitle={
                        isFullPeriod
                          ? "Voltar para Mês Atual"
                          : "Ver histórico completo"
                      }
                      timeRangeButtonLabel={
                        isFullPeriod ? "Mês Atual" : "Todo Período"
                      }
                      expenseGroupBy={expenseGroupBy}
                      onExpenseGroupByChange={setExpenseGroupBy}
                      expenseStatusFilter={expenseStatusFilter}
                      onExpenseStatusFilterChange={setExpenseStatusFilter}
                      hasExpenseTransactions={
                        transactions.filter(
                          (t: Transaction) => t.type === "expense",
                        ).length > 0
                      }
                      chartRefCallback={setChartRef(expenseChartRef)}
                      onDatasetVisibilityChange={setVisibleDatasets}
                      handlePrintExpenseChart={handlePrintExpenseChart}
                      showAverage={showAverage}
                      averageExpense={averageExpense}
                      monthsCount={monthsCount}
                      textColor={theme.text}
                      cardBackground={theme.cardBackground}
                      cardBorder={theme.cardBorder}
                      onToggleAll={() => toggleAll(expenseChartRef)}
                      onMoveItem={moveItem}
                      onMaximize={setMaximizedId}
                      onToggleCollapse={toggleCollapse}
                      isFirst={index === 0}
                      isLast={index === layout.length - 1}
                    />
                  );
                }

                case "categories":
                  return (
                    <CategoriesSection
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      index={index}
                      collapsed={item.collapsed}
                      chartData={categoryChartData}
                      hasData={filteredTransactions.length > 0}
                      chartRefCallback={setChartRef(categoryChartRef)}
                      textColor={theme.text}
                      cardBackground={theme.cardBackground}
                      cardBorder={theme.cardBorder}
                      renderCardHeader={renderCardHeader}
                      onToggleAll={() => toggleAll(categoryChartRef)}
                    />
                  );

                case "payments":
                  return (
                    <PaymentMethodsSection
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      index={index}
                      collapsed={item.collapsed}
                      chartData={paymentChartData}
                      hasData={filteredTransactions.some((t) => t.paymentMethod)}
                      chartRefCallback={setChartRef(paymentChartRef)}
                      textColor={theme.text}
                      cardBackground={theme.cardBackground}
                      cardBorder={theme.cardBorder}
                      renderCardHeader={renderCardHeader}
                      onToggleAll={() => toggleAll(paymentChartRef)}
                    />
                  );

                case "price_evolution": {
                  // Calculate stats for selected item
                  const selectedItemData = selectedItem ? allItems[selectedItem] : null;
                  const stats = selectedItemData ? (() => {
                    const prices = selectedItemData.map(d => d.price);
                    const min = Math.min(...prices);
                    const max = Math.max(...prices);
                    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
                    const count = prices.length;
                    return { min, max, avg, count };
                  })() : null;

                  return (
                    <PriceEvolutionSection
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      index={index}
                      collapsed={item.collapsed}
                      priceEvolutionItemSearch={priceEvolutionItemSearch}
                      onPriceEvolutionItemSearchChange={setPriceEvolutionItemSearch}
                      selectedItem={selectedItem}
                      onSelectedItemChange={setSelectedItem}
                      sortedItemNames={sortedItemNames}
                      allItems={allItems}
                      stats={stats}
                      priceChartData={priceChartData}
                      chartRefCallback={setChartRef(priceChartRef)}
                      textColor={theme.text}
                      cardBackground={theme.cardBackground}
                      cardBorder={theme.cardBorder}
                      onToggleAll={() => toggleAll(priceChartRef)}
                      onMoveItem={moveItem}
                      onMaximize={setMaximizedId}
                      onToggleCollapse={toggleCollapse}
                      isFirst={index === 0}
                      isLast={index === layout.length - 1}
                    />
                  );
                }

                case "discount_analysis":
                  return (
                    <DiscountAnalysisSection
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      index={index}
                      collapsed={item.collapsed}
                      hasDiscountEvents={discountEvents.length > 0}
                      discountAnalysis={discountAnalysis}
                      discountByWeekdayChartData={discountByWeekdayChartData}
                      chartRefCallback={setChartRef(discountChartRef)}
                      textColor={theme.text}
                      cardBackground={theme.cardBackground}
                      cardBorder={theme.cardBorder}
                      renderCardHeader={renderCardHeader}
                      onToggleAll={() => toggleAll(discountChartRef)}
                    />
                  );

                case "table":
                  return (
                    <TransactionsTableSection
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      index={index}
                      collapsed={item.collapsed}
                      tableRef={tableRef}
                      isFocusMode={isFocusMode}
                      filteredTransactions={filteredTransactions}
                      sortedTransactions={getSortedTransactions()}
                      removedTransactionIds={removedTransactionIds}
                      dateColumnLabel={dateColumnLabel}
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                      categories={categories}
                      textColor={theme.text}
                      cardBackground={theme.cardBackground}
                      cardBorder={theme.cardBorder}
                      onExitFocusMode={() =>
                        navigate("/playground", { replace: true })
                      }
                      onPrintTable={handlePrintTable}
                      onResetRemovedTransactions={resetRemovedTransactions}
                      onMoveItem={moveItem}
                      onMaximize={setMaximizedId}
                      onToggleCollapse={toggleCollapse}
                      onSort={handleSort}
                      onRemoveTransaction={removeTransaction}
                      getTransactionDateSource={getTransactionDateSource}
                      isFirst={index === 0}
                      isLast={index === layout.length - 1}
                    />
                  );

                default:
                  return null;
              }
            })}
          </div>
        </div>
      )}

      {/* Print Dialog Modal */}
      {showPrintDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-card rounded-2xl shadow-2xl max-w-md w-full border"
            style={{ borderColor: theme.cardBorder }}
          >
            <div
              className="p-6 border-b"
              style={{
                borderColor: theme.cardBorder,
                backgroundColor: theme.cardBorder + "33",
              }}
            >
              <h2 className="text-xl font-bold text-foreground">
                Personalizar Impressão
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Customize os detalhes do seu relatório
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Título do Relatório
                </label>
                <input
                  type="text"
                  value={printSettings.title}
                  onChange={(e) =>
                    setPrintSettings({
                      ...printSettings,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  style={{
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.cardBorder,
                    color: theme.text,
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Subtítulo (Opcional)
                </label>
                <input
                  type="text"
                  value={printSettings.subtitle}
                  onChange={(e) =>
                    setPrintSettings({
                      ...printSettings,
                      subtitle: e.target.value,
                    })
                  }
                  placeholder="Ex: Relatório de Setembro de 2025"
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  style={{
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.cardBorder,
                    color: theme.text,
                  }}
                />
              </div>
            </div>

            <div
              className="p-6 border-t flex gap-3"
              style={{ borderColor: theme.cardBorder }}
            >
              <button
                onClick={() => setShowPrintDialog(false)}
                className="flex-1 px-4 py-2 text-foreground border rounded-lg font-semibold hover:bg-muted/30 transition-colors"
                style={{ borderColor: theme.cardBorder }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  executePrint();
                  setShowPrintDialog(false);
                }}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart Print Dialog Modal */}
      {showChartPrintDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-card rounded-2xl shadow-2xl max-w-md w-full border"
            style={{ borderColor: theme.cardBorder }}
          >
            <div
              className="p-6 border-b"
              style={{
                borderColor: theme.cardBorder,
                backgroundColor: theme.cardBorder + "33",
              }}
            >
              <h2 className="text-xl font-bold text-foreground">
                Personalizar Impressão do Gráfico
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Customize os detalhes do seu gráfico
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Título do Gráfico
                </label>
                <input
                  type="text"
                  value={chartPrintSettings.title}
                  onChange={(e) =>
                    setChartPrintSettings({
                      ...chartPrintSettings,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  style={{
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.cardBorder,
                    color: theme.text,
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Subtítulo (Opcional)
                </label>
                <input
                  type="text"
                  value={chartPrintSettings.subtitle}
                  onChange={(e) =>
                    setChartPrintSettings({
                      ...chartPrintSettings,
                      subtitle: e.target.value,
                    })
                  }
                  placeholder="Ex: Evolução de Despesas"
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  style={{
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.cardBorder,
                    color: theme.text,
                  }}
                />
              </div>
            </div>

            <div
              className="p-6 border-t flex gap-3"
              style={{ borderColor: theme.cardBorder }}
            >
              <button
                onClick={() => setShowChartPrintDialog(false)}
                className="flex-1 px-4 py-2 text-foreground border rounded-lg font-semibold hover:bg-muted/30 transition-colors"
                style={{ borderColor: theme.cardBorder }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  executePrintChart();
                  setShowChartPrintDialog(false);
                }}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Savings Goals Tab */}
      {activeTab === "savings" && (
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          }
        >
          <SavingsGoalsPlayground
            savingsGoals={savingsGoals}
            transactions={transactions}
            onAddTransaction={onAddTransaction}
          />
        </React.Suspense>
      )}

      {/* Financiamento Tab */}
      {activeTab === "financiamento" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            }
          >
            <FinanciamentoCasaPlayground
              transactions={transactions}
              theme={theme}
            />
          </React.Suspense>
        </div>
      )}
    </div>
  );
};

export default Playground;
