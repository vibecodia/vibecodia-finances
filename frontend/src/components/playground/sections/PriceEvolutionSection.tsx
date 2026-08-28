import { ChartData } from "chart.js";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  Maximize2,
  Search,
  TrendingUp,
} from "lucide-react";
import React from "react";
import { Line } from "react-chartjs-2";

import { formatCurrency } from "../../../utils/helpers";

export interface PriceEvolutionSectionProps {
  id: string;
  label: string;
  index: number;
  collapsed: boolean;
  priceEvolutionItemSearch: string;
  onPriceEvolutionItemSearchChange: (search: string) => void;
  selectedItem: string | null;
  onSelectedItemChange: (item: string) => void;
  sortedItemNames: string[];
  allItems: Record<string, { price: number }[]>;
  stats: { min: number; max: number; avg: number; count: number } | null;
  priceChartData: ChartData<"line"> | null;
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

export const PriceEvolutionSection: React.FC<PriceEvolutionSectionProps> = ({
  id,
  label,
  index,
  collapsed,
  priceEvolutionItemSearch,
  onPriceEvolutionItemSearchChange,
  selectedItem,
  onSelectedItemChange,
  sortedItemNames,
  allItems,
  stats,
  priceChartData,
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
        <div className="flex flex-col md:flex-row items-center gap-3">
          {!collapsed && (
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={priceEvolutionItemSearch}
                  onChange={(e) =>
                    onPriceEvolutionItemSearchChange(e.target.value)
                  }
                  className="pl-10 pr-4 py-2 rounded-xl border text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all w-full md:w-64"
                  style={{
                    backgroundColor: cardBackground,
                    borderColor: cardBorder,
                    color: textColor,
                  }}
                />
              </div>
              <select
                className="p-2 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none w-full md:w-auto"
                style={{
                  backgroundColor: cardBackground,
                  borderColor: cardBorder,
                  color: textColor,
                }}
                value={selectedItem || ""}
                onChange={(e) => onSelectedItemChange(e.target.value)}
              >
                <option value="">Filtrar Item Específico...</option>
                {sortedItemNames.map((name) => {
                  const isDuplicate = allItems[name]?.length > 1;
                  return (
                    <option key={name} value={name}>
                      {isDuplicate ? "🔴 " : ""}
                      {name} ({allItems[name]?.length || 0}x)
                    </option>
                  );
                })}
              </select>
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
        <div className="p-6 h-auto">
          {priceChartData ? (
            <>
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div
                    className="p-3 rounded-xl border bg-muted/20"
                    style={{ borderColor: cardBorder }}
                  >
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      Preço Mínimo
                    </p>
                    <p className="text-lg font-black text-emerald-600">
                      {formatCurrency(stats.min)}
                    </p>
                  </div>
                  <div
                    className="p-3 rounded-xl border bg-muted/20"
                    style={{ borderColor: cardBorder }}
                  >
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      Preço Máximo
                    </p>
                    <p className="text-lg font-black text-red-600">
                      {formatCurrency(stats.max)}
                    </p>
                  </div>
                  <div
                    className="p-3 rounded-xl border bg-muted/20"
                    style={{ borderColor: cardBorder }}
                  >
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      Preço Médio
                    </p>
                    <p className="text-lg font-black text-primary">
                      {formatCurrency(stats.avg)}
                    </p>
                  </div>
                  <div
                    className="p-3 rounded-xl border bg-muted/20"
                    style={{ borderColor: cardBorder }}
                  >
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      Compras
                    </p>
                    <p className="text-lg font-black text-foreground">
                      {stats.count}
                    </p>
                  </div>
                </div>
              )}

              <div className="h-80">
                <Line
                  ref={chartRefCallback}
                  data={priceChartData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            return formatCurrency(context.parsed.y);
                          },
                        },
                      },
                    },
                    scales: {
                      y: {
                        ticks: {
                          color: textColor,
                          callback: (value) =>
                            formatCurrency(value as number),
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
              </div>
            </>
          ) : (
            <div
              className="h-80 flex flex-col items-center justify-center text-foreground opacity-40 text-center gap-4 border-2 border-dashed rounded-3xl"
              style={{ borderColor: cardBorder }}
            >
              <TrendingUp className="w-16 h-16 opacity-10" />
              <div className="max-w-xs">
                <p className="text-base font-bold mb-1">Histórico de Preços</p>
                <p className="text-xs italic">
                  {sortedItemNames.length > 0
                    ? "Escolha um produto no menu acima para visualizar a evolução do preço ao longo dos meses."
                    : "Você ainda não possui itens itemizados em suas notas (Use o QR Code no mercado!)."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
