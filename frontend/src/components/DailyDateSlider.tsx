import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';

interface DailyDateSliderProps {
  currentMonth: Date;
  startDate: Date;
  endDate: Date;
  onChange: (newStartDate: Date, newEndDate: Date) => void;
}

const DailyDateSlider: React.FC<DailyDateSliderProps> = ({
  currentMonth,
  startDate,
  endDate,
  onChange,
}) => {
  const { theme } = useTheme();
  const daysInMonth = getDaysInMonth(currentMonth);
  const monthStart = startOfMonth(currentMonth);

  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [activeThumb, setActiveThumb] = useState<'start' | 'end' | null>(null); // New state for active thumb
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for long press timeout

  // Convert dates to day numbers (1-indexed)
  const getDayNumber = useCallback((date: Date) => date.getDate(), []);

  const initialStartDay = startDate ? getDayNumber(startDate) : 1;
  const initialEndDay = endDate ? getDayNumber(endDate) : daysInMonth;

  const [startDay, setStartDay] = useState(initialStartDay);
  const [endDay, setEndDay] = useState(initialEndDay);

  // Update internal state when props change
  useEffect(() => {
    setStartDay(getDayNumber(startDate));
    setEndDay(getDayNumber(endDate));
  }, [startDate, endDate, getDayNumber]);

  const calculateDayFromMouseEvent = useCallback((e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent) => {
    if (!sliderRef.current) return 0;
    const sliderRect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickX = clientX - sliderRect.left;
    const percentage = clickX / sliderRect.width;
    let day = Math.round(percentage * (daysInMonth - 1)) + 1; // 1-indexed day
    day = Math.max(1, Math.min(daysInMonth, day)); // Clamp between 1 and daysInMonth
    return day;
  }, [daysInMonth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const clickedDay = calculateDayFromMouseEvent(e);
    const distanceToStart = Math.abs(clickedDay - startDay);
    const distanceToEnd = Math.abs(clickedDay - endDay);

    if (distanceToStart <= distanceToEnd) {
      setIsDraggingStart(true);
    } else {
      setIsDraggingEnd(true);
    }
  }, [calculateDayFromMouseEvent, startDay, endDay]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const clickedDay = calculateDayFromMouseEvent(e);
    const distanceToStart = Math.abs(clickedDay - startDay);
    const distanceToEnd = Math.abs(clickedDay - endDay);

    const targetThumb = distanceToStart <= distanceToEnd ? 'start' : 'end';

    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }

    longPressTimeoutRef.current = setTimeout(() => {
      setActiveThumb(targetThumb);
    }, 300); // 300ms for long press

    if (targetThumb === 'start') {
      setIsDraggingStart(true);
    } else {
      setIsDraggingEnd(true);
    }
  }, [calculateDayFromMouseEvent, startDay, endDay]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingStart && !isDraggingEnd) return;

    const newDay = calculateDayFromMouseEvent(e);

    if (isDraggingStart) {
      let newStart = Math.min(newDay, endDay);
      newStart = Math.max(1, newStart);
      setStartDay(newStart);
      onChange(addDays(monthStart, newStart - 1), addDays(monthStart, endDay - 1));
    } else if (isDraggingEnd) {
      let newEnd = Math.max(newDay, startDay);
      newEnd = Math.min(daysInMonth, newEnd);
      setEndDay(newEnd);
      onChange(addDays(monthStart, startDay - 1), addDays(monthStart, newEnd - 1));
    }
  }, [isDraggingStart, isDraggingEnd, calculateDayFromMouseEvent, endDay, startDay, daysInMonth, monthStart, onChange]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingStart && !isDraggingEnd) return;

    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    const newDay = calculateDayFromMouseEvent(e);

    if (isDraggingStart) {
      let newStart = Math.min(newDay, endDay);
      newStart = Math.max(1, newStart);
      setStartDay(newStart);
      onChange(addDays(monthStart, newStart - 1), addDays(monthStart, endDay - 1));
    } else if (isDraggingEnd) {
      let newEnd = Math.max(newDay, startDay);
      newEnd = Math.min(daysInMonth, newEnd);
      setEndDay(newEnd);
      onChange(addDays(monthStart, startDay - 1), addDays(monthStart, newEnd - 1));
    }
  }, [isDraggingStart, isDraggingEnd, calculateDayFromMouseEvent, endDay, startDay, daysInMonth, monthStart, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
    setActiveThumb(null);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const startPercentage = ((startDay - 1) / (daysInMonth - 1)) * 100;
  const endPercentage = ((endDay - 1) / (daysInMonth - 1)) * 100;

  const rangeWidth = endPercentage - startPercentage;
  const rangeLeft = startPercentage;

  return (
    <div
      ref={sliderRef}
      className="relative w-5/6 h-4 rounded-full cursor-pointer flex items-center"
      style={{ backgroundColor: theme.cardBorder }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Track */}
      <div
        className="absolute h-full rounded-full opacity-70"
        style={{
          left: `${rangeLeft}%`,
          width: `${rangeWidth}%`,
          backgroundColor: theme.primary,
        }}
      ></div>

      {/* Start Thumb */}
      <div
        className={`absolute w-5 h-5 rounded-full shadow-md flex items-center justify-center transform ${activeThumb === 'start' ? 'scale-150' : ''} transition-transform duration-200`}
        style={{
          left: `calc(${startPercentage}% - 10px)`,
          backgroundColor: theme.primary,
          zIndex: 1,
        }}
      >
        <span className="text-xs font-bold text-white select-none">{startDay}</span>
      </div>

      {/* End Thumb */}
      <div
        className={`absolute w-5 h-5 rounded-full shadow-md flex items-center justify-center transform ${activeThumb === 'end' ? 'scale-150' : ''} transition-transform duration-200`}
        style={{
          left: `calc(${endPercentage}% - 10px)`,
          backgroundColor: theme.primary,
          zIndex: 1,
        }}
      >
        <span className="text-xs font-bold text-white select-none">{endDay}</span>
      </div>
    </div>
  );
};

export default DailyDateSlider;