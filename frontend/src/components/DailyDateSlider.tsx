import {
  getDaysInMonth,
  startOfMonth,
  addDays,
  endOfDay,
  isSameDay,
} from "date-fns";
import React, { useState, useEffect, useRef, useCallback } from "react";

import { useTheme } from "../contexts/ThemeContext";

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
  const [activeThumb, setActiveThumb] = useState<"start" | "end" | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Convert dates to day numbers (1-indexed)
  const getDayNumber = useCallback((date: Date) => date.getDate(), []);

  const [startDay, setStartDay] = useState(() => getDayNumber(startDate));
  const [endDay, setEndDay] = useState(() => getDayNumber(endDate));

  // Update internal state when props change, but only if they actually changed to avoid jitter
  useEffect(() => {
    const newStart = getDayNumber(startDate);
    const newEnd = getDayNumber(endDate);
    setStartDay(newStart);
    setEndDay(newEnd);
  }, [startDate, endDate, getDayNumber]);

  const calculateDayFromMouseEvent = useCallback(
    (e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent) => {
      if (!sliderRef.current) return 1;
      const sliderRect = sliderRef.current.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clickX = clientX - sliderRect.left;
      const percentage = clickX / sliderRect.width;
      const day = Math.round(percentage * (daysInMonth - 1)) + 1;
      return Math.max(1, Math.min(daysInMonth, day));
    },
    [daysInMonth],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const clickedDay = calculateDayFromMouseEvent(e);
      const distanceToStart = Math.abs(clickedDay - startDay);
      const distanceToEnd = Math.abs(clickedDay - endDay);

      if (distanceToStart <= distanceToEnd) {
        setIsDraggingStart(true);
        setActiveThumb("start");
      } else {
        setIsDraggingEnd(true);
        setActiveThumb("end");
      }
    },
    [calculateDayFromMouseEvent, startDay, endDay],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const clickedDay = calculateDayFromMouseEvent(e);
      const distanceToStart = Math.abs(clickedDay - startDay);
      const distanceToEnd = Math.abs(clickedDay - endDay);

      const targetThumb = distanceToStart <= distanceToEnd ? "start" : "end";
      setActiveThumb(targetThumb);

      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }

      if (targetThumb === "start") {
        setIsDraggingStart(true);
      } else {
        setIsDraggingEnd(true);
      }
    },
    [calculateDayFromMouseEvent, startDay, endDay],
  );

  const updateRange = useCallback(
    (newStart: number, newEnd: number) => {
      const newStartDate = addDays(monthStart, newStart - 1);
      const newEndDate = endOfDay(addDays(monthStart, newEnd - 1));

      // Only call onChange if dates have actually changed
      if (
        !isSameDay(newStartDate, startDate) ||
        !isSameDay(newEndDate, endDate)
      ) {
        onChange(newStartDate, newEndDate);
      }
    },
    [monthStart, onChange, startDate, endDate],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingStart && !isDraggingEnd) return;

      const newDay = calculateDayFromMouseEvent(e);

      if (isDraggingStart) {
        const clampedStart = Math.min(newDay, endDay);
        setStartDay(clampedStart);
        updateRange(clampedStart, endDay);
      } else if (isDraggingEnd) {
        const clampedEnd = Math.max(newDay, startDay);
        setEndDay(clampedEnd);
        updateRange(startDay, clampedEnd);
      }
    },
    [
      isDraggingStart,
      isDraggingEnd,
      calculateDayFromMouseEvent,
      endDay,
      startDay,
      updateRange,
    ],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDraggingStart && !isDraggingEnd) return;

      const newDay = calculateDayFromMouseEvent(e);

      if (isDraggingStart) {
        const clampedStart = Math.min(newDay, endDay);
        setStartDay(clampedStart);
        updateRange(clampedStart, endDay);
      } else if (isDraggingEnd) {
        const clampedEnd = Math.max(newDay, startDay);
        setEndDay(clampedEnd);
        updateRange(startDay, clampedEnd);
      }
    },
    [
      isDraggingStart,
      isDraggingEnd,
      calculateDayFromMouseEvent,
      endDay,
      startDay,
      updateRange,
    ],
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
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const startPercentage = ((startDay - 1) / (daysInMonth - 1)) * 100;
  const endPercentage = ((endDay - 1) / (daysInMonth - 1)) * 100;

  const rangeWidth = endPercentage - startPercentage;
  const rangeLeft = startPercentage;

  return (
    <div className="flex flex-col w-full py-6 px-2 relative z-20 overflow-visible">
      {/* Custom float animation style */}
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
        {/* Ticks */}
        <div className="absolute inset-0 flex justify-between px-0.5 pointer-events-none">
          {Array.from({ length: daysInMonth }).map((_, i) => (
            <div
              key={i}
              className={`w-px h-1 rounded-full ${i + 1 === startDay || i + 1 === endDay ? "opacity-0" : "opacity-20"}`}
              style={{
                backgroundColor: theme.text,
                height: (i + 1) % 5 === 0 ? "6px" : "3px",
                marginTop: (i + 1) % 5 === 0 ? "-2px" : "0px",
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
        ></div>

        {/* Start Thumb */}
        <div
          className={`absolute w-6 h-6 rounded-full shadow-lg flex items-center justify-center transform transition-all duration-150 z-30 ${
            activeThumb === "start" ? "scale-125" : "hover:scale-110"
          }`}
          style={{
            left: `calc(${startPercentage}% - 12px)`,
            backgroundColor: theme.primary,
            border: `2px solid ${theme.cardBackground}`,
          }}
        >
          <span className="text-[10px] font-bold text-white select-none">
            {startDay}
          </span>

          {/* Tooltip */}
          {(activeThumb === "start" || isDraggingStart) && (
            <div
              className="absolute top-[-38px] left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-white text-[10px] font-bold shadow-[0_5px_15px_rgba(0,0,0,0.3)] border border-white/20 z-[100] whitespace-nowrap animate-float-in"
              style={{ backgroundColor: theme.primary }}
            >
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-white/10"
                style={{ backgroundColor: theme.primary }}
              ></div>
              <span className="relative z-10 drop-shadow-sm">
                Dia {startDay}
              </span>
            </div>
          )}
        </div>

        {/* End Thumb */}
        <div
          className={`absolute w-6 h-6 rounded-full shadow-lg flex items-center justify-center transform transition-all duration-150 z-30 ${
            activeThumb === "end" ? "scale-125" : "hover:scale-110"
          }`}
          style={{
            left: `calc(${endPercentage}% - 12px)`,
            backgroundColor: theme.primary,
            border: `2px solid ${theme.cardBackground}`,
          }}
        >
          <span className="text-[10px] font-bold text-white select-none">
            {endDay}
          </span>

          {/* Tooltip */}
          {(activeThumb === "end" || isDraggingEnd) && (
            <div
              className="absolute top-[-38px] left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-white text-[10px] font-bold shadow-[0_5px_15px_rgba(0,0,0,0.3)] border border-white/20 z-[100] whitespace-nowrap animate-float-in"
              style={{ backgroundColor: theme.primary }}
            >
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-white/10"
                style={{ backgroundColor: theme.primary }}
              ></div>
              <span className="relative z-10 drop-shadow-sm">Dia {endDay}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyDateSlider;
