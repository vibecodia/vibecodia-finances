import { ChartData, Chart as ChartJS } from "chart.js";
import { BarChart3 } from "lucide-react";
import React from "react";
import { Line } from "react-chartjs-2";

import { Card } from "../../ui/Card";

export interface SavingsVsIncomeSectionProps {
  id: string;
  label: string;
  index: number;
  collapsed: boolean;
  renderCardHeader: (
    id: string,
    label: string,
    icon: React.ReactNode,
    index: number,
    isCollapsed: boolean,
    onToggleAll?: () => void,
  ) => React.ReactNode;
  onToggleAll: () => void;
  hasIncomeTransactions: boolean;
  savingsVsIncomeChartData: ChartData<"line">;
  chartRefCallback: (instance: ChartJS | null) => void;
  textColor: string;
  cardBorder: string;
}

export const SavingsVsIncomeSection: React.FC<SavingsVsIncomeSectionProps> = ({
  id,
  label,
  index,
  collapsed,
  renderCardHeader,
  onToggleAll,
  hasIncomeTransactions,
  savingsVsIncomeChartData,
  chartRefCallback,
  textColor,
  cardBorder,
}) => {
  return (
    <Card
      key={id}
      noPadding
      className="overflow-hidden shadow-md transition-all hover:shadow-lg"
    >
      {renderCardHeader(
        id,
        label,
        <BarChart3 className="w-5 h-5 text-primary" />,
        index,
        collapsed,
        onToggleAll,
      )}
      {!collapsed && (
        <div className="p-8 h-80">
          {hasIncomeTransactions ? (
            <Line
              ref={(r) => {
                chartRefCallback((r as unknown as ChartJS) || null);
              }}
              data={savingsVsIncomeChartData}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: { labels: { color: textColor } },
                },
                scales: {
                  y: {
                    ticks: { color: textColor },
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
              <BarChart3 className="w-12 h-12 opacity-10" />
              <span>Dados insuficientes para este período</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
