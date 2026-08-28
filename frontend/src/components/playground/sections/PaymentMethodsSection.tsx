import { CreditCard } from "lucide-react";
import React from "react";
import { Pie } from "react-chartjs-2";

import { PieDoughnutChartData } from "../../../utils/chartTransformers";

export interface PaymentMethodsSectionProps {
  id: string;
  label: string;
  index: number;
  collapsed: boolean;
  chartData: PieDoughnutChartData;
  hasData: boolean;
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

export const PaymentMethodsSection: React.FC<PaymentMethodsSectionProps> = ({
  id,
  label,
  index,
  collapsed,
  chartData,
  hasData,
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
        <CreditCard className="w-5 h-5 text-primary" />,
        index,
        collapsed,
        onToggleAll,
      )}
      {!collapsed && (
        <div className="p-8 h-80">
          {hasData ? (
            <Pie
              ref={chartRefCallback}
              data={chartData}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: {
                      color: textColor,
                      font: { size: 12 },
                    },
                  },
                },
              }}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-foreground opacity-40 text-sm italic gap-2">
              <CreditCard className="w-12 h-12 opacity-10" />
              <span>Nenhum dado de pagamento encontrado</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
