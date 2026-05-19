import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../utils/helpers';
import { cn } from '../lib/utils';

interface AmountRangeSliderProps {
  minAmount: number;
  maxAmount: number;
  selectedMin: number;
  selectedMax: number;
  onChange: (min: number, max: number) => void;
}

export const AmountRangeSlider: React.FC<AmountRangeSliderProps> = ({
  minAmount,
  maxAmount,
  selectedMin,
  selectedMax,
  onChange,
}) => {
  const { theme } = useTheme();
  const sliderRef = useRef<HTMLDivElement>(null);

  const [isDraggingMin, setIsDraggingMin] = useState(false);
  const [isDraggingMax, setIsDraggingMax] = useState(false);
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Local values for smooth dragging
  const [localMin, setLocalMin] = useState(selectedMin);
  const [localMax, setLocalMax] = useState(selectedMax);

  // Sync from props when they change from outside (e.g., reset)
  useEffect(() => {
    setLocalMin(selectedMin);
    setLocalMax(selectedMax);
  }, [selectedMin, selectedMax]);

  const range = maxAmount - minAmount;

  const minPercent = range > 0 ? ((localMin - minAmount) / range) * 100 : 0;
  const maxPercent = range > 0 ? ((localMax - minAmount) / range) * 100 : 0;

  const calculateAmountFromMouseEvent = useCallback(
    (e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent) => {
      if (!sliderRef.current) return minAmount;
      const sliderRect = sliderRef.current.getBoundingClientRect();
      const clientX =
        'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clickX = clientX - sliderRect.left;
      const percentage = clickX / sliderRect.width;
      const amount = minAmount + percentage * range;
      return Math.max(minAmount, Math.min(maxAmount, amount));
    },
    [minAmount, maxAmount, range],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const amount = calculateAmountFromMouseEvent(e);
      const distToMin = Math.abs(amount - localMin);
      const distToMax = Math.abs(amount - localMax);

      if (distToMin <= distToMax) {
        setIsDraggingMin(true);
        setActiveThumb('min');
      } else {
        setIsDraggingMax(true);
        setActiveThumb('max');
      }
    },
    [calculateAmountFromMouseEvent, localMin, localMax],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const amount = calculateAmountFromMouseEvent(e);
      const distToMin = Math.abs(amount - localMin);
      const distToMax = Math.abs(amount - localMax);
      const target = distToMin <= distToMax ? 'min' : 'max';

      setActiveThumb(target);
      if (target === 'min') setIsDraggingMin(true);
      else setIsDraggingMax(true);
    },
    [calculateAmountFromMouseEvent, localMin, localMax],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingMin && !isDraggingMax) return;
      const amount = calculateAmountFromMouseEvent(e);

      if (isDraggingMin) {
        const clamped = Math.min(amount, localMax);
        setLocalMin(clamped);
        onChange(clamped, localMax);
      } else if (isDraggingMax) {
        const clamped = Math.max(amount, localMin);
        setLocalMax(clamped);
        onChange(localMin, clamped);
      }
    },
    [isDraggingMin, isDraggingMax, calculateAmountFromMouseEvent, localMin, localMax, onChange],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDraggingMin && !isDraggingMax) return;
      const amount = calculateAmountFromMouseEvent(e);

      if (isDraggingMin) {
        const clamped = Math.min(amount, localMax);
        setLocalMin(clamped);
        onChange(clamped, localMax);
      } else if (isDraggingMax) {
        const clamped = Math.max(amount, localMin);
        setLocalMax(clamped);
        onChange(localMin, clamped);
      }
    },
    [isDraggingMin, isDraggingMax, calculateAmountFromMouseEvent, localMin, localMax, onChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingMin(false);
    setIsDraggingMax(false);
    setActiveThumb(null);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDraggingMin(false);
    setIsDraggingMax(false);
    setActiveThumb(null);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div className="flex flex-col w-full py-6 px-2 relative z-20 overflow-visible">
      <style>{`
        @keyframes floatIn {
          0% { opacity: 0; transform: translate(-50%, 8px) scale(0.8); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .animate-float-in {
          animation: floatIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.2) forwards;
        }
      `}</style>

      <div
        ref={sliderRef}
        className="relative h-2 rounded-full cursor-pointer flex items-center select-none"
        style={{ backgroundColor: theme.cardBorder }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Selected Range Track */}
        <div
          className="absolute h-full rounded-full transition-all duration-75"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
            backgroundColor: theme.primary,
            boxShadow: `0 0 10px ${theme.primary}40`,
          }}
        ></div>

        {/* Min Thumb */}
        <div
          className={`absolute w-6 h-6 rounded-full shadow-lg flex items-center justify-center transform transition-all duration-150 z-30 ${
            activeThumb === 'min' ? 'scale-125' : 'hover:scale-110'
          }`}
          style={{
            left: `calc(${minPercent}% - 12px)`,
            backgroundColor: theme.primary,
            border: `2px solid ${theme.cardBackground}`,
          }}
        >
          <span className="text-[10px] font-bold text-white select-none">
            {formatCurrency(localMin)}
          </span>

          {/* Tooltip */}
          {(activeThumb === 'min' || isDraggingMin) && (
            <div
              className="absolute top-[-38px] left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-white text-[10px] font-bold shadow-[0_5px_15px_rgba(0,0,0,0.3)] border border-white/20 z-[100] whitespace-nowrap animate-float-in"
              style={{ backgroundColor: theme.primary }}
            >
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-white/10"
                style={{ backgroundColor: theme.primary }}
              ></div>
              <span className="relative z-10 drop-shadow-sm">
                R$ {localMin.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Max Thumb */}
        <div
          className={`absolute w-6 h-6 rounded-full shadow-lg flex items-center justify-center transform transition-all duration-150 z-30 ${
            activeThumb === 'max' ? 'scale-125' : 'hover:scale-110'
          }`}
          style={{
            left: `calc(${maxPercent}% - 12px)`,
            backgroundColor: theme.primary,
            border: `2px solid ${theme.cardBackground}`,
          }}
        >
          <span className="text-[10px] font-bold text-white select-none">
            {formatCurrency(localMax)}
          </span>

          {/* Tooltip */}
          {(activeThumb === 'max' || isDraggingMax) && (
            <div
              className="absolute top-[-38px] left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-white text-[10px] font-bold shadow-[0_5px_15px_rgba(0,0,0,0.3)] border border-white/20 z-[100] whitespace-nowrap animate-float-in"
              style={{ backgroundColor: theme.primary }}
            >
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-white/10"
                style={{ backgroundColor: theme.primary }}
              ></div>
              <span className="relative z-10 drop-shadow-sm">
                R$ {localMax.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
