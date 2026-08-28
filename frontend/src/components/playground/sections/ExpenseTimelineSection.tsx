import { ChartData } from "chart.js";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  Maximize2,
  Printer,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import React from "react";
import { Bar, Line } from "react-chartjs-2";

import { formatCurrency } from "../../../utils/helpers";

export interface ExpenseTimelineSectionProps {
  id: string;
  label: string;
  index: number;
  collapsed: boolean;
  expenseItemSearch: string;
  onExpenseItemSearchChange: (search: string) => void;
  expenseTimelineChartData: ChartData<"line" | "bar"> & {
    totalCount?: number;
    totalAmount?: number;
    noMatch?: boolean;
  };
  expenseMode: "range" | "comparison";
  onExpenseModeChange: (mode: "range" | "comparison") => void;
  expenseDateField: "date" | "createdAt";
  onExpenseDateFieldChange: (field: "date" | "createdAt") => void;
  expenseTimelineStartDate: string;
  onExpenseTimelineStartDateChange: (date: string) => void;
  expenseTimelineEndDate: string;
  onExpenseTimelineEndDateChange: (date: string) => void;
  expenseComparisonMonth1: string;
  onExpenseComparisonMonth1Change: (month: string) => void;
  expenseComparisonMonth2: string;
  onExpenseComparisonMonth2Change: (month: string) => void;
  toggleExpenseTimeRange: () => void;
  timeRangeButtonTitle: string;
  timeRangeButtonLabel: string;
  expenseGroupBy: "category" | "paymentMethod";
  onExpenseGroupByChange: (groupBy: "category" | "paymentMethod") => void;
  expenseStatusFilter: "all" | "paid" | "pending";
  onExpenseStatusFilterChange: (status: "all" | "paid" | "pending") => void;
  hasExpenseTransactions: boolean;
  chartRefCallback: (instance: unknown) => void;
  onDatasetVisibilityChange: (labels: string[]) => void;
  handlePrintExpenseChart: () => void;
  showAverage: boolean;
  averageExpense: number;
  monthsCount: number;
  textColor: string;
  cardBackground: string;
  cardBorder: string;
  onToggleAll: () => void;
  onMoveItem: (index: number, direction: "up" | "down") => void;
  onMaximize: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

export const ExpenseTimelineSection: React.FC<ExpenseTimelineSectionProps> = ({
  id,
  label,
  index,
  collapsed,
  expenseItemSearch,
  onExpenseItemSearchChange,
  expenseTimelineChartData,
  expenseMode,
  onExpenseModeChange,
  expenseDateField,
  onExpenseDateFieldChange,
  expenseTimelineStartDate,
  onExpenseTimelineStartDateChange,
  expenseTimelineEndDate,
  onExpenseTimelineEndDateChange,
  expenseComparisonMonth1,
  onExpenseComparisonMonth1Change,
  expenseComparisonMonth2,
  onExpenseComparisonMonth2Change,
  toggleExpenseTimeRange,
  timeRangeButtonTitle,
  timeRangeButtonLabel,
  expenseGroupBy,
  onExpenseGroupByChange,
  expenseStatusFilter,
  onExpenseStatusFilterChange,
  hasExpenseTransactions,
  chartRefCallback,
  onDatasetVisibilityChange,
  handlePrintExpenseChart,
  showAverage,
  averageExpense,
  monthsCount,
  textColor,
  cardBackground,
  cardBorder,
  onToggleAll,
  onMoveItem,
  onMaximize,
  onToggleCollapse,
  isFirst,
  isLast,
}) => {
  return (
    <div
      className="rounded-2xl border p-0 overflow-hidden shadow-md transition-all hover:shadow-lg"
      style={{
        backgroundColor: cardBackground,
        borderColor: cardBorder,
      }}
    >
      <div
        className="p-4 border-b font-semibold text-foreground flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        style={{
          borderColor: cardBorder,
          backgroundColor: cardBorder + "33",
        }}
      >
        <div className="flex items-center gap-3 flex-shrink-0">
          <TrendingUp className="w-5 h-5 text-accent" />
          <span className="text-sm lg:text-base font-bold uppercase tracking-wider">
            {label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {!collapsed && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Item Search */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar Itens (ex: Leite, CPFL)..."
                  value={expenseItemSearch}
                  onChange={(e) => onExpenseItemSearchChange(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 rounded-lg border text-[10px] font-bold focus:ring-2 focus:ring-accent/50 outline-none transition-all"
                  style={{
                    backgroundColor: cardBackground,
                    borderColor: cardBorder,
                    color: textColor,
                  }}
                />
                {expenseItemSearch && (
                  <button
                    type="button"
                    onClick={() => onExpenseItemSearchChange("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-accent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Search Totals Feedback */}
              {expenseItemSearch.trim().length >= 2 &&
                (expenseTimelineChartData.totalCount || 0) > 0 && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/20 animate-in fade-in zoom-in duration-300">
                    <span className="text-[9px] font-black text-accent uppercase tracking-tighter">
                      {expenseTimelineChartData.totalCount}{" "}
                      {expenseTimelineChartData.totalCount === 1
                        ? "item"
                        : "itens"}
                    </span>
                    <div className="w-px h-2.5 bg-accent/20" />
                    <span className="text-[10px] font-black text-accent tracking-tighter">
                      {formatCurrency(expenseTimelineChartData.totalAmount || 0)}
                    </span>
                  </div>
                )}

              {/* Mode Toggle */}
              <div
                className="flex gap-1 border rounded-lg p-1"
                style={{ borderColor: cardBorder }}
              >
                <button
                  type="button"
                  onClick={() => onExpenseModeChange("range")}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    expenseMode === "range"
                      ? "bg-accent text-white"
                      : "bg-transparent text-muted-foreground hover:opacity-100"
                  }`}
                >
                  INTERVALO
                </button>
                <button
                  type="button"
                  onClick={() => onExpenseModeChange("comparison")}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    expenseMode === "comparison"
                      ? "bg-accent text-white"
                      : "bg-transparent text-muted-foreground hover:opacity-100"
                  }`}
                >
                  COMPARAÇÃO
                </button>
              </div>

              {/* Date Field Toggle */}
              <div
                className="flex gap-1 border rounded-lg p-1"
                style={{ borderColor: cardBorder }}
              >
                <button
                  type="button"
                  onClick={() => onExpenseDateFieldChange("date")}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    expenseDateField === "date"
                      ? "bg-accent text-white"
                      : "bg-transparent text-muted-foreground hover:opacity-100"
                  }`}
                >
                  Venc.
                </button>
                <button
                  type="button"
                  onClick={() => onExpenseDateFieldChange("createdAt")}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    expenseDateField === "createdAt"
                      ? "bg-accent text-white"
                      : "bg-transparent text-muted-foreground hover:opacity-100"
                  }`}
                >
                  Criação
                </button>
              </div>

              {/* Date/Month Inputs */}
              <div
                className="flex items-center gap-1 border rounded-lg p-1 px-2"
                style={{ borderColor: cardBorder }}
              >
                {expenseMode === "range" ? (
                  <>
                    <input
                      type="date"
                      value={expenseTimelineStartDate}
                      onChange={(e) =>
                        onExpenseTimelineStartDateChange(e.target.value)
                      }
                      className="bg-transparent text-[10px] font-bold outline-none"
                      style={{ color: textColor }}
                      title="Data Inicial"
                    />
                    <span className="text-[10px] opacity-30 px-1 font-black">
                      →
                    </span>
                    <input
                      type="date"
                      value={expenseTimelineEndDate}
                      onChange={(e) =>
                        onExpenseTimelineEndDateChange(e.target.value)
                      }
                      className="bg-transparent text-[10px] font-bold outline-none"
                      style={{ color: textColor }}
                      title="Data Final"
                    />
                  </>
                ) : (
                  <>
                    <input
                      type="month"
                      value={expenseComparisonMonth1}
                      onChange={(e) =>
                        onExpenseComparisonMonth1Change(e.target.value)
                      }
                      className="bg-transparent text-[10px] font-bold outline-none"
                      style={{ color: textColor }}
                      title="Mês 1"
                    />
                    <span className="text-[10px] opacity-30 px-1 font-black">
                      vs
                    </span>
                    <input
                      type="month"
                      value={expenseComparisonMonth2}
                      onChange={(e) =>
                        onExpenseComparisonMonth2Change(e.target.value)
                      }
                      className="bg-transparent text-[10px] font-bold outline-none"
                      style={{ color: textColor }}
                      title="Mês 2"
                    />
                  </>
                )}
              </div>

              {/* Time Range Toggle */}
              <button
                type="button"
                onClick={toggleExpenseTimeRange}
                className="px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-tighter transition-all hover:bg-primary/10"
                style={{
                  borderColor: cardBorder,
                  color: textColor,
                  backgroundColor: cardBackground,
                }}
                title={timeRangeButtonTitle}
              >
                {timeRangeButtonLabel}
              </button>

              {/* Group By */}
              <div
                className="flex gap-1 border rounded-lg p-1"
                style={{ borderColor: cardBorder }}
              >
                <button
                  type="button"
                  onClick={() => onExpenseGroupByChange("category")}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    expenseGroupBy === "category"
                      ? "bg-accent text-white"
                      : "bg-transparent text-muted-foreground hover:opacity-100"
                  }`}
                >
                  Categ.
                </button>
                <button
                  type="button"
                  onClick={() => onExpenseGroupByChange("paymentMethod")}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    expenseGroupBy === "paymentMethod"
                      ? "bg-accent text-white"
                      : "bg-transparent text-muted-foreground hover:opacity-100"
                  }`}
                >
                  Método
                </button>
              </div>

              {/* Status Filter */}
              <div
                className="flex gap-1 border rounded-lg p-1"
                style={{ borderColor: cardBorder }}
              >
                {(["all", "paid", "pending"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onExpenseStatusFilterChange(status)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all uppercase ${
                      expenseStatusFilter === status
                        ? "bg-accent text-white"
                        : "bg-transparent text-muted-foreground hover:opacity-100"
                    }`}
                  >
                    {status === "all"
                      ? "Todos"
                      : status === "paid"
                        ? "Pagos"
                        : "Pend."}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className="flex items-center gap-1 border-l pl-3"
            style={{ borderColor: cardBorder }}
          >
            {!collapsed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAll();
                }}
                className="p-1.5 hover:bg-muted rounded-md transition-all"
                title="Alternar Todos"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrintExpenseChart();
              }}
              className="p-1.5 hover:bg-muted rounded-md transition-all"
              title="Imprimir Gráfico"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onMoveItem(index, "up")}
              disabled={isFirst}
              className="p-1.5 hover:bg-muted rounded-md disabled:opacity-0 transition-all"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onMoveItem(index, "down")}
              disabled={isLast}
              className="p-1.5 hover:bg-muted rounded-md disabled:opacity-0 transition-all"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onMaximize(id)}
              className="p-1.5 hover:bg-muted rounded-md transition-all ml-1"
              title="Maximizar"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleCollapse(id)}
              className="p-1.5 hover:bg-muted rounded-md transition-all ml-1"
              title={collapsed ? "Expandir" : "Minimizar"}
            >
              {collapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="p-8 h-auto">
          <div className="h-[500px]">
            {hasExpenseTransactions ? (
              expenseItemSearch.trim().length >= 2 ? (
                expenseTimelineChartData.noMatch ? (
                  <div className="h-full flex flex-col items-center justify-center text-foreground opacity-40 text-sm italic gap-2 animate-in fade-in duration-300">
                    <div className="p-4 bg-muted/20 rounded-full">
                      <Search className="w-12 h-12 opacity-20" />
                    </div>
                    <span className="text-base font-bold">
                      Nenhum item encontrado para "{expenseItemSearch}"
                    </span>
                    <span className="text-xs opacity-60">
                      Tente termos mais genéricos ou verifique as datas.
                    </span>
                  </div>
                ) : (
                  <Line
                    ref={chartRefCallback}
                    data={expenseTimelineChartData as unknown as ChartData<"line">}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: { color: textColor },
                          onClick: (_e, legendItem, legend) => {
                            const dsIndex = legendItem.datasetIndex!;
                            const ci = legend.chart;
                            if (ci.isDatasetVisible(dsIndex)) {
                              ci.hide(dsIndex);
                              legendItem.hidden = true;
                            } else {
                              ci.show(dsIndex);
                              legendItem.hidden = false;
                            }
                            const labels: string[] = [];
                            ci.data.datasets.forEach((ds, i) => {
                              if (ci.isDatasetVisible(i)) {
                                labels.push(ds.label!);
                              }
                            });
                            onDatasetVisibilityChange(labels);
                          },
                        },
                      },
                      scales: {
                        y: {
                          ticks: {
                            color: textColor,
                            callback: (value) => formatCurrency(value as number),
                          },
                          grid: { color: cardBorder },
                        },
                        x: {
                          ticks: { color: textColor },
                          grid: { color: cardBorder },
                        },
                      },
                    }}
                  />
                )
              ) : (
                <Bar
                  ref={chartRefCallback}
                  data={expenseTimelineChartData as unknown as ChartData<"bar">}
                  options={{
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: { color: textColor },
                        onClick: (_e, legendItem, legend) => {
                          const dsIndex = legendItem.datasetIndex!;
                          const ci = legend.chart;
                          if (ci.isDatasetVisible(dsIndex)) {
                            ci.hide(dsIndex);
                            legendItem.hidden = true;
                          } else {
                            ci.show(dsIndex);
                            legendItem.hidden = false;
                          }
                          const labels: string[] = [];
                          ci.data.datasets.forEach((ds, i) => {
                            if (ci.isDatasetVisible(i)) {
                              labels.push(ds.label!);
                            }
                          });
                          onDatasetVisibilityChange(labels);
                        },
                      },
                    },
                    scales: {
                      y: {
                        stacked: true,
                        grace: "10%",
                        ticks: {
                          color: textColor,
                          callback: (value) => formatCurrency(value as number),
                        },
                        grid: { color: cardBorder },
                      },
                      x: {
                        stacked: true,
                        ticks: { color: textColor },
                        grid: { color: cardBorder },
                      },
                    },
                  }}
                />
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-foreground opacity-40 text-sm italic gap-2">
                <TrendingUp className="w-12 h-12 opacity-10" />
                <span>Nenhuma despesa encontrada</span>
              </div>
            )}
          </div>

          {/* Average badge at the bottom */}
          {showAverage && (
            <div className="mt-4 flex justify-end">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-sm"
                title="Média simples entre os meses do período filtrado"
              >
                <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
                  Média mensal
                </span>
                <span className="text-sm font-black text-primary">
                  {formatCurrency(averageExpense)}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">
                  ({monthsCount} {monthsCount === 1 ? "mês" : "meses"})
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
