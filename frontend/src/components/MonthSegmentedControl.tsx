import React from 'react';
import { addMonths, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';

interface MonthSegmentedControlProps {
  month: Date;
  onChange: (newMonth: Date) => void;
}

const MonthSegmentedControl: React.FC<MonthSegmentedControlProps> = ({ month, onChange }) => {
  const { theme } = useTheme();

  const prevMonth = subMonths(month, 1);
  const nextMonth = addMonths(month, 1);

  const labelPrev = format(prevMonth, 'MMMM', { locale: ptBR });
  const labelCurrent = format(month, 'MMMM yyyy', { locale: ptBR });
  const labelNext = format(nextMonth, 'MMMM', { locale: ptBR });

  return (
    <div
      className="w-full rounded-xl overflow-hidden border"
      style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBackground }}
      role="tablist"
      aria-label="Selecionar mês"
    >
      <div className="grid grid-cols-3 w-full">
        <button
          type="button"
          role="tab"
          aria-selected="false"
          onClick={() => onChange(prevMonth)}
          className="w-full text-center font-medium px-3"
          style={{
            minHeight: 44,
            paddingTop: 10,
            paddingBottom: 10,
            color: theme.text,
            borderRight: `1px solid ${theme.cardBorder}`,
            backgroundColor: theme.cardBackground,
          }}
        >
          {labelPrev.charAt(0).toUpperCase() + labelPrev.slice(1)}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected="true"
          onClick={() => onChange(month)}
          className="w-full text-center font-bold px-3"
          style={{
            minHeight: 44,
            paddingTop: 10,
            paddingBottom: 10,
            backgroundColor: theme.primary + '20',
            color: theme.text,
            borderRight: `1px solid ${theme.cardBorder}`,
            borderLeft: `1px solid ${theme.cardBorder}`,
          }}
        >
          {labelCurrent.charAt(0).toUpperCase() + labelCurrent.slice(1)}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected="false"
          onClick={() => onChange(nextMonth)}
          className="w-full text-center font-medium px-3"
          style={{
            minHeight: 44,
            paddingTop: 10,
            paddingBottom: 10,
            color: theme.text,
            backgroundColor: theme.cardBackground,
          }}
        >
          {labelNext.charAt(0).toUpperCase() + labelNext.slice(1)}
        </button>
      </div>
    </div>
  );
};

export default MonthSegmentedControl;
