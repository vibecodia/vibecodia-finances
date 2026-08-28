import { ChartData, Chart as ChartJS } from "chart.js";
import { TrendingUp } from "lucide-react";
import React from "react";
import { Line } from "react-chartjs-2";

import { Card } from "../../ui/Card";

export interface ContributionsTimelineSectionProps {
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
  hasContributions: boolean;
  timelineChartData: ChartData<"line">;
  chartRefCallback: (instance: ChartJS | null) => void;
  textColor: string;
  cardBorder: string;
}

export const ContributionsTimelineSection: React.FC<
  ContributionsTimelineSectionProps
> = ({
  id,
  label,
  index,
  collapsed,
  renderCardHeader,
  onToggleAll,
  hasContributions,
  timelineChartData,
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
        <TrendingUp className="w-5 h-5 text-primary" />,
        index,
        collapsed,
        onToggleAll,
      )}
      {!collapsed && (
        <div className="p-8 h-80">
          {hasContributions ? (
            <Line
              ref={(r) => {
                chartRefCallback((r as unknown as ChartJS) || null);
              }}
              data={timelineChartData}
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
              <TrendingUp className="w-12 h-12 opacity-10" />
              <span>Nenhum aporte registrado</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
