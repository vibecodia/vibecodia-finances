import {
  ArrowDown,
  ArrowUp,
  Maximize2,
  Minus,
  Printer,
  Target,
} from "lucide-react";
import React from "react";

import { cn } from "../../../lib/utils";
import { formatBrazilDate, formatCurrency } from "../../../utils/helpers";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";

export interface CountdownTableRow {
  id: string;
  name: string;
  deadline?: string | null;
  daysLeft: number | null;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  monthlyNeeded: number;
}

export interface GoalsCountdownSectionProps {
  id: string;
  label: string;
  index: number;
  itemNumber?: number;
  collapsed: boolean;
  countdownTableRef: React.RefObject<HTMLDivElement>;
  countdownTableData: CountdownTableRow[];
  daysUnit: "days" | "weeks" | "months";
  neededUnit: "daily" | "weekly" | "monthly";
  onDaysUnitChange: () => void;
  onNeededUnitChange: () => void;
  onPrintTable: () => void;
  onMoveItem: (index: number, direction: "up" | "down") => void;
  onToggleCollapse: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

export const GoalsCountdownSection: React.FC<GoalsCountdownSectionProps> = ({
  id,
  label,
  index,
  itemNumber,
  collapsed,
  countdownTableRef,
  countdownTableData,
  daysUnit,
  neededUnit,
  onDaysUnitChange,
  onNeededUnitChange,
  onPrintTable,
  onMoveItem,
  onToggleCollapse,
  isFirst,
  isLast,
}) => {
  return (
    <Card
      key={id}
      noPadding
      className="overflow-hidden shadow-md transition-all hover:shadow-lg"
      ref={countdownTableRef}
    >
      <div className="p-4 border-b font-semibold text-foreground flex items-center justify-between group bg-muted/30 border-border">
        <div className="flex items-center gap-3">
          {itemNumber !== undefined && (
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs">
              {itemNumber}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-sm lg:text-base">{label}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onPrintTable();
            }}
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100"
            title="Imprimir tabela"
          >
            <Printer className="w-4 h-4" />
          </Button>
          <Button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onMoveItem(index, "up");
            }}
            disabled={isFirst}
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100"
            title="Mover para Cima"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onMoveItem(index, "down");
            }}
            disabled={isLast}
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100"
            title="Mover para Baixo"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
          <div className="w-[1px] h-4 mx-1 bg-muted opacity-0 group-hover:opacity-100" />
          <Button
            onClick={() => onToggleCollapse(id)}
            variant="ghost"
            size="sm"
            className="opacity-50 hover:opacity-100"
            title={collapsed ? "Expandir" : "Minimizar"}
          >
            {collapsed ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 text-foreground">
                <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider">
                  Meta
                </th>
                <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider">
                  Prazo
                </th>
                <th
                  onClick={onDaysUnitChange}
                  className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider cursor-pointer transition-colors hover:bg-primary/10 rounded"
                  title="Clique para alternar entre dias, semanas e meses"
                >
                  {daysUnit === "days"
                    ? "Dias"
                    : daysUnit === "weeks"
                      ? "Semanas"
                      : "Meses"}
                </th>
                <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider text-right">
                  Alvo
                </th>
                <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider text-right">
                  Atual
                </th>
                <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider text-right">
                  % Completo
                </th>
                <th
                  onClick={onNeededUnitChange}
                  className="p-4 border-b border-border font-bold uppercase text-[10px] tracking-wider text-right cursor-pointer transition-colors hover:bg-primary/10 rounded"
                  title="Clique para alternar entre diário, semanal e mensal"
                >
                  {neededUnit === "daily"
                    ? "Diário Necessário"
                    : neededUnit === "weekly"
                      ? "Semanal Necessário"
                      : "Mensal Necessário"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {countdownTableData.length > 0 ? (
                countdownTableData.map((goal) => {
                  const statusColor =
                    goal.percentage >= 100
                      ? "text-green-500"
                      : goal.daysLeft !== null &&
                          goal.daysLeft > 0 &&
                          ((goal.targetAmount - goal.currentAmount) /
                            goal.daysLeft) *
                            30 <=
                            goal.monthlyNeeded
                        ? "text-green-500"
                        : goal.daysLeft !== null && goal.daysLeft <= 30
                          ? "text-destructive"
                          : "text-amber-500";

                  return (
                    <tr
                      key={goal.id}
                      className="text-foreground hover:bg-primary/5 transition-colors"
                    >
                      <td className="p-4 border-r border-border font-bold">
                        {goal.name}
                      </td>
                      <td className="p-4 border-r border-border whitespace-nowrap text-xs opacity-70">
                        {goal.deadline
                          ? formatBrazilDate(goal.deadline, "dd/MM/yyyy")
                          : "-"}
                      </td>
                      <td
                        className={cn(
                          "p-4 border-r border-border text-sm font-bold",
                          statusColor,
                        )}
                      >
                        {goal.daysLeft !== null
                          ? daysUnit === "days"
                            ? goal.daysLeft
                            : daysUnit === "weeks"
                              ? Math.ceil(goal.daysLeft / 7)
                              : Math.ceil(goal.daysLeft / 30)
                          : "-"}
                      </td>
                      <td className="p-4 border-r border-border text-right text-xs font-black opacity-70">
                        {formatCurrency(goal.targetAmount)}
                      </td>
                      <td className="p-4 border-r border-border text-right text-xs font-black text-primary">
                        {formatCurrency(goal.currentAmount)}
                      </td>
                      <td
                        className={cn(
                          "p-4 border-r border-border text-right text-xs font-bold",
                          statusColor,
                        )}
                      >
                        {goal.percentage.toFixed(1)}%
                      </td>
                      <td className="p-4 text-right text-xs font-bold text-accent">
                        {neededUnit === "daily" &&
                        goal.daysLeft !== null &&
                        goal.daysLeft > 0
                          ? formatCurrency(
                              (goal.targetAmount - goal.currentAmount) /
                                goal.daysLeft,
                            )
                          : neededUnit === "weekly" &&
                              goal.daysLeft !== null &&
                              goal.daysLeft > 0
                            ? formatCurrency(
                                (goal.targetAmount - goal.currentAmount) /
                                  Math.ceil(goal.daysLeft / 7),
                              )
                            : goal.monthlyNeeded > 0
                              ? formatCurrency(goal.monthlyNeeded)
                              : "-"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-foreground opacity-40 text-sm italic"
                  >
                    Nenhuma meta cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
