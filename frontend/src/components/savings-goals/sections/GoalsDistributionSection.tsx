import { ChartData, Chart as ChartJS } from "chart.js";
import { PieChart as PieChartIcon } from "lucide-react";
import React from "react";
import { Doughnut } from "react-chartjs-2";

import { Card } from "../../ui/Card";

export interface GoalsDistributionSectionProps {
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
  hasActiveGoals: boolean;
  distributionChartData: ChartData<"doughnut">;
  chartRefCallback: (instance: ChartJS | null) => void;
  textColor: string;
}

export const GoalsDistributionSection: React.FC<
  GoalsDistributionSectionProps
> = ({
  id,
  label,
  index,
  collapsed,
  renderCardHeader,
  onToggleAll,
  hasActiveGoals,
  distributionChartData,
  chartRefCallback,
  textColor,
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
        <PieChartIcon className="w-5 h-5 text-primary" />,
        index,
        collapsed,
        onToggleAll,
      )}
      {!collapsed && (
        <div className="p-8 h-80">
          {hasActiveGoals ? (
            <Doughnut
              ref={(r) => {
                chartRefCallback((r as unknown as ChartJS) || null);
              }}
              data={distributionChartData}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: { labels: { color: textColor } },
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
};
