import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  Maximize2,
} from "lucide-react";
import React from "react";

export interface PlaygroundCardHeaderProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  index: number;
  isCollapsed: boolean;
  totalItems?: number;
  itemNumber?: number;
  borderColor?: string;
  backgroundColor?: string;
  onToggleAll?: () => void;
  onMoveItem?: (index: number, direction: "up" | "down") => void;
  onMaximize?: (id: string) => void;
  onToggleCollapse?: (id: string) => void;
}

export const PlaygroundCardHeader: React.FC<PlaygroundCardHeaderProps> = ({
  id,
  label,
  icon,
  index,
  isCollapsed,
  totalItems = 0,
  itemNumber,
  borderColor,
  backgroundColor,
  onToggleAll,
  onMoveItem,
  onMaximize,
  onToggleCollapse,
}) => {
  return (
    <div
      className="p-4 border-b font-semibold text-foreground flex items-center justify-between group bg-muted/30 border-border"
      style={{
        borderColor: borderColor || undefined,
        backgroundColor: backgroundColor || undefined,
      }}
    >
      <div className="flex items-center gap-3">
        {typeof itemNumber === "number" && (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs">
            {itemNumber}
          </div>
        )}
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm lg:text-base font-semibold">{label}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {onToggleAll && !isCollapsed && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAll();
            }}
            className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:opacity-100"
            title="Alternar Todos"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}

        {onMoveItem && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveItem(index, "up");
              }}
              disabled={index === 0}
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
              disabled={index >= totalItems - 1}
              className="p-1.5 hover:bg-muted rounded-md transition-colors text-foreground opacity-0 group-hover:opacity-100 disabled:opacity-0"
              title="Mover para Baixo"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 mx-1 bg-muted opacity-0 group-hover:opacity-100" />
          </>
        )}

        {onMaximize && (
          <button
            type="button"
            onClick={() => onMaximize(id)}
            className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:opacity-100"
            title="Maximizar"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        {onToggleCollapse && (
          <button
            type="button"
            onClick={() => onToggleCollapse(id)}
            className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:opacity-100"
            title={isCollapsed ? "Expandir" : "Minimizar"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
