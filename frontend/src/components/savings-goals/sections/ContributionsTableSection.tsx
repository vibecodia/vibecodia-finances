import { BarChart3, Trash2 } from "lucide-react";
import React from "react";

import { formatBrazilDate, formatCurrency } from "../../../utils/helpers";
import { Card } from "../../ui/Card";

export interface ContributionTableRow {
  id: string;
  date: string;
  goalName: string;
  amount: number;
  isPaid?: boolean;
  status?: string;
  percentOfGoal: number;
}

export interface ContributionsTableSectionProps {
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
  contributionTableData: ContributionTableRow[];
  showDeleted: boolean;
  cardBorder: string;
}

export const ContributionsTableSection: React.FC<
  ContributionsTableSectionProps
> = ({
  id,
  label,
  index,
  collapsed,
  renderCardHeader,
  contributionTableData,
  showDeleted,
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
      )}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 text-foreground">
                <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider">
                  Data
                </th>
                <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider">
                  Meta
                </th>
                <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider">
                  Aporte
                </th>
                <th className="p-4 border-r border-b border-border font-bold uppercase text-[10px] tracking-wider text-center">
                  <Trash2 className="w-3 h-3 mx-auto" />
                </th>
                <th className="p-4 border-b border-border font-bold uppercase text-[10px] tracking-wider text-right">
                  % da Meta
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {contributionTableData.length > 0 ? (
                contributionTableData.map((c) => {
                  const isDeleted = c.status === "deleted" || showDeleted;
                  return (
                    <tr
                      key={c.id}
                      className={`text-foreground hover:bg-primary/5 transition-colors ${
                        isDeleted ? "opacity-50 grayscale-[0.5]" : ""
                      }`}
                    >
                      <td
                        className={`p-4 whitespace-nowrap border-r font-mono text-xs opacity-70 ${
                          isDeleted ? "line-through" : ""
                        }`}
                        style={{ borderColor: cardBorder }}
                      >
                        {formatBrazilDate(c.date, "dd/MM/yyyy")}
                      </td>
                      <td
                        className={`p-4 border-r ${
                          isDeleted ? "line-through" : ""
                        }`}
                        style={{ borderColor: cardBorder }}
                      >
                        <span className="font-semibold">{c.goalName}</span>
                      </td>
                      <td
                        className={`p-4 border-r font-black text-primary ${
                          isDeleted ? "line-through opacity-60" : ""
                        }`}
                        style={{ borderColor: cardBorder }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{formatCurrency(c.amount)}</span>
                          {c.isPaid === false && !isDeleted && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFE0B2] text-black">
                              pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="p-4 border-r text-center"
                        style={{ borderColor: cardBorder }}
                      >
                        {isDeleted && (
                          <span className="text-[8px] font-black bg-accent/20 text-accent px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                            EXCLUÍDO
                          </span>
                        )}
                      </td>
                      <td
                        className={`p-4 text-right text-xs font-bold opacity-70 ${
                          isDeleted ? "line-through" : ""
                        }`}
                      >
                        {c.percentOfGoal.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-foreground opacity-40 text-sm italic"
                  >
                    Nenhum aporte encontrado
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
