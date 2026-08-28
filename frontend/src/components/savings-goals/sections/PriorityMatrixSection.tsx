import { ChartData, Chart as ChartJS, TooltipItem } from "chart.js";
import { AlertCircle } from "lucide-react";
import React from "react";
import { Scatter } from "react-chartjs-2";

import { formatCurrency } from "../../../utils/helpers";
import { Card } from "../../ui/Card";

export interface PriorityMatrixSectionProps {
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
  hasGoalsWithDeadline: boolean;
  matrixChartData: ChartData<"scatter">;
  chartRefCallback: (instance: ChartJS | null) => void;
  textColor: string;
  cardBorder: string;
}

export const PriorityMatrixSection: React.FC<PriorityMatrixSectionProps> = ({
  id,
  label,
  index,
  collapsed,
  renderCardHeader,
  onToggleAll,
  hasGoalsWithDeadline,
  matrixChartData,
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
        <AlertCircle className="w-5 h-5 text-primary" />,
        index,
        collapsed,
        onToggleAll,
      )}
      {!collapsed && (
        <div className="p-8 h-96">
          {hasGoalsWithDeadline ? (
            <Scatter
              ref={(r) => {
                chartRefCallback((r as unknown as ChartJS) || null);
              }}
              data={matrixChartData}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context: TooltipItem<"scatter">) => {
                        const point = context.raw as {
                          label: string;
                          y: number;
                        };
                        return `${point.label}: ${
                          point.y > 0 ? formatCurrency(point.y) : "Completo"
                        }`;
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    ticks: { color: textColor },
                    grid: { color: cardBorder },
                    title: {
                      display: true,
                      text: "Dias até Prazo",
                      color: textColor,
                    },
                  },
                  y: {
                    ticks: { color: textColor },
                    grid: { color: cardBorder },
                    title: {
                      display: true,
                      text: "Valor Faltante (R$)",
                      color: textColor,
                    },
                  },
                },
              }}
            />
          ) : (
            <div
              className="h-full flex flex-col items-center justify-center text-foreground opacity-40 text-center gap-4 border-2 border-dashed rounded-3xl"
              style={{ borderColor: cardBorder }}
            >
              <AlertCircle className="w-16 h-16 opacity-10" />
              <div className="max-w-xs">
                <p className="text-base font-bold mb-1">
                  Sem Prazos Definidos
                </p>
                <p className="text-xs italic">
                  Defina prazos nas metas para visualizar a matriz de
                  prioridade.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
