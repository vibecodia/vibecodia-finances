import { ShoppingBasket } from 'lucide-react';
import React from 'react';
import { cn } from '../lib/utils';

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
  animateCombined
}) => {
  return (
    <div className={cn("relative", className)}>
      <button
        onClick={onClick}
        className={cn(
          "relative overflow-hidden group animate-in fade-in zoom-in duration-500",
          "bg-white/10 backdrop-blur-md text-white",
          "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl",
          "border border-white/20 shadow-[0_4px_15px_rgba(0,0,0,0.1)]",
          "transition-all duration-500 hover:bg-white/20 active:scale-90",
          animateCombined && "animate-shake-and-pulse"
        )}
        aria-label="Abrir lista de compras"
      >
        {/* Background animated shine */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        <ShoppingBasket className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
      </button>

      {itemCount > 0 && (
        <span
          className="absolute -top-2 -right-2 bg-red-600 text-white text-[11px] font-black rounded-full h-6.5 w-6.5 flex items-center justify-center shadow-[0_2px_10px_rgba(220,38,38,0.6)] border-2 border-white animate-in zoom-in duration-300 z-50 pointer-events-none"
        >
          {itemCount}
        </span>
      )}
    </div>
  );
};

export default ShoppingCartButton;
