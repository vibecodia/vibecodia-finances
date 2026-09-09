import { AlertCircle, AlertTriangle, ShieldAlert } from "lucide-react";
import React from "react";

import { cn } from "../lib/utils";
import { ExpenseReductionAlert } from "../types/reductionLock";
import { formatWeekDateRange } from "../utils/reductionLockUtils";

import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface ReductionAlertModalProps {
  isOpen: boolean;
  alert: ExpenseReductionAlert | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ReductionAlertModal: React.FC<ReductionAlertModalProps> = ({
  isOpen,
  alert,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !alert) return null;

  const getAlertDetails = () => {
    switch (alert.level) {
      case "red":
        return {
          title: "Alerta de Redução Vermelho",
          subtitle: "Bloqueio crítico de despesa",
          badgeBg: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
          iconBg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
          cardBorder: "border-red-500/30",
          confirmClass: "bg-red-600 hover:bg-red-700 text-white shadow-lg",
          icon: ShieldAlert,
        };
      case "orange":
        return {
          title: "Alerta de Redução Laranja",
          subtitle: "Atenção máxima à redução",
          badgeBg: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
          iconBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
          cardBorder: "border-orange-500/30",
          confirmClass: "bg-orange-600 hover:bg-orange-700 text-white shadow-lg",
          icon: AlertTriangle,
        };
      case "yellow":
      default:
        return {
          title: "Alerta de Redução Amarelo",
          subtitle: "Aviso de contenção de gastos",
          badgeBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          cardBorder: "border-amber-500/30",
          confirmClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-lg",
          icon: AlertCircle,
        };
    }
  };

  const details = getAlertDetails();
  const IconComponent = details.icon;
  const formattedRange = formatWeekDateRange(alert.startDate, alert.endDate);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reduction-alert-title"
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <Card
        className={cn(
          "w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 p-0 overflow-hidden border-2",
          details.cardBorder,
        )}
      >
        <div className="p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            {/* Alert Icon */}
            <div
              className={cn(
                "p-4 rounded-2xl mb-4 border flex items-center justify-center",
                details.iconBg,
              )}
            >
              <IconComponent className="w-10 h-10 animate-pulse" />
            </div>

            {/* Level Badge */}
            <span
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border mb-2",
                details.badgeBg,
              )}
            >
              {details.subtitle}
            </span>

            {/* Title */}
            <h3
              id="reduction-alert-title"
              className="text-2xl font-black text-foreground uppercase tracking-tight mb-3"
            >
              {details.title}
            </h3>

            {/* Friendly Main Message */}
            <p className="text-sm text-foreground/90 font-medium leading-relaxed mb-4">
              Você estipulou{" "}
              <span className="font-bold text-destructive underline">
                não poder gastar
              </span>{" "}
              na categoria <strong className="text-foreground">{alert.categoryName}</strong>{" "}
              e no cartão <strong className="text-foreground">{alert.paymentMethod}</strong>{" "}
              esta semana.
            </p>

            {/* Context Box */}
            <div className="w-full bg-muted/60 border border-border rounded-xl p-3.5 text-left text-xs space-y-1.5 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-semibold uppercase text-[10px]">
                  Semana:
                </span>
                <span className="font-bold text-foreground">
                  {alert.weekLabel} {formattedRange ? `(${formattedRange})` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-semibold uppercase text-[10px]">
                  Categoria:
                </span>
                <span className="font-bold text-foreground">{alert.categoryName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-semibold uppercase text-[10px]">
                  Cartão / Meio:
                </span>
                <span className="font-bold text-foreground">{alert.paymentMethod}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row-reverse gap-3 bg-muted/50 border-t border-border">
          <Button
            onClick={onConfirm}
            className={cn("flex-1 text-xs font-black uppercase tracking-wider py-3", details.confirmClass)}
          >
            Estou Ciente
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 text-xs font-black uppercase tracking-wider py-3"
          >
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  );
};
