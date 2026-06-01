import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { format, isToday, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  X,
  Clock,
  RefreshCw,
  Plus,
  Sparkles,
  Trash2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { Transaction } from "../types";
import { formatCurrency } from "../utils/helpers";

import { useLocalStorage } from "../hooks/trello/useLocalStorage";

interface RecentTransactionsFloatingCardProps {
  transactions: Transaction[];
}

const RecentTransactionsFloatingCard: React.FC<
  RecentTransactionsFloatingCardProps
> = ({ transactions }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [timerProgress, setTimerProgress] = useState(0);
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Settings from LocalStorage
  const [recentTransactionsDuration] = useLocalStorage(
    "recent_transactions_duration",
    15,
  );
  const [recentTransactionsEnabled] = useLocalStorage(
    "recent_transactions_enabled",
    true,
  );
  const [recentTransactionsOpacity] = useLocalStorage(
    "recent_transactions_opacity",
    80,
  );
  const [recentTransactionsCount] = useLocalStorage(
    "recent_transactions_count",
    3,
  );

  const DURATION = recentTransactionsDuration * 1000;
  const radius = 15;
  const circumference = 2 * Math.PI * radius;

  const allRecentTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt).getTime();
    return dateB - dateA;
  });

  const recentTransactions = allRecentTransactions.slice(
    0,
    recentTransactionsCount,
  );

  useEffect(() => {
    if (!recentTransactionsEnabled || transactions.length === 0) {
      setIsVisible(false);
      return;
    }

    // Dispara a aparição do card
    const showTimeout = setTimeout(() => {
      setIsVisible(true);
      setTimerProgress(0);
      setTimeout(() => setTimerProgress(100), 50);
    }, 500);

    const hideTimeout = setTimeout(() => {
      if (!isExpanded) {
        setIsVisible(false);
      }
    }, 500 + DURATION);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
    };
  }, [transactions, recentTransactionsEnabled, DURATION, isExpanded]);

  // Global click listener to hide card when any button is clicked (resetting timer)
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Se clicar em qualquer botão ou elemento dentro de um botão (que não seja o de expandir), esconde o card
      if (target.closest("button") && !target.closest(".expand-btn")) {
        setIsVisible(false);
        setTimerProgress(0);
        setIsExpanded(false);
      }
    };

    if (isVisible && !isExpanded) {
      document.addEventListener("mousedown", handleGlobalClick, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleGlobalClick, true);
    };
  }, [isVisible, isExpanded]);

  if (!recentTransactionsEnabled || recentTransactions.length === 0)
    return null;

  const strokeDashoffset =
    circumference - (timerProgress / 100) * circumference;

  if (typeof document === "undefined") return null;

  const getBackgroundColor = () => {
    const hex = theme.cardBackground;
    let r = 0,
      g = 0,
      b = 0;

    // Simplificado para hex de 7 caracteres (#RRGGBB) que é o padrão do ThemeContext
    if (hex.startsWith("#") && hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    } else if (hex.startsWith("#") && hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else {
      // Fallback se não for hex
      return hex;
    }

    return `rgba(${r}, ${g}, ${b}, ${recentTransactionsOpacity / 100})`;
  };

  return createPortal(
    <div
      className={`fixed z-[100] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform ${
        isExpanded
          ? "inset-0 flex items-center justify-center p-4 bg-background/40 backdrop-blur-md"
          : `bottom-4 right-8 ${isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-95 pointer-events-none"}`
      }`}
      style={{ willChange: "transform, opacity" }}
    >
      <div
        className={`rounded-[2.5rem] p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border backdrop-blur-2xl relative overflow-hidden transition-all duration-500 ${
          isExpanded ? "w-full max-w-2xl max-h-[80vh] overflow-y-auto" : "w-80"
        }`}
        style={{
          backgroundColor: getBackgroundColor(),
          borderColor: `${theme.cardBorder}44`,
        }}
      >
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[60px] opacity-20 pointer-events-none"
          style={{ backgroundColor: theme.primary }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-6 sticky top-0 z-20 bg-transparent">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 border border-primary/20">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[10px] font-bold text-foreground/90 tracking-widest uppercase">
              {isExpanded ? "Histórico Recente" : "Recentes"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="expand-btn flex items-center justify-center w-8 h-8 rounded-full hover:bg-text/5 transition-all group/expand"
              title={isExpanded ? "Recolher" : "Expandir"}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 text-foreground/40 group-hover/expand:text-foreground transition-colors" />
              ) : (
                <Maximize2 className="w-4 h-4 text-foreground/40 group-hover/expand:text-foreground transition-colors" />
              )}
            </button>

            {!isExpanded && (
              <button
                onClick={() => setIsVisible(false)}
                className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-text/5 transition-all group/btn"
              >
                <svg
                  className="absolute w-full h-full -rotate-90"
                  viewBox="0 0 40 40"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-foreground/5"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r={radius}
                    fill="none"
                    stroke={theme.primary}
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    style={{
                      strokeDashoffset,
                      transition: isVisible
                        ? `stroke-dashoffset ${DURATION}ms linear`
                        : "none",
                      filter: `drop-shadow(0 0 4px ${theme.primary}66)`,
                    }}
                    strokeLinecap="round"
                  />
                </svg>
                <X className="w-4 h-4 text-foreground/40 group-hover/btn:text-foreground z-10 transition-colors" />
              </button>
            )}

            {isExpanded && (
              <button
                onClick={() => {
                  setIsExpanded(false);
                  setIsVisible(false);
                }}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-text/5 transition-all group/close"
              >
                <X className="w-4 h-4 text-foreground/40 group-hover/close:text-foreground transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="space-y-5 relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />

          {(isExpanded ? allRecentTransactions : recentTransactions).map(
            (t) => {
              const createdAt = new Date(t.createdAt);
              const isDeleted = t.status === "deleted";
              // Se foi deletado recentemente (updatedAt no caso de delete reflete o momento da exclusão)
              const isUpdated =
                !isDeleted &&
                t.updatedAt &&
                Math.abs(
                  new Date(t.updatedAt).getTime() - createdAt.getTime(),
                ) > 1000;

              const diffMin = Math.abs(
                differenceInMinutes(new Date(), createdAt),
              );

              // PRIORIDADE DE TAGS:
              // 1. "Removido" se status for deleted
              // 2. "Adicionado" se tiver menos de 30 min
              // 3. "Novo" se for de hoje (e tiver mais de 30 min)
              // 4. "Editado" se tiver updatedAt diferente de createdAt
              const showJustAdded = !isDeleted && diffMin <= 30;
              const showNewToday =
                !isDeleted && !showJustAdded && isToday(createdAt);

              const handleItemClick = () => {
                if (isExpanded) {
                  const targetPath =
                    t.type === "expense" ? "/expenses" : "/income";
                  navigate(`${targetPath}?highlight=${t.id || t._id}`);
                  setIsExpanded(false);
                  setIsVisible(false);
                }
              };

              return (
                <div
                  key={t.id || t._id}
                  className={`relative flex items-start gap-4 group/item ${isExpanded ? "cursor-pointer hover:bg-foreground/5 p-2 -m-2 rounded-2xl transition-all" : ""}`}
                  onClick={handleItemClick}
                >
                  <div
                    className={`mt-1.5 w-2.5 h-2.5 rounded-full z-10 ring-4 ${
                      isDeleted
                        ? "bg-text/20 ring-text/5"
                        : t.type === "income"
                          ? "bg-emerald-500 ring-emerald-500/10"
                          : "bg-rose-500 ring-rose-500/10"
                    }`}
                  />

                  <div className="flex-1 min-w-0 transition-transform group-hover/item:translate-x-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p
                        className={`text-sm font-medium truncate leading-tight transition-colors ${
                          isDeleted
                            ? "text-foreground/30 line-through"
                            : "text-foreground/90"
                        }`}
                      >
                        {t.description}
                      </p>
                      <div
                        className={`flex items-center gap-0.5 font-bold text-sm transition-colors ${
                          isDeleted
                            ? "text-foreground/20 line-through"
                            : t.type === "income"
                              ? "text-emerald-500"
                              : "text-rose-500"
                        }`}
                      >
                        {formatCurrency(t.amount)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-foreground/40 font-medium tabular-nums">
                        {format(new Date(t.updatedAt || t.createdAt), "HH:mm", {
                          locale: ptBR,
                        })}
                      </span>

                      {isDeleted && (
                        <span className="flex items-center gap-1 text-[9px] bg-text/5 text-foreground/40 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border border-text/10">
                          <Trash2 className="w-2.5 h-2.5" /> Removido
                        </span>
                      )}

                      {showJustAdded && (
                        <span className="flex items-center gap-1 text-[9px] bg-violet-500/10 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border border-violet-500/20">
                          <Sparkles className="w-2.5 h-2.5" /> Adicionado
                        </span>
                      )}

                      {showNewToday && (
                        <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border border-emerald-500/20">
                          <Plus className="w-2.5 h-2.5" /> Novo
                        </span>
                      )}

                      {isUpdated && (
                        <span className="flex items-center gap-1 text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border border-blue-500/20">
                          <RefreshCw className="w-2.5 h-2.5" /> Editado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default RecentTransactionsFloatingCard;
