import React from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Pencil,
  ArrowRight,
  Archive,
  RotateCcw,
  Pin,
  CheckSquare,
  Clock,
} from "lucide-react";
import { HistoryEntry } from "../../types/trello/task";
import { cn } from "../../lib/utils";

interface TaskHistoryProps {
  history: HistoryEntry[];
}

const actionConfig: Record<
  HistoryEntry["action"],
  { icon: React.ElementType; label: string; color: string }
> = {
  create: {
    icon: Plus,
    label: "Criação",
    color: "text-green-500 bg-green-500/10",
  },
  update: {
    icon: Pencil,
    label: "Atualização",
    color: "text-blue-500 bg-blue-500/10",
  },
  move: {
    icon: ArrowRight,
    label: "Movimentação",
    color: "text-amber-500 bg-amber-500/10",
  },
  archive: {
    icon: Archive,
    label: "Arquivamento",
    color: "text-gray-500 bg-gray-500/10",
  },
  unarchive: {
    icon: RotateCcw,
    label: "Desarquivamento",
    color: "text-purple-500 bg-purple-500/10",
  },
  pin: { icon: Pin, label: "Fixação", color: "text-primary bg-primary/10" },
  unpin: {
    icon: RotateCcw,
    label: "Desafixação",
    color: "text-muted-foreground bg-muted/20",
  },
  checklist_toggle: {
    icon: CheckSquare,
    label: "Checklist",
    color: "text-cyan-500 bg-cyan-500/10",
  },
  timelog_add: {
    icon: Clock,
    label: "Horas",
    color: "text-violet-500 bg-violet-500/10",
  },
};

const TaskHistory: React.FC<TaskHistoryProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground/40 border-2 border-dashed border-border rounded-xl">
        <Plus className="w-6 h-6 mx-auto mb-2 opacity-50" />
        <span className="text-[10px] font-black uppercase tracking-widest">
          Nenhum evento registrado
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Linha da timeline */}
      <div className="absolute left-[17px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />

      <div className="space-y-3">
        {history.map((entry) => {
          const config = actionConfig[entry.action] || actionConfig.update;

          return (
            <div
              key={entry.id}
              className="relative flex items-start gap-4 group"
            >
              {/* Bolinha */}
              <div
                className={cn(
                  "mt-1 w-3.5 h-3.5 rounded-full z-10 ring-4 shrink-0",
                  config.color,
                  "ring-[hsl(var(--card))]",
                )}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black uppercase tracking-wide text-foreground">
                    {config.label}
                  </p>
                  <span className="text-[9px] text-muted-foreground/60 font-bold whitespace-nowrap">
                    {formatDistanceToNow(new Date(entry.date), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>

                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">
                  {entry.details}
                </p>

                {/* Tooltip com data completa */}
                <div className="hidden group-hover:block absolute right-0 top-0 z-20 bg-popover border border-border shadow-lg rounded-lg px-2 py-1 text-[9px] font-mono text-muted-foreground whitespace-nowrap">
                  {new Date(entry.date).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskHistory;
