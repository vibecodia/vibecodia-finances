import {
  ShieldAlert,
  CreditCard,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Check,
  Ban,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import React, { useState } from "react";

import { useReductionLock } from "../contexts/ReductionLockContext";
import { useCategories } from "../hooks/useCategories";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import { cn } from "../lib/utils";
import { ReductionAlertLevel, ReductionWeek } from "../types/reductionLock";
import { getCurrentBrazilDate, getMonthKey } from "../utils/helpers";
import {
  formatWeekDateRange,
  getNextMonthString,
  getPreviousMonthString,
} from "../utils/reductionLockUtils";

import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";

export const ReductionLockSettings: React.FC = () => {
  const { paymentMethods } = usePaymentMethods();
  const { expenseCategories } = useCategories();
  const {
    isEnabled,
    setIsEnabled,
    monitoredPaymentMethods,
    togglePaymentMethod,
    setMonitoredPaymentMethods,
    getWeeksForMonth,
    setWeeksForMonth,
    updateWeekRule,
    setWeekAllCategories,
    copyMonthRulesToNext,
    resetMonthRules,
  } = useReductionLock();

  // Current month being viewed/edited in settings (format "YYYY-MM")
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getMonthKey(getCurrentBrazilDate()),
  );

  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: "success" | "info";
  } | null>(null);

  // Edit week dates state
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");

  const weeks = getWeeksForMonth(selectedMonth);

  const showNotification = (text: string, type: "success" | "info" = "success") => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => getPreviousMonthString(prev));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => getNextMonthString(prev));
  };

  const handleCopyNextMonth = () => {
    const nextMonth = copyMonthRulesToNext(selectedMonth);
    setSelectedMonth(nextMonth);
    showNotification(
      `Regras de ${formatMonthTitle(selectedMonth)} repetidas com sucesso para ${formatMonthTitle(nextMonth)}!`,
      "success",
    );
  };

  const handleResetMonth = () => {
    resetMonthRules(selectedMonth);
    showNotification(`Regras de ${formatMonthTitle(selectedMonth)} foram resetadas para padrão.`, "info");
  };

  const handleSelectAllCards = () => {
    // Select all payment methods
    const all = paymentMethods.map((p) => p.name);
    setMonitoredPaymentMethods(all);
  };

  const handleSelectCreditCardsOnly = () => {
    // Detect credit cards / XP cards
    const credit = paymentMethods
      .map((p) => p.name)
      .filter((name) => {
        const lower = name.toLowerCase();
        return (
          lower.includes("crédito") ||
          lower.includes("credito") ||
          lower.includes("cartão") ||
          lower.includes("cartao") ||
          lower.includes("xp")
        );
      });
    setMonitoredPaymentMethods(credit.length > 0 ? credit : paymentMethods.map((p) => p.name));
  };

  const handleClearCards = () => {
    setMonitoredPaymentMethods([]);
  };

  // Cycle alert level: none -> yellow -> orange -> red -> none
  const handleCycleRule = (weekId: string, categoryName: string, currentLevel: ReductionAlertLevel = "none") => {
    const nextLevelMap: Record<ReductionAlertLevel, ReductionAlertLevel> = {
      none: "yellow",
      yellow: "orange",
      orange: "red",
      red: "none",
    };
    const nextLevel = nextLevelMap[currentLevel] || "none";
    updateWeekRule(selectedMonth, weekId, categoryName, nextLevel);
  };

  const handleStartEditDates = (week: ReductionWeek) => {
    setEditingWeekId(week.id);
    setTempStartDate(week.startDate);
    setTempEndDate(week.endDate);
  };

  const handleSaveDates = (weekId: string) => {
    if (!tempStartDate || !tempEndDate) return;
    const updated = weeks.map((w) => {
      if (w.id !== weekId) return w;
      return {
        ...w,
        startDate: tempStartDate,
        endDate: tempEndDate,
        label: `Semana (${formatWeekDateRange(tempStartDate, tempEndDate)})`,
      };
    });
    setWeeksForMonth(selectedMonth, updated);
    setEditingWeekId(null);
  };

  // Helper to format human month name (e.g. "Setembro de 2026")
  const formatMonthTitle = (monthStr: string) => {
    const [year, monthNum] = monthStr.split("-");
    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    const name = monthNames[parseInt(monthNum, 10) - 1] || monthStr;
    return `${name} de ${year}`;
  };

  return (
    <Card className="p-6 col-span-1 lg:col-span-2 shadow-sm">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 text-white shadow-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-foreground uppercase tracking-wider">
                Trava para Redução de Gastos Variáveis
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Novo
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-bold uppercase">
              Controle e alertas semanais por cartão e categoria (Baseado no planejamento de redução)
            </p>
          </div>
        </div>

        {/* Master Switch */}
        <div
          onClick={() => setIsEnabled(!isEnabled)}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 cursor-pointer transition-all select-none",
            isEnabled
              ? "bg-primary/10 border-primary text-foreground shadow-sm"
              : "bg-muted/40 border-border text-muted-foreground hover:border-muted-foreground/30",
          )}
        >
          <span className="text-xs font-black uppercase tracking-wider">
            {isEnabled ? "Trava Ativada" : "Trava Desativada"}
          </span>
          <div
            className={cn(
              "w-11 h-6 rounded-full p-1 transition-colors duration-200 relative",
              isEnabled ? "bg-primary" : "bg-muted",
            )}
          >
            <div
              className={cn(
                "w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200",
                isEnabled ? "translate-x-5" : "translate-x-0",
              )}
            />
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={cn(
            "mb-6 p-4 rounded-2xl border-2 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300",
            feedbackMessage.type === "success"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-accent/10 border-accent/30 text-accent",
          )}
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-bold uppercase tracking-tight">
            {feedbackMessage.text}
          </p>
        </div>
      )}

      {/* Main Configuration Content (if enabled) */}
      <div className={cn("space-y-6 transition-opacity", !isEnabled && "opacity-50 pointer-events-none")}>
        {/* Step 1: Payment Methods / Cards selection */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border-2 border-border/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest">
                1. Cartões e Meios Monitorados
              </h3>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectCreditCardsOnly}
                className="text-[10px] uppercase font-bold py-1 h-7"
              >
                Cartões de Crédito / XP
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllCards}
                className="text-[10px] uppercase font-bold py-1 h-7"
              >
                Todos
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearCards}
                className="text-[10px] uppercase font-bold py-1 h-7 text-muted-foreground"
              >
                Limpar
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground font-medium">
            Selecione quais formas de pagamento acionarão o aviso de redução de gastos (ex: Cartão XP, Cartão de Crédito):
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {paymentMethods.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum meio de pagamento cadastrado.</p>
            ) : (
              paymentMethods.map((pm) => {
                const isMonitored = monitoredPaymentMethods.some(
                  (m) => m.toLowerCase() === pm.name.toLowerCase(),
                );
                return (
                  <button
                    key={pm.id || pm.name}
                    type="button"
                    onClick={() => togglePaymentMethod(pm.name)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-1.5",
                      isMonitored
                        ? "bg-primary text-primary-foreground border-primary shadow-sm scale-102"
                        : "bg-muted/50 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {isMonitored ? <Check className="w-3.5 h-3.5" /> : null}
                    <span>{pm.name}</span>
                  </button>
                );
              })
            )}
          </div>

          {monitoredPaymentMethods.length === 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Nenhum cartão selecionado. Escolha ao menos um para que os alertas funcionem.</span>
            </div>
          )}
        </div>

        {/* Step 2: Month & Weekly Matrix Configuration */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border-2 border-border/80 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest">
                2. Matriz Semanal de Redução
              </h3>
            </div>

            {/* Month Navigator */}
            <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-2xl border border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                className="h-8 w-8 p-0"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-black uppercase tracking-wider px-2 min-w-[140px] text-center text-foreground">
                {formatMonthTitle(selectedMonth)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="h-8 w-8 p-0"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Action Buttons: Repeat to Next Month / Reset */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCopyNextMonth}
                className="text-[11px] font-black uppercase tracking-wider h-8 flex items-center gap-1.5"
                title="Deseja repetir config para próximo mês?"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Repetir para próximo mês</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetMonth}
                className="text-[11px] font-bold uppercase tracking-wider h-8 text-muted-foreground hover:text-foreground"
                title="Resetar regras deste mês"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetar Mês</span>
              </Button>
            </div>
          </div>

          {/* Quick instructions & Legend */}
          <div className="bg-muted/40 p-3 rounded-xl border border-border text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-muted-foreground font-medium text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Clique na célula para alternar o status:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[10px] font-black uppercase">
              <span className="px-2 py-0.5 rounded-lg border border-border text-muted-foreground bg-card">
                ✓ Livre
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Amarelo
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Laranja
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1">
                <Ban className="w-3 h-3" /> Vermelho (Trava "X")
              </span>
            </div>
          </div>

          {/* Weekly Reduction Matrix Table */}
          <div className="overflow-x-auto rounded-xl border-2 border-border shadow-inner">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-muted/70 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <th className="p-3 w-48 sticky left-0 bg-muted/90 backdrop-blur-sm z-10">
                    Semana / Período
                  </th>
                  {expenseCategories.map((cat) => (
                    <th key={cat.code || cat.name} className="p-3 text-center min-w-[110px]">
                      <span className="block truncate" title={cat.name}>
                        {cat.emoji ? `${cat.emoji} ` : ""}
                        {cat.name}
                      </span>
                    </th>
                  ))}
                  <th className="p-3 text-center min-w-[130px]">Ações da Semana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs font-medium">
                {weeks.map((week, weekIdx) => {
                  const isEditingDates = editingWeekId === week.id;

                  return (
                    <tr key={week.id} className="hover:bg-muted/20 transition-colors">
                      {/* Week Header Column */}
                      <td className="p-3 font-bold sticky left-0 bg-card z-10 border-r border-border">
                        {isEditingDates ? (
                          <div className="space-y-2 p-1">
                            <span className="text-[10px] font-black uppercase text-primary">
                              Editar Datas:
                            </span>
                            <div className="flex items-center gap-1">
                              <Input
                                type="date"
                                value={tempStartDate}
                                onChange={(e) => setTempStartDate(e.target.value)}
                                className="h-7 text-[10px] px-1 py-0"
                              />
                              <span className="text-[10px]">a</span>
                              <Input
                                type="date"
                                value={tempEndDate}
                                onChange={(e) => setTempEndDate(e.target.value)}
                                className="h-7 text-[10px] px-1 py-0"
                              />
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleSaveDates(week.id)}
                                className="h-6 text-[9px] px-2 py-0"
                              >
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingWeekId(null)}
                                className="h-6 text-[9px] px-2 py-0"
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group">
                            <div>
                              <p className="font-black text-foreground text-xs uppercase tracking-tight">
                                Semana {weekIdx + 1}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {formatWeekDateRange(week.startDate, week.endDate)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStartEditDates(week)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground text-[10px]"
                              title="Ajustar datas da semana"
                            >
                              Datas
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Category Cells */}
                      {expenseCategories.map((cat) => {
                        const currentRule = week.categoryRules[cat.name] || "none";

                        const getBadgeStyle = (level: ReductionAlertLevel) => {
                          switch (level) {
                            case "red":
                              return "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40 hover:bg-red-500/30";
                            case "orange":
                              return "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/40 hover:bg-orange-500/30";
                            case "yellow":
                              return "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/30";
                            case "none":
                            default:
                              return "bg-transparent text-muted-foreground/60 border-dashed border-border/80 hover:border-primary/40 hover:text-foreground";
                          }
                        };

                        const getBadgeContent = (level: ReductionAlertLevel) => {
                          switch (level) {
                            case "red":
                              return (
                                <span className="flex items-center justify-center gap-1 font-black text-[10px] tracking-tight">
                                  <Ban className="w-3 h-3" /> ✕ TRAVA
                                </span>
                              );
                            case "orange":
                              return (
                                <span className="flex items-center justify-center gap-1 font-black text-[10px] tracking-tight">
                                  <AlertTriangle className="w-3 h-3" /> LARANJA
                                </span>
                              );
                            case "yellow":
                              return (
                                <span className="flex items-center justify-center gap-1 font-black text-[10px] tracking-tight">
                                  <AlertCircle className="w-3 h-3" /> AMARELO
                                </span>
                              );
                            case "none":
                            default:
                              return <span className="text-[10px] font-bold">Livre</span>;
                          }
                        };

                        return (
                          <td key={cat.code || cat.name} className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleCycleRule(week.id, cat.name, currentRule)}
                              className={cn(
                                "w-full py-2 px-1.5 rounded-xl border transition-all select-none cursor-pointer flex items-center justify-center",
                                getBadgeStyle(currentRule),
                              )}
                              title={`${cat.name} (${week.label}): Clique para alterar`}
                            >
                              {getBadgeContent(currentRule)}
                            </button>
                          </td>
                        );
                      })}

                      {/* Week Bulk Actions */}
                      <td className="p-2 text-center border-l border-border">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setWeekAllCategories(
                                selectedMonth,
                                week.id,
                                "red",
                                expenseCategories.map((c) => c.name),
                              )
                            }
                            className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                            title="Travar todas as categorias desta semana como vermelho"
                          >
                            Travar Tudo
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setWeekAllCategories(
                                selectedMonth,
                                week.id,
                                "none",
                                expenseCategories.map((c) => c.name),
                              )
                            }
                            className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tight bg-muted text-muted-foreground hover:text-foreground transition-all"
                            title="Liberar todas as categorias desta semana"
                          >
                            Liberar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium pt-1">
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              Ao adicionar qualquer despesa nessa data e nos cartões monitorados, caso a categoria esteja configurada com Amarelo, Laranja ou Vermelho, um pop-up de confirmação com opções <strong>"Estou Ciente"</strong> ou <strong>"Cancelar"</strong> será apresentado.
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
