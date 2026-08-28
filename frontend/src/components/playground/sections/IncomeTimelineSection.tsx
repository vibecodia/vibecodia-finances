import { ChartData } from "chart.js";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  Maximize2,
  TrendingUp,
} from "lucide-react";
import React from "react";
import { Bar, Line } from "react-chartjs-2";

import { formatCurrency } from "../../../utils/helpers";

export interface IncomeTimelineSectionProps {
  id: string;
  label: string;
  index: number;
  collapsed: boolean;
  incomeMode: "range" | "comparison";
  onIncomeModeChange: (mode: "range" | "comparison") => void;
  incomeComparisonMonth1: string;
  onIncomeComparisonMonth1Change: (month: string) => void;
  incomeComparisonMonth2: string;
  onIncomeComparisonMonth2Change: (month: string) => void;
  incomeGroupBy: "category" | "description";
  onIncomeGroupByChange: (groupBy: "category" | "description") => void;
  statusFilter: "all" | "paid" | "pending";
  onStatusFilterChange: (status: "all" | "paid" | "pending") => void;
  hasIncomeTransactions: boolean;
  chartData: ChartData<"line" | "bar">;
  chartRefCallback: (instance: unknown) => void;
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

export const IncomeTimelineSection: React.FC<IncomeTimelineSectionProps> = ({
  id,
  label,
  index,
  collapsed,
  incomeMode,
  onIncomeModeChange,
  incomeComparisonMonth1,
  onIncomeComparisonMonth1Change,
  incomeComparisonMonth2,
  onIncomeComparisonMonth2Change,
  incomeGroupBy,
  onIncomeGroupByChange,
  statusFilter,
  onStatusFilterChange,
  hasIncomeTransactions,
  chartData,
  chartRefCallback,
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
      {/* Custom Header with Filters */}
      <div
        className="p-4 border-b font-semibold text-foreground flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{
          borderColor: cardBorder,
          backgroundColor: cardBorder + "33",
        }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="text-sm lg:text-base">{label}</span>
        </div>

        <div className="flex items-center gap-3">
          {!collapsed && (
            <div className="flex items-center gap-2">
              {/* Mode Toggle */}
              <div
                className="flex gap-1 border rounded-lg p-1"
                style={{ borderColor: cardBorder }}
              >
                <button
                  type="button"
                  onClick={() => onIncomeModeChange("range")}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                    incomeMode === "range"
                      ? "bg-primary text-white"
                      : "bg-transparent text-muted-foreground hover:opacity-100"
                  }`}
                >
                  INTERVALO
                </button>
                <button
                  type="button"
                  onClick={() => onIncomeModeChange("comparison")}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                    incomeMode === "comparison"
                      ? "bg-primary text-white"
                      : "bg-transparent text-muted-foreground hover:opacity-100"
                  }`}
                >
                  COMPARAÇÃO
                </button>
              </div>

              {/* Comparison Months */}
              {incomeMode === "comparison" && (
                <div
                  className="flex items-center gap-1 border rounded-lg p-1 px-2"
                  style={{ borderColor: cardBorder }}
                >
                  <input
                    type="month"
                    value={incomeComparisonMonth1}
                    onChange={(e) =>
                      onIncomeComparisonMonth1Change(e.target.value)
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
                    value={incomeComparisonMonth2}
                    onChange={(e) =>
                      onIncomeComparisonMonth2Change(e.target.value)
                    }
                    className="bg-transparent text-[10px] font-bold outline-none"
                    style={{ color: textColor }}
                    title="Mês 2"
                  />
                </div>
              )}

              <div
                className="flex gap-1 border rounded-lg p-1"
                style={{ borderColor: cardBorder }}
              >
                <button
                  type="button"
                  onClick={() => onIncomeGroupByChange("category")}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    incomeGroupBy === "category"
                      ? "bg-primary text-white"
                      : "bg-transparent text-muted-foreground hover:opacity-100"
                  }`}
                >
                  Categoria
                </button>
                <button
                  type="button"
                  onClick={() => onIncomeGroupByChange("description")}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    incomeGroupBy === "description"
                      ? "bg-primary text-white"
                      : "bg-transparent text-muted-foreground hover:opacity-100"
                  }`}
                >
                  Descrição
                </button>
              </div>

              <div
                className="flex gap-1 border rounded-lg p-1"
                style={{ borderColor: cardBorder }}
              >
                {(["all", "paid", "pending"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onStatusFilterChange(status)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all uppercase ${
                      statusFilter === status
                        ? "bg-primary text-white"
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
        <div className="p-8 h-[500px]">
          {hasIncomeTransactions ? (
            incomeMode === "range" ? (
              <Line
                ref={chartRefCallback}
                data={chartData as unknown as ChartData<"line">}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { labels: { color: textColor } },
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
            ) : (
              <Bar
                ref={chartRefCallback}
                data={chartData as unknown as ChartData<"bar">}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { labels: { color: textColor } },
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
              <span>Nenhuma receita encontrada</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
