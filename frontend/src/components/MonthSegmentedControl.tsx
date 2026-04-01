import React from 'react';
import { addMonths, subMonths, format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';

interface MonthSegmentedControlProps {
  month: Date;
  onChange: (newMonth: Date) => void;
}

const MonthSegmentedControl: React.FC<MonthSegmentedControlProps> = ({ month, onChange }) => {
  const { theme } = useTheme();
  const currentDate = new Date();

  const prevMonth = subMonths(month, 1);
  const nextMonth = addMonths(month, 1);

  const labelPrev = format(prevMonth, 'MMMM', { locale: ptBR });
  const labelCurrent = format(month, 'MMMM yyyy', { locale: ptBR });
  const labelNext = format(nextMonth, 'MMMM', { locale: ptBR });

  const isCurrentMonth = isSameMonth(month, currentDate);

  const goToCurrentMonth = () => {
    onChange(currentDate);
  };

  return (
    <div className="relative w-full">
      <div
        className="w-full rounded-xl overflow-hidden border select-none"
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

      {/* Floating button centralizado abaixo */}
      {!isCurrentMonth && (
        <div className="flex justify-center mt-[-12px]">
          <button
            onClick={goToCurrentMonth}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: theme.primary,
              color: '#fff',
              border: `2px solid ${theme.cardBackground}`,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
            aria-label="Voltar ao mês atual"
          >
            📆
          </button>
        </div>
      )}
    </div>
  );
};

export default MonthSegmentedControl;