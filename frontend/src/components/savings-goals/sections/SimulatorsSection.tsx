import { ChartData, Chart as ChartJS } from "chart.js";
import { Calculator, Info } from "lucide-react";
import React from "react";
import { Line } from "react-chartjs-2";

import { SavingsGoal } from "../../../types";
import { formatCurrency } from "../../../utils/helpers";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Input } from "../../ui/Input";
import { Select } from "../../ui/Select";

export interface SimulatorsSectionProps {
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
  simMode: "investment" | "goal_reach";
  onSimModeChange: (mode: "investment" | "goal_reach") => void;
  simInitialAmountInputProps: React.ComponentProps<typeof Input>;
  simMonthlyAmountInputProps: React.ComponentProps<typeof Input>;
  simInterestRate: number;
  onSimInterestRateChange: (rate: number) => void;
  simPeriod: number;
  onSimPeriodChange: (period: number) => void;
  simTargetGoalId: string | null;
  onSimTargetGoalChange: (goalId: string) => void;
  activeGoals: SavingsGoal[];
  simulationResults: { total: number; interest: number }[];
  simChartData: ChartData<"line">;
  simChartRefCallback: (instance: ChartJS | null) => void;
  textColor: string;
  cardBorder: string;
  salaryAnalysis: {
    avgIncome: number;
    avgSavings: number;
    avgRate: number;
    monthsCount: number;
  };
}

export const SimulatorsSection: React.FC<SimulatorsSectionProps> = ({
  id,
  label,
  index,
  collapsed,
  renderCardHeader,
  onToggleAll,
  simMode,
  onSimModeChange,
  simInitialAmountInputProps,
  simMonthlyAmountInputProps,
  simInterestRate,
  onSimInterestRateChange,
  simPeriod,
  onSimPeriodChange,
  simTargetGoalId,
  onSimTargetGoalChange,
  activeGoals,
  simulationResults,
  simChartData,
  simChartRefCallback,
  textColor,
  cardBorder,
  salaryAnalysis,
}) => {
  const lastResult = simulationResults[simulationResults.length - 1] || {
    total: 0,
    interest: 0,
  };

  return (
    <Card
      key={id}
      noPadding
      className="overflow-hidden shadow-md transition-all hover:shadow-lg"
    >
      {renderCardHeader(
        id,
        label,
        <Calculator className="w-5 h-5 text-primary" />,
        index,
        collapsed,
        onToggleAll,
      )}
      {!collapsed && (
        <div className="p-6 md:p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex gap-2 p-1 bg-muted/30 rounded-xl border border-border">
                <Button
                  onClick={() => onSimModeChange("investment")}
                  variant={simMode === "investment" ? "primary" : "ghost"}
                  size="sm"
                  className="flex-1 text-[10px] font-bold h-8"
                >
                  Investimento Livre
                </Button>
                <Button
                  onClick={() => onSimModeChange("goal_reach")}
                  variant={simMode === "goal_reach" ? "primary" : "ghost"}
                  size="sm"
                  className="flex-1 text-[10px] font-bold h-8"
                >
                  Alcance de Meta
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  {...simInitialAmountInputProps}
                  label="Valor Inicial (R$)"
                  className="font-bold bg-background border-border text-foreground"
                />
                <Input
                  {...simMonthlyAmountInputProps}
                  label="Aporte Mensal (R$)"
                  className="font-bold bg-background border-border text-foreground"
                />
                <Input
                  type="number"
                  step="0.1"
                  value={simInterestRate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onSimInterestRateChange(Number(e.target.value))
                  }
                  label="Juros Mensal (%)"
                  className="font-bold bg-background border-border text-foreground"
                />
                <Input
                  type="number"
                  value={simPeriod}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onSimPeriodChange(Number(e.target.value))
                  }
                  label="Período (Meses)"
                  className="font-bold bg-background border-border text-foreground"
                />
              </div>

              {simMode === "goal_reach" && (
                <Select
                  label="Vincular a Meta Existente"
                  value={simTargetGoalId || ""}
                  className="bg-background border-border text-foreground"
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    onSimTargetGoalChange(e.target.value)
                  }
                >
                  <option value="" className="bg-card text-foreground">
                    Nenhuma Meta
                  </option>
                  {activeGoals.map((g) => (
                    <option
                      key={g.id}
                      value={g.id}
                      className="bg-card text-foreground"
                    >
                      {g.name} ({formatCurrency(g.targetAmount)})
                    </option>
                  ))}
                </Select>
              )}

              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-foreground/60">
                    Total ao Final
                  </p>
                  <p className="text-2xl font-black text-primary">
                    {formatCurrency(lastResult.total)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-foreground/60">
                    Juros Ganhos
                  </p>
                  <p className="text-xl font-black text-accent">
                    {formatCurrency(lastResult.interest)}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-full min-h-[300px]">
              <Line
                ref={(r) => {
                  simChartRefCallback((r as unknown as ChartJS) || null);
                }}
                data={simChartData}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      labels: { color: textColor },
                    },
                  },
                  scales: {
                    y: {
                      ticks: {
                        color: textColor,
                        callback: (v) => formatCurrency(v as number),
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

          <div className="pt-8 border-t border-border">
            <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-foreground">
              <Info className="w-4 h-4 text-primary" />
              Análise Baseada no seu Histórico de Salário
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border bg-muted/10 border-border">
                <p className="text-[10px] font-bold uppercase text-muted-foreground/80 mb-1">
                  Média Salarial Mensal
                </p>
                <p className="text-lg font-black text-foreground">
                  {formatCurrency(salaryAnalysis.avgIncome)}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Baseado em {salaryAnalysis.monthsCount} meses
                </p>
              </div>
              <div className="p-4 rounded-xl border bg-muted/10 border-border">
                <p className="text-[10px] font-bold uppercase text-muted-foreground/80 mb-1">
                  Média de Aportes
                </p>
                <p className="text-lg font-black text-primary">
                  {formatCurrency(salaryAnalysis.avgSavings)}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  ({salaryAnalysis.avgRate.toFixed(1)}% do salário)
                </p>
              </div>
              <div className="p-4 rounded-xl border bg-primary/10 border-primary/30">
                <p className="text-[10px] font-bold uppercase text-primary/70 mb-1">
                  Potencial em 1 Ano
                </p>
                <p className="text-lg font-black text-primary">
                  {formatCurrency(
                    salaryAnalysis.avgSavings *
                      12 *
                      (1 + (simInterestRate / 100) * 6),
                  )}
                </p>
                <p className="text-[10px] text-primary/50 mt-1">
                  Se mantiver a média + juros
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
