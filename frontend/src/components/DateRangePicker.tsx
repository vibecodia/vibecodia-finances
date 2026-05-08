import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isWithinInterval, 
  isToday,
  startOfDay,
  subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  theme: {
    cardBackground: string;
    cardBorder: string;
    text: string;
    primary: string;
  };
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  startDate, 
  endDate, 
  onChange, 
  theme 
}) => {
  // Inicializa com a data de início (com ajuste de meio-dia para evitar problemas de fuso horário)
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (startDate) {
      const [year, month] = startDate.split('-').map(Number);
      return new Date(year, month - 1, 1, 12, 0, 0);
    }
    return startOfMonth(new Date());
  });
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectingStart, setSelectingStart] = useState<string | null>(null);

  const start = startDate ? startOfDay(new Date(startDate + 'T12:00:00')) : null;
  const end = endDate ? startOfDay(new Date(endDate + 'T12:00:00')) : null;

  const nextMonth = addMonths(currentMonth, 1);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    if (!selectingStart) {
      // Primeiro clique: inicia a seleção
      setSelectingStart(dateStr);
      onChange(dateStr, dateStr);
    } else {
      // Segundo clique: completa o intervalo
      if (dateStr < selectingStart) {
        onChange(dateStr, selectingStart);
      } else {
        onChange(selectingStart, dateStr);
      }
      setSelectingStart(null);
    }
  };

  const renderMonth = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    });

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
      <div className="flex-1 min-w-[280px]">
        <div className="text-center font-bold text-sm mb-4 capitalize">
          {format(monthDate, 'MMMM yyyy', { locale: ptBR })}
        </div>
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[10px] uppercase opacity-40 font-bold">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day) => {
            const isSelectedStart = start && isSameDay(day, start);
            const isSelectedEnd = end && isSameDay(day, end);
            const isInRange = start && end && isWithinInterval(day, { start, end });
            const isCurrentMonth = isSameMonth(day, monthStart);
            
            // Lógica de Hover para preview do range
            let isHoverInRange = false;
            if (selectingStart && hoverDate) {
              const sStart = startOfDay(new Date(selectingStart + 'T12:00:00'));
              const hRangeStart = hoverDate < sStart ? hoverDate : sStart;
              const hRangeEnd = hoverDate < sStart ? sStart : hoverDate;
              
              if (isWithinInterval(day, { start: hRangeStart, end: hRangeEnd })) {
                isHoverInRange = true;
              }
            }

            return (
              <div 
                key={day.toString()}
                className={`relative py-2 flex items-center justify-center cursor-pointer transition-all
                  ${!isCurrentMonth ? 'invisible' : ''}
                  ${isInRange && !isSelectedStart && !isSelectedEnd ? 'bg-opacity-10' : ''}
                  ${isHoverInRange && !isSelectedStart && !isSelectedEnd ? 'bg-opacity-5' : ''}
                `}
                style={{
                  backgroundColor: isInRange && !isSelectedStart && !isSelectedEnd ? theme.primary + '22' : 
                                  isHoverInRange ? theme.primary + '11' : 'transparent'
                }}
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => setHoverDate(day)}
                onMouseLeave={() => setHoverDate(null)}
              >
                <div 
                  className={`w-8 h-8 flex items-center justify-center text-xs rounded-full z-10
                    ${(isSelectedStart || isSelectedEnd) ? 'text-white font-bold' : ''}
                  `}
                  style={{
                    backgroundColor: (isSelectedStart || isSelectedEnd) ? theme.primary : 'transparent',
                    opacity: isCurrentMonth ? 1 : 0.2
                  }}
                >
                  {format(day, 'd')}
                </div>
                {isToday(day) && (
                  <div 
                    className="absolute bottom-1 w-1 h-1 rounded-full left-1/2 -translate-x-1/2"
                    style={{ backgroundColor: (isSelectedStart || isSelectedEnd) ? '#fff' : theme.primary }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const quickSelect = (type: 'thisMonth' | 'nextMonth' | 'last7' | 'last30') => {
    const today = new Date();
    let s = today;
    let e = today;

    switch(type) {
      case 'thisMonth':
        s = startOfMonth(today);
        e = endOfMonth(today);
        setCurrentMonth(startOfMonth(today));
        break;
      case 'nextMonth': {
        const next = addMonths(today, 1);
        s = startOfMonth(next);
        e = endOfMonth(next);
        setCurrentMonth(startOfMonth(next));
        break;
      }
      case 'last7':
        s = subDays(today, 6);
        e = today;
        break;
      case 'last30':
        s = subDays(today, 29);
        e = today;
        break;
    }
    onChange(format(s, 'yyyy-MM-dd'), format(e, 'yyyy-MM-dd'));
  };

  const isActive = (type: string) => {
    const today = new Date();
    let s = '';
    let e = '';
    switch(type) {
      case 'thisMonth':
        s = format(startOfMonth(today), 'yyyy-MM-dd');
        e = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      case 'nextMonth': {
        const next = addMonths(today, 1);
        s = format(startOfMonth(next), 'yyyy-MM-dd');
        e = format(endOfMonth(next), 'yyyy-MM-dd');
        break;
      }
      case 'last7':
        s = format(subDays(today, 6), 'yyyy-MM-dd');
        e = format(today, 'yyyy-MM-dd');
        break;
      case 'last30':
        s = format(subDays(today, 29), 'yyyy-MM-dd');
        e = format(today, 'yyyy-MM-dd');
        break;
    }
    return startDate === s && endDate === e;
  };

  return (
    <div className="space-y-4 select-none">
      <div 
        className="rounded-xl border p-4 shadow-sm relative"
        style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}
      >
        <div className="flex items-center justify-between mb-4 absolute top-4 left-4 right-4 z-20 pointer-events-none">
          <button 
            onClick={handlePrevMonth}
            className="p-1 hover:bg-black/5 rounded-full pointer-events-auto transition-colors"
          >
            <ChevronLeft className="w-5 h-5 opacity-60" />
          </button>
          <button 
            onClick={handleNextMonth}
            className="p-1 hover:bg-black/5 rounded-full pointer-events-auto transition-colors"
          >
            <ChevronRight className="w-5 h-5 opacity-60" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8 pt-2">
          {renderMonth(currentMonth)}
          <div className="hidden md:block w-px bg-muted opacity-20" />
          <div className="hidden md:block">
            {renderMonth(nextMonth)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Este mês', value: 'thisMonth' },
          { label: 'Próximo mês', value: 'nextMonth' },
          { label: 'Últimos 7 dias', value: 'last7' },
          { label: 'Últimos 30 dias', value: 'last30' }
        ].map(pill => (
          <button
            key={pill.value}
            onClick={() => quickSelect(pill.value as any)}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border"
            style={{
              backgroundColor: isActive(pill.value) ? theme.primary : 'transparent',
              color: isActive(pill.value) ? '#fff' : theme.text,
              borderColor: isActive(pill.value) ? theme.primary : theme.cardBorder,
              opacity: isActive(pill.value) ? 1 : 0.7
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DateRangePicker;
