import { ShoppingBasket } from "lucide-react";
import React from "react";
import { cn } from "../lib/utils";

interface ShoppingCartButtonProps {
  itemCount: number;
  onClick: () => void;
  className?: string;
  animateCombined?: boolean;
}

const ShoppingCartButton: React.FC<ShoppingCartButtonProps> = ({
  itemCount,
  onClick,
  className,
  animateCombined,
}) => {
  return (
    <div className={cn("relative", className)}>
      <button
        onClick={onClick}
        className={cn(
          "relative overflow-hidden group",
          "bg-paperAlt text-ink",
          "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-md",
          "border border-rule hover:border-ruleStrong transition-colors active:scale-90",
          animateCombined && "animate-shake-and-pulse",
        )}
        aria-label="Abrir lista de compras"
      >
        <ShoppingBasket className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
      </button>

      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-pen text-paperAlt text-[10px] font-bold rounded-full min-w-[1.4rem] h-[1.4rem] px-1 flex items-center justify-center border-2 border-paperAlt z-50 pointer-events-none">
          {itemCount}
        </span>
      )}
    </div>
  );
};

export default ShoppingCartButton;
