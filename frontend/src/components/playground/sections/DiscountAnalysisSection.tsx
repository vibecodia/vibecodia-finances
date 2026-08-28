import { ChartData } from "chart.js";
import { Sparkles } from "lucide-react";
import React from "react";
import { Bar } from "react-chartjs-2";

import { formatCurrency } from "../../../utils/helpers";

export interface DiscountAnalysisData {
  totalDiscount: number;
  visits: number;
  uniqueStores: number;
  storeRanking: { store: string; visits: number; total: number }[];
  bestCombos: {
    store: string;
    weekday: string;
    avg: number;
    visits: number;
  }[];
}

export interface DiscountAnalysisSectionProps {
  id: string;
  label: string;
  index: number;
  collapsed: boolean;
  hasDiscountEvents: boolean;
  discountAnalysis: DiscountAnalysisData;
  discountByWeekdayChartData: ChartData<"bar">;
  chartRefCallback: (instance: unknown) => void;
  textColor: string;
  cardBackground: string;
  cardBorder: string;
  renderCardHeader: (
    id: string,
    label: string,
    icon: React.ReactNode,
    index: number,
    isCollapsed: boolean,
    onToggleAll?: () => void,
  ) => React.ReactNode;
  onToggleAll: () => void;
}

export const DiscountAnalysisSection: React.FC<
  DiscountAnalysisSectionProps
> = ({
  id,
  label,
  index,
  collapsed,
  hasDiscountEvents,
  discountAnalysis,
  discountByWeekdayChartData,
  chartRefCallback,
  textColor,
  cardBackground,
  cardBorder,
  renderCardHeader,
  onToggleAll,
}) => {
  return (
    <div
      className="rounded-2xl border p-0 overflow-hidden shadow-md transition-all hover:shadow-lg"
      style={{
        backgroundColor: cardBackground,
        borderColor: cardBorder,
      }}
    >
      {renderCardHeader(
        id,
        label,
        <Sparkles className="w-5 h-5 text-primary" />,
        index,
        collapsed,
        onToggleAll,
      )}
      {!collapsed && (
        <div className="p-8 space-y-8">
          {hasDiscountEvents ? (
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
                <div className="text-xs font-black text-foreground uppercase tracking-wide mb-3">
                  Descontos por dia da semana
                </div>
                <div className="h-64">
                  <Bar
                    ref={chartRefCallback}
                    data={discountByWeekdayChartData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
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
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div
                  className="rounded-2xl border overflow-hidden"
                  style={{ borderColor: cardBorder }}
                >
                  <div
                    className="px-5 py-4 border-b font-black text-foreground uppercase tracking-wide text-xs bg-muted bg-opacity-40"
                    style={{ borderColor: cardBorder }}
                  >
                    Ranking de lojas por desconto
                  </div>
                  <div className="overflow-auto max-h-80">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr
                          className="bg-muted bg-opacity-30"
                          style={{ color: textColor }}
                        >
                          <th
                            className="p-4 border-b font-bold uppercase text-[10px] tracking-wider"
                            style={{ borderColor: cardBorder }}
                          >
                            Loja
                          </th>
                          <th
                            className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right"
                            style={{ borderColor: cardBorder }}
                          >
                            Visitas
                          </th>
                          <th
                            className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right"
                            style={{ borderColor: cardBorder }}
                          >
                            Desconto
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        className="divide-y"
                        style={{ borderColor: cardBorder }}
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div
                  className="rounded-2xl border overflow-hidden"
                  style={{ borderColor: cardBorder }}
                >
                  <div
                    className="px-5 py-4 border-b font-black text-foreground uppercase tracking-wide text-xs bg-muted bg-opacity-40"
                    style={{ borderColor: cardBorder }}
                  >
                    Melhor combinação loja + dia (top 5)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr
                          className="bg-muted bg-opacity-30"
                          style={{ color: textColor }}
                        >
                          <th
                            className="p-4 border-b font-bold uppercase text-[10px] tracking-wider"
                            style={{ borderColor: cardBorder }}
                          >
                            Loja
                          </th>
                          <th
                            className="p-4 border-b font-bold uppercase text-[10px] tracking-wider"
                            style={{ borderColor: cardBorder }}
                          >
                            Dia
                          </th>
                          <th
                            className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right"
                            style={{ borderColor: cardBorder }}
                          >
                            Médio/visita
                          </th>
                          <th
                            className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right"
                            style={{ borderColor: cardBorder }}
                          >
                            Visitas
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        className="divide-y"
                        style={{ borderColor: cardBorder }}
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div
              className="h-80 flex flex-col items-center justify-center text-foreground opacity-40 text-sm italic gap-2 border-2 border-dashed rounded-3xl"
              style={{ borderColor: cardBorder }}
            >
              <Sparkles className="w-12 h-12 opacity-10" />
              <span>
                Nenhum desconto SEFAZ encontrado com os filtros atuais
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
