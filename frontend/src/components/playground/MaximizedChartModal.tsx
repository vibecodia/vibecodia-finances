import { Eye, X } from "lucide-react";
import React from "react";

export interface MaximizedChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badge?: React.ReactNode;
  showToggleAll?: boolean;
  onToggleAll?: () => void;
  cardBorder?: string;
  cardBackground?: string;
  children: React.ReactNode;
}

export const MaximizedChartModal: React.FC<MaximizedChartModalProps> = ({
  isOpen,
  onClose,
  title,
  badge,
  showToggleAll = false,
  onToggleAll,
  cardBorder,
  cardBackground,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-2 md:p-4 animate-in fade-in duration-200">
      <div
        className="w-full h-full bg-card rounded-3xl border shadow-2xl flex flex-col overflow-hidden"
        style={{
          borderColor: cardBorder || undefined,
          backgroundColor: cardBackground || undefined,
        }}
      >
        {/* Header */}
        <div
          className="p-6 border-b flex items-center justify-between"
          style={{ borderColor: cardBorder || undefined }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-foreground">{title}</span>
            {badge}
          </div>

          <div className="flex items-center gap-2">
            {showToggleAll && onToggleAll && (
              <button
                type="button"
                onClick={onToggleAll}
                className="p-2 px-4 hover:bg-muted rounded-xl transition-all text-foreground flex items-center gap-2 text-sm font-bold border border-border"
                title="Alternar Todos"
              >
                <Eye className="w-5 h-5" />
                <span>Alternar Todos</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-xl transition-all text-foreground"
              title="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 md:p-10">{children}</div>
      </div>
    </div>
  );
};
