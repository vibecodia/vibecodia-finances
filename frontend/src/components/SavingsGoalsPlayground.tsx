import React, { useState, useMemo } from 'react';
import { SavingsGoal, Transaction } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import {
  formatCurrency,
  formatBrazilDate,
  getCurrentBrazilDate,
  parseLocalDate,
} from '../utils/helpers';
import {
  Target,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUp,
  ArrowDown,
  Minus,
  Maximize2,
  Filter,
  AlertCircle,
  Printer,
} from 'lucide-react';
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
  ScatterController,
} from 'chart.js';
import { Doughnut, Line, Pie, Scatter } from 'react-chartjs-2';
import { startOfMonth, endOfMonth, isWithinInterval, format, differenceInDays } from 'date-fns';
import { useLocalStorage } from '../hooks/trello/useLocalStorage';

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
  ScatterController
);

interface SavingsGoalsPlaygroundProps {
  savingsGoals: SavingsGoal[];
  transactions: Transaction[];
}

interface LayoutItem {
  id: string;
  label: string;
  collapsed: boolean;
  number: number;
}

const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: 'goals_countdown', label: 'Contagem Regressiva de Metas', collapsed: false, number: 1 },
  { id: 'contribution_timeline', label: 'Linha do Tempo de Aportes', collapsed: true, number: 2 },
  { id: 'goals_distribution', label: 'Distribuição de Metas', collapsed: true, number: 3 },
  { id: 'contribution_table', label: 'Tabela de Aportes', collapsed: true, number: 4 },
  { id: 'savings_vs_income', label: 'Taxa de Poupança vs Receita', collapsed: true, number: 5 },
  { id: 'priority_matrix', label: 'Matriz de Prioridade', collapsed: true, number: 6 },
  { id: 'goals_vs_expenses', label: 'Metas vs Despesas', collapsed: true, number: 7 },
];

const SavingsGoalsPlayground: React.FC<SavingsGoalsPlaygroundProps> = ({ savingsGoals, transactions }) => {
  const { theme } = useTheme();
  const [layout, setLayout] = useLocalStorage<LayoutItem[]>('savings_playground_layout', DEFAULT_LAYOUT);

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(getCurrentBrazilDate()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(getCurrentBrazilDate()), 'yyyy-MM-dd'));
  const [neededUnit, setNeededUnit] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [daysUnit, setDaysUnit] = useState<'days' | 'weeks' | 'months'>('months');
  const [showCountdownPrintDialog, setShowCountdownPrintDialog] = useState(false);
  const [countdownPrintSettings, setCountdownPrintSettings] = useState({
    title: 'Contagem Regressiva de Metas',
    subtitle: '',
  });
  const countdownTableRef = React.useRef<HTMLDivElement>(null);

  const handleDaysUnitChange = (newUnit: 'days' | 'weeks' | 'months') => {
    setDaysUnit(newUnit);
    setNeededUnit(newUnit === 'days' ? 'daily' : newUnit === 'weeks' ? 'weekly' : 'monthly');
  };

  const handleNeededUnitChange = (newUnit: 'daily' | 'weekly' | 'monthly') => {
    setNeededUnit(newUnit);
    setDaysUnit(newUnit === 'daily' ? 'days' : newUnit === 'weekly' ? 'weeks' : 'months');
  };

  const handleCountdownPrintTable = () => {
    setShowCountdownPrintDialog(true);
  };

  const executeCountdownPrint = () => {
    if (!countdownTableRef.current) return;

    const printWindow = window.open('', '', 'height=600,width=900');
    if (!printWindow) return;

    const tableElement = countdownTableRef.current.querySelector('table');
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
            th:last-child {
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
            td:nth-last-child(3) {
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
            ${countdownPrintSettings.subtitle ? `<p style="font-size: 14px; color: #555; margin-top: 5px;">${countdownPrintSettings.subtitle}</p>` : ''}
            <div style="margin-top: 15px; padding: 12px; background-color: #f0f0f0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; color: #666;"><strong>${savingsGoals.length} metas</strong></span>
              <span style="font-size: 14px; color: #000; font-weight: bold;">Total Alvo: ${formatCurrency(savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0))}</span>
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
    setLayout(prev => prev.map(item => 
      item.id === id ? { ...item, collapsed: !item.collapsed } : item
    ));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newLayout = [...layout];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newLayout.length) {
      [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
      setLayout(newLayout);
    }
  };

  // Flatten all contributions for timeline
  const allContributions = useMemo(() => {
    return savingsGoals.flatMap(goal =>
      goal.contributions.map(contrib => ({
        ...contrib,
        goalId: goal.id,
        goalName: goal.name,
      }))
    ).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  }, [savingsGoals]);

  // Chart Data: Progress Dashboard (used in JSX)
  useMemo(() => {
    const labels = savingsGoals.map(g => g.name);
    const currentData = savingsGoals.map(g => g.currentAmount);
    const remainingData = savingsGoals.map(g => Math.max(0, g.targetAmount - g.currentAmount));

    return {
      labels,
      datasets: [
        {
          label: 'Alcançado',
          data: currentData,
          backgroundColor: '#10b981',
          borderColor: theme.cardBackground,
          borderWidth: 2,
        },
        {
          label: 'Faltante',
          data: remainingData,
          backgroundColor: '#ef4444',
          borderColor: theme.cardBackground,
          borderWidth: 2,
        },
      ],
    };
  }, [savingsGoals, theme.cardBackground]);

  // Chart Data: Contribution Timeline
  const timelineChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    allContributions.forEach(c => {
      const monthKey = format(parseLocalDate(c.date), 'yyyy-MM');
      grouped[monthKey] = (grouped[monthKey] || 0) + c.amount;
    });

    const sortedMonths = Object.keys(grouped).sort();

    return {
      labels: sortedMonths.map(m => formatBrazilDate(new Date(m + '-01'), 'MMM/yy')),
      datasets: [{
        label: 'Aportes Mensais',
        data: sortedMonths.map(m => grouped[m]),
        borderColor: theme.primary,
        backgroundColor: theme.primary + '33',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: theme.primary,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
      }],
    };
  }, [allContributions, theme.primary]);

  // Chart Data: Goals Distribution
  const distributionChartData = useMemo(() => {
    const labels = savingsGoals.map(g => g.name);
    const data = savingsGoals.map(g => g.currentAmount);
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
      '#8BC34A', '#E91E63', '#00BCD4', '#FFEB3B', '#795548', '#607D8B'
    ];

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: theme.cardBackground,
        borderWidth: 2,
      }],
    };
  }, [savingsGoals, theme.cardBackground]);

  // Chart Data: Savings vs Income
  const savingsVsIncomeChartData = useMemo(() => {
    const months: Record<string, { income: number; savings: number }> = {};

    // Aggregate income by month
    transactions
      .filter(t => t.type === 'income' && t.isPaid)
      .forEach(t => {
        const monthKey = format(parseLocalDate(t.date), 'yyyy-MM');
        if (!months[monthKey]) months[monthKey] = { income: 0, savings: 0 };
        months[monthKey].income += t.amount;
      });

    // Aggregate savings contributions by month
    allContributions.forEach(c => {
      const monthKey = format(parseLocalDate(c.date), 'yyyy-MM');
      if (!months[monthKey]) months[monthKey] = { income: 0, savings: 0 };
      months[monthKey].savings += c.amount;
    });

    const sortedMonths = Object.keys(months).sort();

    return {
      labels: sortedMonths.map(m => formatBrazilDate(new Date(m + '-01'), 'MMM/yy')),
      datasets: [
        {
          label: 'Receita',
          data: sortedMonths.map(m => months[m].income),
          borderColor: theme.primary,
          backgroundColor: theme.primary + '33',
          yAxisID: 'y',
          tension: 0.4,
          pointRadius: 4,
        },
        {
          label: 'Aportes',
          data: sortedMonths.map(m => months[m].savings),
          borderColor: '#10b981',
          backgroundColor: '#10b98133',
          yAxisID: 'y',
          tension: 0.4,
          pointRadius: 4,
        },
      ],
    };
  }, [transactions, allContributions, theme.primary]);

  // Priority Matrix Data
  const matrixData = useMemo(() => {
    return savingsGoals.map(goal => {
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
      let daysUntilDeadline: number | null = null;

      if (goal.deadline) {
        daysUntilDeadline = differenceInDays(parseLocalDate(goal.deadline), getCurrentBrazilDate());
      }

      return {
        x: daysUntilDeadline !== null ? daysUntilDeadline : 9999, // X = urgency
        y: remaining, // Y = amount remaining
        r: goal.targetAmount / 100, // Size = target amount
        label: goal.name,
        id: goal.id,
      };
    });
  }, [savingsGoals]);

  const matrixChartData = useMemo(() => {
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
      '#8BC34A', '#E91E63', '#00BCD4', '#FFEB3B',
    ];

    return {
      datasets: [{
        label: 'Metas',
        data: matrixData,
        backgroundColor: matrixData.map((_, i) => colors[i % colors.length]),
        borderColor: theme.cardBackground,
        borderWidth: 2,
      }],
    };
  }, [matrixData, theme.cardBackground]);

  // Goals Countdown Table Data
  const countdownTableData = useMemo(() => {
    return savingsGoals.map(goal => {
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
      const percentage = (goal.currentAmount / goal.targetAmount) * 100;
      let daysLeft: number | null = null;
      let monthlyNeeded = 0;

      if (goal.deadline) {
        daysLeft = differenceInDays(parseLocalDate(goal.deadline), getCurrentBrazilDate());
        const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));
        monthlyNeeded = remaining / monthsLeft;
      }

      return {
        ...goal,
        remaining,
        percentage,
        daysLeft,
        monthlyNeeded,
      };
    });
  }, [savingsGoals]);

  // Contribution Table Data
  const contributionTableData = useMemo(() => {
    const filtered = allContributions.filter(c => {
      const date = parseLocalDate(c.date);
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      if (!isWithinInterval(date, { start, end })) return false;
      if (selectedGoalId && c.goalId !== selectedGoalId) return false;
      return true;
    });

    return filtered.map(c => {
      const goal = savingsGoals.find(g => g.id === c.goalId);
      const percentOfGoal = goal ? (c.amount / goal.targetAmount) * 100 : 0;
      return { ...c, percentOfGoal };
    });
  }, [allContributions, startDate, endDate, selectedGoalId, savingsGoals]);

  // Goals vs Expenses Analysis
  const goalsVsExpensesData = useMemo(() => {
    const expenseCategories: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense' && t.isPaid)
      .forEach(t => {
        expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
      });

    const goalTotals = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);

    const categories = Object.keys(expenseCategories).slice(0, 8); // Top 8
    const expenseAmounts = categories.map(cat => expenseCategories[cat]);
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
      '#8BC34A', '#E91E63',
    ];

    return {
      labels: categories,
      datasets: [{
        label: 'Despesas por Categoria',
        data: expenseAmounts,
        backgroundColor: colors.slice(0, categories.length),
        borderColor: theme.cardBackground,
        borderWidth: 2,
      }],
      goalTotals,
    };
  }, [transactions, savingsGoals, theme.cardBackground]);

  const renderCardHeader = (id: string, label: string, icon: React.ReactNode, index: number, isCollapsed: boolean) => (
    <div className="p-4 border-b font-semibold text-text flex items-center justify-between group" style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBorder + '33' }}>
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs">
          {DEFAULT_LAYOUT.find(item => item.id === id)?.number}
        </div>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm lg:text-base">{label}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }}
          disabled={index === 0}
          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-0 group-hover:opacity-100 disabled:opacity-0"
          title="Mover para Cima"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }}
          disabled={index === layout.length - 1}
          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-0 group-hover:opacity-100 disabled:opacity-0"
          title="Mover para Baixo"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 mx-1 bg-cardBorder opacity-0 group-hover:opacity-100" />
        <button
          onClick={() => toggleCollapse(id)}
          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-50 hover:opacity-100"
          title={isCollapsed ? "Expandir" : "Minimizar"}
        >
          {isCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10 max-w-full overflow-x-hidden relative">
      <div className="flex flex-col lg:flex-row gap-6 items-start mt-4">
        {/* Sidebar Filters */}
        <div className="w-full lg:w-80 lg:sticky lg:top-24 space-y-4 flex-shrink-0">
          <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            <div className="p-4 font-semibold text-text flex items-center gap-2 border-b" style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBorder + '33' }}>
              <Filter className="w-5 h-5" />
              <span>Filtros</span>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text opacity-70 mb-2">Período</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border text-sm"
                    style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border text-sm"
                    style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text opacity-70 mb-2">Meta (Tabela de Aportes)</label>
                <select
                  value={selectedGoalId || ''}
                  onChange={(e) => setSelectedGoalId(e.target.value || null)}
                  className="w-full p-2.5 rounded-lg border text-sm"
                  style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                >
                  <option value="">Todas as Metas</option>
                  {savingsGoals.map(goal => (
                    <option key={goal.id} value={goal.id}>{goal.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setSelectedGoalId(null);
                  setStartDate(format(startOfMonth(getCurrentBrazilDate()), 'yyyy-MM-dd'));
                  setEndDate(format(endOfMonth(getCurrentBrazilDate()), 'yyyy-MM-dd'));
                }}
                className="w-full py-2.5 text-xs text-primary font-bold border border-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                LIMPAR FILTROS
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-8 w-full">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
              <p className="text-xs font-bold text-text opacity-60 uppercase tracking-widest mb-1">Total em Metas</p>
              <p className="text-2xl font-black text-primary">
                {formatCurrency(savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0))}
              </p>
            </div>
            <div className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
              <p className="text-xs font-bold text-text opacity-60 uppercase tracking-widest mb-1">Total Alvo</p>
              <p className="text-2xl font-black text-accent">
                {formatCurrency(savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0))}
              </p>
            </div>
            <div className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
              <p className="text-xs font-bold text-text opacity-60 uppercase tracking-widest mb-1">Qtd. de Metas</p>
              <p className="text-2xl font-black text-primary">
                {savingsGoals.length}
              </p>
            </div>
          </div>

          {/* Renderable Sections */}
          {layout.map((item, index) => {
            switch (item.id) {
              case 'contribution_timeline':
                return (
                  <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md transition-all hover:shadow-lg" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
                    {renderCardHeader(item.id, item.label, <TrendingUp className="w-5 h-5 text-primary" />, index, item.collapsed)}
                    {!item.collapsed && (
                      <div className="p-8 h-80">
                        {allContributions.length > 0 ? (
                          <Line
                            data={timelineChartData}
                            options={{
                              maintainAspectRatio: false,
                              plugins: { legend: { labels: { color: theme.text } } },
                              scales: {
                                y: { ticks: { color: theme.text }, grid: { color: theme.cardBorder } },
                                x: { ticks: { color: theme.text }, grid: { color: theme.cardBorder } },
                              },
                            }}
                          />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-text opacity-40 text-sm italic gap-2">
                            <TrendingUp className="w-12 h-12 opacity-10" />
                            <span>Nenhum aporte registrado</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );

              case 'goals_distribution':
                return (
                  <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md transition-all hover:shadow-lg" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
                    {renderCardHeader(item.id, item.label, <PieChartIcon className="w-5 h-5 text-primary" />, index, item.collapsed)}
                    {!item.collapsed && (
                      <div className="p-8 h-80">
                        {savingsGoals.length > 0 ? (
                          <Doughnut
                            data={distributionChartData}
                            options={{ maintainAspectRatio: false, plugins: { legend: { labels: { color: theme.text } } } }}
                          />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-text opacity-40 text-sm italic gap-2">
                            <PieChartIcon className="w-12 h-12 opacity-10" />
                            <span>Nenhuma meta cadastrada</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );

              case 'contribution_table':
                return (
                  <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md transition-all hover:shadow-lg" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
                    {renderCardHeader(item.id, item.label, <BarChart3 className="w-5 h-5 text-primary" />, index, item.collapsed)}
                    {!item.collapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-cardBorder bg-opacity-40" style={{ color: theme.text }}>
                              <th className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider" style={{ borderColor: theme.cardBorder }}>Data</th>
                              <th className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider" style={{ borderColor: theme.cardBorder }}>Meta</th>
                              <th className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider" style={{ borderColor: theme.cardBorder }}>Aporte</th>
                              <th className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right" style={{ borderColor: theme.cardBorder }}>% da Meta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: theme.cardBorder }}>
                            {contributionTableData.length > 0 ? (
                              contributionTableData.map(c => (
                                <tr key={c.id} className="text-text hover:bg-primary/5 transition-colors">
                                  <td className="p-4 whitespace-nowrap border-r font-mono text-xs opacity-70" style={{ borderColor: theme.cardBorder }}>
                                    {formatBrazilDate(c.date, 'dd/MM/yyyy')}
                                  </td>
                                  <td className="p-4 border-r" style={{ borderColor: theme.cardBorder }}>
                                    <span className="font-semibold">{c.goalName}</span>
                                  </td>
                                  <td className="p-4 border-r font-black text-primary" style={{ borderColor: theme.cardBorder }}>
                                    {formatCurrency(c.amount)}
                                  </td>
                                  <td className="p-4 text-right text-xs font-bold opacity-70">
                                    {c.percentOfGoal.toFixed(1)}%
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-text opacity-40 text-sm italic">
                                  Nenhum aporte encontrado
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );

              case 'savings_vs_income':
                return (
                  <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md transition-all hover:shadow-lg" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
                    {renderCardHeader(item.id, item.label, <BarChart3 className="w-5 h-5 text-primary" />, index, item.collapsed)}
                    {!item.collapsed && (
                      <div className="p-8 h-80">
                        {transactions.some(t => t.type === 'income') ? (
                          <Line
                            data={savingsVsIncomeChartData}
                            options={{
                              maintainAspectRatio: false,
                              plugins: { legend: { labels: { color: theme.text } } },
                              scales: {
                                y: { ticks: { color: theme.text }, grid: { color: theme.cardBorder } },
                                x: { ticks: { color: theme.text }, grid: { color: theme.cardBorder } },
                              },
                            }}
                          />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-text opacity-40 text-sm italic gap-2">
                            <BarChart3 className="w-12 h-12 opacity-10" />
                            <span>Dados insuficientes para este período</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );

              case 'priority_matrix':
                return (
                  <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md transition-all hover:shadow-lg" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
                    {renderCardHeader(item.id, item.label, <AlertCircle className="w-5 h-5 text-primary" />, index, item.collapsed)}
                    {!item.collapsed && (
                      <div className="p-8 h-96">
                        {savingsGoals.some(g => g.deadline) ? (
                          <Scatter
                            data={matrixChartData}
                            options={{
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  callbacks: {
                                    label: (context: any) => {
                                      const point = context.raw;
                                      return `${point.label}: ${point.y > 0 ? formatCurrency(point.y) : 'Completo'}`;
                                    },
                                  },
                                },
                              },
                              scales: {
                                x: {
                                  ticks: { color: theme.text },
                                  grid: { color: theme.cardBorder },
                                  title: { display: true, text: 'Dias até Prazo', color: theme.text },
                                },
                                y: {
                                  ticks: { color: theme.text },
                                  grid: { color: theme.cardBorder },
                                  title: { display: true, text: 'Valor Faltante (R$)', color: theme.text },
                                },
                              },
                            }}
                          />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-text opacity-40 text-center gap-4 border-2 border-dashed rounded-3xl" style={{ borderColor: theme.cardBorder }}>
                            <AlertCircle className="w-16 h-16 opacity-10" />
                            <div className="max-w-xs">
                              <p className="text-base font-bold mb-1">Sem Prazos Definidos</p>
                              <p className="text-xs italic">Defina prazos nas metas para visualizar a matriz de prioridade.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );

              case 'goals_countdown':
                return (
                  <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md transition-all hover:shadow-lg" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }} ref={countdownTableRef}>
                    <div className="p-4 border-b font-semibold text-text flex items-center justify-between group" style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBorder + '33' }}>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs">
                          {DEFAULT_LAYOUT.find(it => it.id === item.id)?.number}
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-primary" />
                          <span className="text-sm lg:text-base">{item.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCountdownPrintTable(); }}
                          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-0 group-hover:opacity-100"
                          title="Imprimir tabela"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-0 group-hover:opacity-100 disabled:opacity-0"
                          title="Mover para Cima"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }}
                          disabled={index === layout.length - 1}
                          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-0 group-hover:opacity-100 disabled:opacity-0"
                          title="Mover para Baixo"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <div className="w-[1px] h-4 mx-1 bg-cardBorder opacity-0 group-hover:opacity-100" />
                        <button
                          onClick={() => toggleCollapse(item.id)}
                          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-50 hover:opacity-100"
                          title={item.collapsed ? "Expandir" : "Minimizar"}
                        >
                          {item.collapsed ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {!item.collapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-cardBorder bg-opacity-40" style={{ color: theme.text }}>
                              <th className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider" style={{ borderColor: theme.cardBorder }}>Meta</th>
                              <th className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider" style={{ borderColor: theme.cardBorder }}>Prazo</th>
                              <th 
                                onClick={() => handleDaysUnitChange(daysUnit === 'days' ? 'weeks' : daysUnit === 'weeks' ? 'months' : 'days')}
                                className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider cursor-pointer transition-colors hover:bg-primary/10 rounded" 
                                style={{ borderColor: theme.cardBorder }}
                                title="Clique para alternar entre dias, semanas e meses"
                              >
                                {daysUnit === 'days' ? 'Dias' : daysUnit === 'weeks' ? 'Semanas' : 'Meses'}
                              </th>
                              <th className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider text-right" style={{ borderColor: theme.cardBorder }}>Alvo</th>
                              <th className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider text-right" style={{ borderColor: theme.cardBorder }}>Atual</th>
                              <th className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider text-right" style={{ borderColor: theme.cardBorder }}>% Completo</th>
                              <th 
                                onClick={() => handleNeededUnitChange(neededUnit === 'daily' ? 'weekly' : neededUnit === 'weekly' ? 'monthly' : 'daily')}
                                className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right cursor-pointer transition-colors hover:bg-primary/10 rounded" 
                                style={{ borderColor: theme.cardBorder }}
                                title="Clique para alternar entre diário, semanal e mensal"
                              >
                                {neededUnit === 'daily' ? 'Diário Necessário' : neededUnit === 'weekly' ? 'Semanal Necessário' : 'Mensal Necessário'}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: theme.cardBorder }}>
                            {countdownTableData.length > 0 ? (
                              countdownTableData.map(goal => {
                                const statusColor =
                                  goal.percentage >= 100 ? '#10b981' :
                                  goal.daysLeft !== null && goal.daysLeft > 0 && (goal.targetAmount - goal.currentAmount) / goal.daysLeft * 30 <= goal.monthlyNeeded ? '#10b981' :
                                  goal.daysLeft !== null && goal.daysLeft <= 30 ? '#ef4444' :
                                  '#f59e0b';

                                return (
                                  <tr key={goal.id} className="text-text hover:bg-primary/5 transition-colors">
                                    <td className="p-4 border-r font-bold" style={{ borderColor: theme.cardBorder }}>
                                      {goal.name}
                                    </td>
                                    <td className="p-4 border-r whitespace-nowrap text-xs opacity-70" style={{ borderColor: theme.cardBorder }}>
                                      {goal.deadline ? formatBrazilDate(goal.deadline, 'dd/MM/yyyy') : '-'}
                                    </td>
                                    <td className="p-4 border-r text-sm font-bold" style={{ borderColor: theme.cardBorder, color: statusColor }}>
                                      {goal.daysLeft !== null ? (
                                        daysUnit === 'days' 
                                          ? goal.daysLeft
                                          : daysUnit === 'weeks'
                                          ? Math.ceil(goal.daysLeft / 7)
                                          : Math.ceil(goal.daysLeft / 30)
                                      ) : '-'}
                                    </td>
                                    <td className="p-4 border-r text-right text-xs font-black opacity-70" style={{ borderColor: theme.cardBorder }}>
                                      {formatCurrency(goal.targetAmount)}
                                    </td>
                                    <td className="p-4 border-r text-right text-xs font-black text-primary" style={{ borderColor: theme.cardBorder }}>
                                      {formatCurrency(goal.currentAmount)}
                                    </td>
                                    <td className="p-4 border-r text-right text-xs font-bold" style={{ borderColor: theme.cardBorder, color: statusColor }}>
                                      {goal.percentage.toFixed(1)}%
                                    </td>
                                    <td className="p-4 text-right text-xs font-bold text-accent">
                                      {neededUnit === 'daily' && goal.daysLeft !== null && goal.daysLeft > 0
                                        ? formatCurrency((goal.targetAmount - goal.currentAmount) / goal.daysLeft)
                                        : neededUnit === 'weekly' && goal.daysLeft !== null && goal.daysLeft > 0
                                        ? formatCurrency((goal.targetAmount - goal.currentAmount) / Math.ceil(goal.daysLeft / 7))
                                        : goal.monthlyNeeded > 0 ? formatCurrency(goal.monthlyNeeded) : '-'
                                      }
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-text opacity-40 text-sm italic">
                                  Nenhuma meta cadastrada
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );

              case 'goals_vs_expenses':
                return (
                  <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md transition-all hover:shadow-lg" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
                    {renderCardHeader(item.id, item.label, <BarChart3 className="w-5 h-5 text-primary" />, index, item.collapsed)}
                    {!item.collapsed && (
                      <div className="p-8 space-y-6">
                        <div className="h-80">
                          {transactions.some(t => t.type === 'expense') ? (
                            <Pie
                              data={goalsVsExpensesData}
                              options={{
                                maintainAspectRatio: false,
                                plugins: { legend: { labels: { color: theme.text } } },
                              }}
                            />
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-text opacity-40 text-sm italic gap-2">
                              <BarChart3 className="w-12 h-12 opacity-10" />
                              <span>Nenhuma despesa registrada</span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-end p-4 rounded-lg bg-cardBorder/30">
                          <div>
                            <p className="text-xs opacity-70 mb-1">Total em Aportes</p>
                            <p className="text-2xl font-black text-primary">{formatCurrency(goalsVsExpensesData.goalTotals)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs opacity-70 mb-1">Total em Despesas (Top 8)</p>
                            <p className="text-2xl font-black text-accent">
                              {formatCurrency((Object.values(goalsVsExpensesData).filter(v => typeof v === 'number').reduce((sum: number, v: any) => sum + v, 0) as number) - goalsVsExpensesData.goalTotals)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
          <div className="rounded-2xl w-full max-w-md p-6" style={{ backgroundColor: theme.cardBackground }}>
            <h3 className="text-lg font-semibold text-text mb-4">Imprimir Contagem Regressiva</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">Título</label>
                <input
                  type="text"
                  value={countdownPrintSettings.title}
                  onChange={(e) => setCountdownPrintSettings(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text mb-2">Subtítulo (Opcional)</label>
                <input
                  type="text"
                  value={countdownPrintSettings.subtitle}
                  onChange={(e) => setCountdownPrintSettings(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Ex: Relatório de Março de 2026"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCountdownPrintDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-xl transition-colors hover:bg-cardBorder"
                style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  executeCountdownPrint();
                  setShowCountdownPrintDialog(false);
                }}
                className="flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors bg-primary hover:bg-secondary"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsGoalsPlayground;
