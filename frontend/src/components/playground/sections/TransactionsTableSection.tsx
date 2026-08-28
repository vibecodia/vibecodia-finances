import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Printer,
  RotateCcw,
  Search,
  Table as TableIcon,
  Trash2,
  X,
} from "lucide-react";
import React from "react";

import { Category, Transaction } from "../../../types";
import { getCategoryName } from "../../../utils/categoryUtils";
import {
  formatBrazilDate,
  formatCurrency,
  formatPaymentMethod,
} from "../../../utils/helpers";

export interface TransactionsTableSectionProps {
  id: string;
  label: string;
  index: number;
  collapsed: boolean;
  tableRef: React.RefObject<HTMLDivElement>;
  isFocusMode: boolean;
  filteredTransactions: Transaction[];
  sortedTransactions: Transaction[];
  removedTransactionIds: string[];
  dateColumnLabel: string;
  sortBy: "date" | "amount" | "description" | "category" | "paymentMethod";
  sortDirection: "asc" | "desc";
  categories: Category[];
  textColor: string;
  cardBackground: string;
  cardBorder: string;
  onExitFocusMode: () => void;
  onPrintTable: () => void;
  onResetRemovedTransactions: () => void;
  onMoveItem: (index: number, direction: "up" | "down") => void;
  onMaximize: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onSort: (
    column: "date" | "amount" | "description" | "category" | "paymentMethod",
  ) => void;
  onRemoveTransaction: (id: string) => void;
  getTransactionDateSource: (t: Transaction) => Date | string;
  isFirst: boolean;
  isLast: boolean;
}

export const TransactionsTableSection: React.FC<
  TransactionsTableSectionProps
> = ({
  id,
  label,
  index,
  collapsed,
  tableRef,
  isFocusMode,
  filteredTransactions,
  sortedTransactions,
  removedTransactionIds,
  dateColumnLabel,
  sortBy,
  sortDirection,
  categories,
  textColor,
  cardBackground,
  cardBorder,
  onExitFocusMode,
  onPrintTable,
  onResetRemovedTransactions,
  onMoveItem,
  onMaximize,
  onToggleCollapse,
  onSort,
  onRemoveTransaction,
  getTransactionDateSource,
  isFirst,
  isLast,
}) => {
  return (
    <div
      key={id}
      ref={tableRef}
      className={`rounded-2xl border overflow-hidden shadow-md transition-all hover:shadow-lg scroll-mt-24 ${
        isFocusMode ? "focus-target" : ""
      }`}
      style={{
        backgroundColor: cardBackground,
        borderColor: cardBorder,
      }}
    >
      <div
        className="p-4 border-b font-semibold text-foreground flex items-center justify-between group"
        style={{
          borderColor: cardBorder,
          backgroundColor: cardBorder + "33",
        }}
      >
        <div className="flex items-center gap-3">
          <TableIcon className="w-5 h-5 text-primary" />
          <div className="flex flex-col gap-1">
            <span className="text-sm lg:text-base">{label}</span>
            <div className="flex items-center gap-2 text-xs opacity-70">
              <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full font-bold">
                {filteredTransactions.length} itens
              </span>
              <span className="text-foreground">•</span>
              <span className="font-bold text-primary">
                {formatCurrency(
                  filteredTransactions
                    .filter((t) => t.type === "expense")
                    .reduce((acc, t) => acc + t.amount, 0),
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isFocusMode && (
            <button
              type="button"
              onClick={onExitFocusMode}
              className="mr-2 flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-xl font-bold text-[10px] shadow-lg hover:scale-105 transition-all"
            >
              <X className="w-3 h-3" />
              <span>Sair do Foco</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrintTable();
            }}
            className="p-1.5 hover:bg-muted rounded-md transition-colors text-foreground"
            title="Imprimir Tabela"
          >
            <Printer className="w-4 h-4" />
          </button>

          {removedTransactionIds.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onResetRemovedTransactions();
              }}
              className="px-3 py-1.5 bg-accent/20 hover:bg-accent/30 rounded-full transition-all text-accent flex items-center gap-2 font-bold animate-pulse border border-accent/50 shadow-md text-xs"
              title={`Reset - ${removedTransactionIds.length} removidos`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>{removedTransactionIds.length} removidos</span>
            </button>
          )}

          <div className="w-[1px] h-4 mx-1 bg-muted opacity-0 group-hover:opacity-100" />

          {!isFocusMode && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveItem(index, "up");
                }}
                disabled={isFirst}
                className="p-1.5 hover:bg-muted rounded-md transition-colors text-foreground opacity-0 group-hover:opacity-100 disabled:opacity-0"
                title="Mover para Cima"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveItem(index, "down");
                }}
                disabled={isLast}
                className="p-1.5 hover:bg-muted rounded-md transition-colors text-foreground opacity-0 group-hover:opacity-100 disabled:opacity-0"
                title="Mover para Baixo"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMaximize(id);
                }}
                className="p-1.5 hover:bg-muted rounded-md transition-colors text-foreground"
                title="Maximizar"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onToggleCollapse(id)}
            className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:opacity-100"
            title={collapsed ? "Expandir" : "Minimizar"}
          >
            {collapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr
                className="bg-muted bg-opacity-40"
                style={{ color: textColor }}
              >
                <th
                  onClick={() => onSort("date")}
                  className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                  style={{ borderColor: cardBorder }}
                >
                  {dateColumnLabel}{" "}
                  {sortBy === "date" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => onSort("description")}
                  className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                  style={{ borderColor: cardBorder }}
                >
                  Descrição{" "}
                  {sortBy === "description" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => onSort("category")}
                  className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                  style={{ borderColor: cardBorder }}
                >
                  Categoria{" "}
                  {sortBy === "category" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => onSort("paymentMethod")}
                  className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                  style={{ borderColor: cardBorder }}
                >
                  Pagamento{" "}
                  {sortBy === "paymentMethod" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider text-center"
                  style={{ borderColor: cardBorder }}
                >
                  <Trash2 className="w-3 h-3 mx-auto" />
                </th>
                <th
                  onClick={() => onSort("amount")}
                  className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right cursor-pointer hover:bg-muted/50 transition-colors"
                  style={{ borderColor: cardBorder }}
                >
                  Valor{" "}
                  {sortBy === "amount" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: cardBorder }}
            >
              {sortedTransactions.map((t) => (
                <tr
                  key={t.id}
                  className={`text-foreground hover:bg-primary/5 transition-colors group ${
                    t.status === "deleted" ? "opacity-50 grayscale-[0.5]" : ""
                  }`}
                >
                  <td
                    className={`p-4 whitespace-nowrap border-r font-mono text-xs opacity-70 ${
                      t.status === "deleted" ? "line-through" : ""
                    }`}
                    style={{ borderColor: cardBorder }}
                  >
                    {formatBrazilDate(
                      getTransactionDateSource(t),
                      "dd/MM/yyyy",
                    )}
                  </td>
                  <td
                    className={`p-4 font-bold border-r ${
                      t.status === "deleted" ? "line-through" : ""
                    }`}
                    style={{ borderColor: cardBorder }}
                  >
                    <div className="flex items-center gap-2">
                      {t.description}
                      {t.status !== "deleted" && (
                        <button
                          type="button"
                          onClick={() => onRemoveTransaction(t.id)}
                          className="p-1 hover:bg-accent/10 rounded transition-colors text-accent flex-shrink-0"
                          title="Remover da Visualização"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td
                    className={`p-4 border-r ${
                      t.status === "deleted" ? "line-through" : ""
                    }`}
                    style={{ borderColor: cardBorder }}
                  >
                    <span
                      className="px-3 py-1 rounded-full text-[10px] font-bold bg-muted/50"
                      style={{ color: textColor }}
                    >
                      {getCategoryName(categories, t.category)}
                    </span>
                  </td>
                  <td
                    className={`p-4 border-r ${
                      t.status === "deleted" ? "line-through" : ""
                    }`}
                    style={{ borderColor: cardBorder }}
                  >
                    {t.paymentMethod ? (
                      <span className="text-[10px] opacity-80 uppercase font-black bg-primary/10 px-2 py-1 rounded text-primary">
                        {formatPaymentMethod(t.paymentMethod)}
                      </span>
                    ) : (
                      <span className="opacity-20">-</span>
                    )}
                  </td>
                  <td
                    className="p-4 border-r text-center"
                    style={{ borderColor: cardBorder }}
                  >
                    {t.status === "deleted" && (
                      <span className="text-[8px] font-black bg-accent/20 text-accent px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                        EXCLUÍDA
                      </span>
                    )}
                  </td>
                  <td
                    className={`p-4 text-right font-black text-base ${
                      t.type === "income" ? "text-orange-500" : "text-accent"
                    } ${t.status === "deleted" ? "line-through opacity-60" : ""}`}
                  >
                    {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="p-32 text-center text-foreground opacity-40 flex flex-col items-center gap-4">
              <Search className="w-16 h-16 opacity-10" />
              <div className="max-w-xs">
                <p className="text-base font-bold mb-1">Planilha Vazia</p>
                <p className="text-xs italic">
                  Nenhuma transação corresponde aos filtros atuais. Tente
                  expandir o período ou limpar as categorias.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
