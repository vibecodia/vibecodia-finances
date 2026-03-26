import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/helpers';

interface RecentTransactionsFloatingCardProps {
  transactions: Transaction[];
}

const RecentTransactionsFloatingCard: React.FC<RecentTransactionsFloatingCardProps> = ({ transactions }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timerProgress, setTimerProgress] = useState(100);
  const { theme } = useTheme();

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  useEffect(() => {
    if (recentTransactions.length === 0) return;

    const showTimeout = setTimeout(() => {
      setIsVisible(true);
      setTimerProgress(0);
    }, 1000);
    
    const hideTimeout = setTimeout(() => setIsVisible(false), 16000);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
    };
  }, [recentTransactions.length]);

  if (recentTransactions.length === 0) return null;

  return (
    <div 
      className={`fixed bottom-8 right-8 z-[100] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div 
        className="w-80 rounded-[2rem] p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border backdrop-blur-2xl relative overflow-hidden group"
        style={{ 
          backgroundColor: `${theme.cardBackground}cc`, 
          borderColor: `${theme.cardBorder}44`
        }}
      >
        {/* Abstract Background Glows */}
        <div 
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[60px] opacity-30 pointer-events-none transition-colors duration-1000"
          style={{ backgroundColor: theme.primary }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 border border-primary/20">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-text/90">Recentes</p>
            </div>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="p-1.5 hover:bg-text/5 rounded-full transition-all active:scale-90"
          >
            <X className="w-4 h-4 text-text/40 hover:text-text" />
          </button>
        </div>

        {/* Transactions List */}
        <div className="space-y-5 relative">
          {/* Vertical Line Connector */}
          <div className="absolute left-[15px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />

          {recentTransactions.map((t) => (
            <div 
              key={t.id || t._id} 
              className="relative flex items-start gap-4 group/item"
            >
              {/* Status Indicator Dot */}
              <div className={`mt-1.5 w-2 h-2 rounded-full z-10 ring-4 ${
                t.type === 'income' 
                  ? 'bg-emerald-500 ring-emerald-500/10' 
                  : 'bg-rose-500 ring-rose-500/10'
              }`} />
              
              <div className="flex-1 min-w-0 transition-transform group-hover/item:translate-x-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-sm font-medium text-text/90 truncate leading-tight">
                    {t.description}
                  </p>
                  <div className={`flex items-center gap-0.5 font-bold text-sm ${
                    t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {t.type === 'income' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                    {formatCurrency(t.amount)}
                  </div>
                </div>
                
                <span className="text-[10px] text-text/40 font-medium tabular-nums uppercase">
                  {format(new Date(t.createdAt), "HH:mm '•' dd MMM", { locale: ptBR })}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Progress Timer Bar */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-text/5">
          <div 
            className="h-full bg-primary/40 transition-all duration-[15000ms] ease-linear"
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default RecentTransactionsFloatingCard;
