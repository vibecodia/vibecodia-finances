import { ChartData } from "chart.js";
import { TrendingUp } from "lucide-react";
import React from "react";
import { Line } from "react-chartjs-2";

import { formatCurrency } from "../../../utils/helpers";

export interface PassiveIncomeEvolutionSectionProps {
  id: string;
  label: string;
  index: number;
  collapsed: boolean;
  passiveTransactionsCount: number;
  chartData: ChartData<"line">;
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

export const PassiveIncomeEvolutionSection: React.FC<
  PassiveIncomeEvolutionSectionProps
> = ({
  id,
  label,
  index,
  collapsed,
  passiveTransactionsCount,
  chartData,
  chartRefCallback,
  textColor,
  cardBackground,
  cardBorder,
  renderCardHeader,
  onToggleAll,
}) => {
  return (
    <div
      className="rounded-2xl border-2 p-0 overflow-hidden shadow-lg transition-all hover:shadow-2xl"
      style={{
        backgroundColor: cardBackground,
        borderColor: cardBorder,
      }}
    >
      {renderCardHeader(
        id,
        label,
        <TrendingUp className="w-6 h-6 text-orange-500" />,
        index,
        collapsed,
        onToggleAll,
      )}
      {!collapsed && (
        <div className="p-10 h-[500px]">
          {passiveTransactionsCount > 0 ? (
            <Line
              ref={chartRefCallback}
              data={chartData}
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
            <div className="h-full flex flex-col items-center justify-center text-foreground opacity-40 text-sm italic gap-2">
              <TrendingUp className="w-12 h-12 opacity-10" />
              <span>Nenhum rendimento passivo registrado ainda</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
