import React from 'react';
import { ShoppingBasket } from 'lucide-react';

import { ColorPalette } from '../contexts/ThemeContext';

interface ShoppingCartButtonProps {
  itemCount: number;
  onClick: () => void;
  theme: ColorPalette;
  className?: string;
  animateCombined?: boolean;
}

const ShoppingCartButton: React.FC<ShoppingCartButtonProps> = ({
  itemCount,
  onClick,
  theme,
  className,
  animateCombined
}) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-full shadow-lg flex items-center justify-center relative ${className} ${animateCombined ? 'animate-shake-and-pulse' : ''}`}
      style={{
        backgroundColor: theme.cardBackground,
        color: theme.text,
      }}
    >
      <ShoppingBasket size={26} />
      {itemCount > 0 && (
        <span
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
        >
          {itemCount}
        </span>
      )}
    </button>
  );
};

export default ShoppingCartButton;
