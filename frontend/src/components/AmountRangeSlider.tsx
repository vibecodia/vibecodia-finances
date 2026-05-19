import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../utils/helpers';

interface AmountRangeSliderProps {
  uniqueAmounts: number[];
  minValueIndex: number;
  maxValueIndex: number;
  onChange: (minIndex: number, maxIndex: number) => void;
}

export const AmountRangeSlider: React.FC<AmountRangeSliderProps> = ({
  uniqueAmounts,
  minValueIndex,
  maxValueIndex,
  onChange,
}) => {
  const { theme } = useTheme();
  const sliderRef = useRef<HTMLDivElement>(null);

  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [activeThumb, setActiveThumb] = useState<'start' | 'end' | null>(null);

  const maxIndex = uniqueAmounts.length - 1;

  const startPercentage = maxIndex > 0 ? (minValueIndex / maxIndex) * 100 : 0;
  const endPercentage = maxIndex > 0 ? (maxValueIndex / maxIndex) * 100 : 100;

  const rangeWidth = endPercentage - startPercentage;
  const rangeLeft = startPercentage;

  const calculateIndexFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent): number => {
      if (!sliderRef.current) return 0;
      const sliderRect = sliderRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clickX = clientX - sliderRect.left;
      const percentage = clickX / sliderRect.width;
      const rawIndex = Math.round(percentage * maxIndex);
      return Math.max(0, Math.min(maxIndex, rawIndex));
    },
    [maxIndex]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const clickedIndex = calculateIndexFromEvent(e);
      const distanceToStart = Math.abs(clickedIndex - minValueIndex);
      const distanceToEnd = Math.abs(clickedIndex - maxValueIndex);

      if (distanceToStart <= distanceToEnd) {
        setIsDraggingStart(true);
        setActiveThumb('start');
      } else {
        setIsDraggingEnd(true);
        setActiveThumb('end');
      }
    },
    [calculateIndexFromEvent, minValueIndex, maxValueIndex]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const clickedIndex = calculateIndexFromEvent(e);
      const distanceToStart = Math.abs(clickedIndex - minValueIndex);
      const distanceToEnd = Math.abs(clickedIndex - maxValueIndex);

      const targetThumb = distanceToStart <= distanceToEnd ? 'start' : 'end';
      setActiveThumb(targetThumb);

      if (targetThumb === 'start') {
        setIsDraggingStart(true);
      } else {
        setIsDraggingEnd(true);
      }
    },
    [calculateIndexFromEvent, minValueIndex, maxValueIndex]
  );

  const updateRange = useCallback(
    (newMinIndex: number, newMaxIndex: number) => {
      const min = Math.min(newMinIndex, newMaxIndex);
      const max = Math.max(newMinIndex, newMaxIndex);
      onChange(min, max);
    },
    [onChange]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingStart && !isDraggingEnd) return;
      const newIndex = calculateIndexFromEvent(e);

      if (isDraggingStart) {
        const clampedStart = Math.min(newIndex, maxValueIndex);
        setActiveThumb('start');
        updateRange(clampedStart, maxValueIndex);
      } else if (isDraggingEnd) {
        const clampedEnd = Math.max(newIndex, minValueIndex);
        setActiveThumb('end');
        updateRange(minValueIndex, clampedEnd);
      }
    },
    [isDraggingStart, isDraggingEnd, calculateIndexFromEvent, maxValueIndex, minValueIndex, updateRange]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDraggingStart && !isDraggingEnd) return;
      const newIndex = calculateIndexFromEvent(e);

      if (isDraggingStart) {
        const clampedStart = Math.min(newIndex, maxValueIndex);
        setActiveThumb('start');
        updateRange(clampedStart, maxValueIndex);
      } else if (isDraggingEnd) {
        const clampedEnd = Math.max(newIndex, minValueIndex);
        setActiveThumb('end');
        updateRange(minValueIndex, clampedEnd);
      }
    },
    [isDraggingStart, isDraggingEnd, calculateIndexFromEvent, maxValueIndex, minValueIndex, updateRange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
    setActiveThumb(null);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
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

  if (uniqueAmounts.length === 0) return null;

  return (
    <div className="flex flex-col w-full py-6 px-2 relative z-20 overflow-visible select-none">
      <style>{`
        @keyframes floatIn {
          0% { opacity: 0; transform: translate(-50%, 8px) scale(0.8); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .animate-float-in {
          animation: floatIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.2) forwards;
        }
      `}</style>

      <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2 px-1">
        <span>{formatCurrency(uniqueAmounts[0])}</span>
        <span>{formatCurrency(uniqueAmounts[maxIndex])}</span>
      </div>

      <div
        ref={sliderRef}
        className="relative h-2 rounded-full cursor-pointer flex items-center select-none"
        style={{ backgroundColor: theme.cardBorder }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Ticks */}
        <div className="absolute inset-0 flex justify-between px-0.5 pointer-events-none">
          {uniqueAmounts.map((_, i) => (
            <div
              key={i}
              className={`w-px h-2 rounded-full ${
                i === minValueIndex || i === maxValueIndex ? 'opacity-0' : 'opacity-20'
              }`}
              style={{
                backgroundColor: theme.text,
                height: (i + 1) % 5 === 0 ? '6px' : '3px',
                marginTop: (i + 1) % 5 === 0 ? '-2px' : '0px',
              }}
            />
          ))}
        </div>

        {/* Selected Range Track */}
        <div
          className="absolute h-full rounded-full transition-all duration-75"
          style={{
            left: `${rangeLeft}%`,
            width: `${rangeWidth}%`,
            backgroundColor: theme.primary,
            boxShadow: `0 0 10px ${theme.primary}40`,
          }}
        />

        {/* Start Thumb */}
        <div
          className={`absolute w-6 h-6 rounded-full shadow-lg flex items-center justify-center transform transition-all duration-150 z-30 ${
            activeThumb === 'start' ? 'scale-125' : 'hover:scale-110'
          }`}
          style={{
            left: `calc(${startPercentage}% - 12px)`,
            backgroundColor: theme.primary,
            border: `2px solid ${theme.cardBackground}`,
          }}
        >
          <span className="text-[9px] font-bold text-white select-none">
            {formatCurrency(uniqueAmounts[minValueIndex])}
          </span>

          {/* Tooltip */}
          {(activeThumb === 'start' || isDraggingStart) && (
            <div
              className="absolute top-[-38px] left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-white text-[10px] font-bold shadow-[0_5px_15px_rgba(0,0,0,0.3)] border border-white/20 z-[100] whitespace-nowrap animate-float-in"
              style={{ backgroundColor: theme.primary }}
            >
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-white/10"
                style={{ backgroundColor: theme.primary }}
              />
              <span className="relative z-10 drop-shadow-sm">
                {formatCurrency(uniqueAmounts[minValueIndex])}
              </span>
            </div>
          )}
        </div>

        {/* End Thumb */}
        <div
          className={`absolute w-6 h-6 rounded-full shadow-lg flex items-center justify-center transform transition-all duration-150 z-30 ${
            activeThumb === 'end' ? 'scale-125' : 'hover:scale-110'
          }`}
          style={{
            left: `calc(${endPercentage}% - 12px)`,
            backgroundColor: theme.primary,
            border: `2px solid ${theme.cardBackground}`,
          }}
        >
          <span className="text-[9px] font-bold text-white select-none">
            {formatCurrency(uniqueAmounts[maxValueIndex])}
          </span>

          {/* Tooltip */}
          {(activeThumb === 'end' || isDraggingEnd) && (
            <div
              className="absolute top-[-38px] left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-white text-[10px] font-bold shadow-[0_5px_15px_rgba(0,0,0,0.3)] border border-white/20 z-[100] whitespace-nowrap animate-float-in"
              style={{ backgroundColor: theme.primary }}
            >
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-white/10"
                style={{ backgroundColor: theme.primary }}
              />
              <span className="relative z-10 drop-shadow-sm">
                {formatCurrency(uniqueAmounts[maxValueIndex])}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AmountRangeSlider;
