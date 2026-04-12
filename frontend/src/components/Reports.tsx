import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, TooltipItem, Filler } from 'chart.js';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, PieChart, TrendingUp, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';

import { useTheme } from '../contexts/ThemeContext';
import { Transaction, SavingsGoal } from '../types';
import { getMonthlyData, getCategoryData, formatCurrency, getCurrentBrazilDate } from '../utils/helpers';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, Filler);

interface ReportsProps {
  transactions: Transaction[];
  savingsGoals?: SavingsGoal[];
}

const Reports: React.FC<ReportsProps> = ({ transactions, savingsGoals = [] }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(getCurrentBrazilDate());
  const { theme } = useTheme();

  const monthlyData = getMonthlyData(transactions, savingsGoals, 6, currentMonth);
  const categoryData = getCategoryData(transactions, currentMonth);

  const barChartData = {
    labels: monthlyData.map(data => data.month),
    datasets: [
      {
        label: 'Receitas',
        data: monthlyData.map(data => data.income),
        backgroundColor: '#4CAF50',
      },
      {
        label: 'Despesas',
        data: monthlyData.map(data => data.expenses),
        backgroundColor: '#FF5722',
      },
      {
        label: 'Metas',
        data: monthlyData.map(data => data.goalsImpact || 0),
        backgroundColor: '#673AB7',
      },
      {
        label: 'Despesas Não Pagas',
        data: monthlyData.map(data => data.unpaidExpenses || 0),
        backgroundColor: '#FFC107', // A distinct color for unpaid expenses
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: theme.text,
        },
      },
      title: {
        display: false,
        text: 'Evolução Mensal',
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<"bar">) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
          }
        },
        titleColor: theme.text,
        bodyColor: theme.text,
        backgroundColor: theme.cardBackground,
        borderColor: theme.cardBorder,
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: string | number) {
            return formatCurrency(value as number);
          },
          color: theme.text,
        },
        grid: {
          color: theme.cardBorder,
        },
      },
      x: {
        ticks: {
          color: theme.text,
        },
        grid: {
          color: theme.cardBorder,
        },
      },
    }
  };

  const doughnutData = {
    labels: categoryData.map(data => data.category),
    datasets: [
      {
        data: categoryData.map(data => data.amount),
        backgroundColor: categoryData.map(data => data.color),
        borderColor: theme.cardBackground,
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: theme.text,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<"doughnut">) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = categoryData.find(c => c.category === label)?.percentage || 0;
            return `${label}: ${formatCurrency(value as number)} (${percentage.toFixed(1)}%)`;
          }
        },
        titleColor: theme.text,
        bodyColor: theme.text,
        backgroundColor: theme.cardBackground,
        borderColor: theme.cardBorder,
        borderWidth: 1,
      }
    },
  };

  const [showAiMessagePopup, setShowAiMessagePopup] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [buttonColorClass, setButtonColorClass] = useState('bg-blue-500');

  const generateAiMessage = () => {
    if (categoryData.length === 0) {
      setAiMessage('Adicione transações para uma análise de IA.');
      setShowAiMessagePopup(true);
      return;
    }

    setLoadingAi(true);
    // Simulate AI processing time
    setTimeout(() => {
      const predominantCategory = categoryData.reduce((prev, current) => (
        (prev.percentage > current.percentage) ? prev : current
      ));

      let message = '';
      if (predominantCategory.category === 'Dívidas' && predominantCategory.percentage > 50) {
        message = 'Cuidado, suas dívidas estão altas! Priorize o pagamento.';
      } else if (predominantCategory.category === 'Alimentação' && predominantCategory.percentage > 40) {
        message = 'Seus gastos com alimentação estão elevados. Que tal cozinhar mais?';
      } else if (predominantCategory.category === 'Transporte' && predominantCategory.percentage > 30) {
        message = 'Gastos com transporte significativos. Considere alternativas.';
      } else if (predominantCategory.category === 'Lazer' && predominantCategory.percentage > 20) {
        message = 'Aproveite o lazer, mas com moderação para suas finanças.';
      } else {
        message = `Sua maior despesa é em ${predominantCategory.category}. Fique de olho!`;
      }
      setAiMessage(message);
      setLoadingAi(false);
      setShowAiMessagePopup(true);
    }, 3500); // 2 second delay
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showAiMessagePopup) {
      setCountdown(10);
      setButtonColorClass('bg-blue-500'); // Reset color when popup opens
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setShowAiMessagePopup(false);
            return 0;
          }
          // Update button color based on countdown
          if (prev === 5) setButtonColorClass('bg-primary');
          else if (prev === 4) setButtonColorClass('bg-primary');
          else if (prev === 3) setButtonColorClass('bg-accent');
          else if (prev === 2) setButtonColorClass('bg-accent');
          else if (prev === 1) setButtonColorClass('bg-primary');
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showAiMessagePopup]);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.cardBorder }}>
          <BarChart3 className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground mb-2">Nenhum dado para exibir</p>
        <p className="text-sm text-muted-foreground">
          Adicione algumas transações para ver os relatórios
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Relatórios Financeiros
        </h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Button
            onClick={() => setCurrentMonth(prevMonth => subMonths(prevMonth, 1))}
            variant="ghost"
            size="sm"
            className="p-1 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <p className="text-foreground font-semibold min-w-[120px]">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
          <Button
            onClick={() => setCurrentMonth(prevMonth => addMonths(prevMonth, 1))}
            variant="ghost"
            size="sm"
            className="p-1 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {showAiMessagePopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="p-8 shadow-2xl max-w-sm w-full text-center relative border-primary animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight mb-4">Insight de IA</h3>
            <p className="text-muted-foreground mb-8 font-medium">{aiMessage}</p>
            <Button
              onClick={() => setShowAiMessagePopup(false)}
              className={cn(
                "w-full transition-all duration-500 ease-in-out font-black uppercase tracking-widest",
                buttonColorClass === 'bg-blue-500' ? 'bg-blue-500 hover:bg-blue-600' : ''
              )}
            >
              Fechar ({countdown})
            </Button>
          </Card>
        </div>
      )}

      {/* Monthly Trends */}
      <Card className="p-6 relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-foreground uppercase tracking-wider">
              Evolução Mensal
            </h2>
            <p className="text-xs text-muted-foreground font-bold uppercase">
              Finanças nos últimos 6 meses
            </p>
          </div>
        </div>
        <div className="h-64">
          <Bar data={barChartData} options={barChartOptions} />
        </div>
      </Card>
      {/* Category Distribution */}
      {categoryData.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
              <PieChart className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-foreground uppercase tracking-wider">
                Gastos por Categoria
              </h2>
              <p className="text-xs text-muted-foreground font-bold uppercase">
                Distribuição das suas despesas pagas
              </p>
            </div>
          </div>
          <div className="h-64 mb-6 relative">
            <div className={cn("absolute inset-0 flex items-center justify-center", loadingAi && "animate-spin-slow")}>
              <Doughnut
                data={doughnutData}
                options={{
                  ...doughnutOptions,
                  plugins: {
                    ...doughnutOptions.plugins,
                    legend: {
                      ...doughnutOptions.plugins.legend,
                      display: !loadingAi,
                    },
                  },
                }}
              />
            </div>
            <Button
              onClick={generateAiMessage}
              variant="primary"
              size="icon"
              className="absolute top-4 right-4 animate-pulse"
              disabled={loadingAi}
              title="Gerar insights de IA"
            >
              <Brain className="w-6 h-6" />
            </Button>
            {loadingAi && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-2xl z-40">
                <p className="text-foreground text-lg font-black uppercase tracking-tighter animate-pulse">Gerando Relatório IA...</p>
              </div>
            )}
          </div>
          
          {/* Category Details */}
          <div className="space-y-3">
            {categoryData.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-xl gap-3 border border-border bg-card/50 hover:bg-card transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="font-bold text-foreground uppercase text-xs tracking-tight truncate">
                    {category.category}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-foreground">
                    {formatCurrency(category.amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-bold">
                    {category.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {monthlyData.slice(-3).map((month, index) => (
          <Card key={index} className="p-4">
            <h3 className="font-black text-foreground uppercase tracking-widest text-xs mb-3 truncate">
              {month.month}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-bold uppercase truncate pr-2">Receitas</span>
                <span className="font-black text-primary flex-shrink-0">
                  {formatCurrency(month.income)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-bold uppercase truncate pr-2">Despesas</span>
                <span className="font-black text-accent flex-shrink-0">
                  {formatCurrency(month.expenses)}
                </span>
              </div>
              {month.goalsImpact && month.goalsImpact > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-bold uppercase truncate pr-2">Metas</span>
                  <span className="font-black text-primary flex-shrink-0">
                    {formatCurrency(month.goalsImpact)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="font-black text-foreground uppercase tracking-tighter truncate pr-2">Saldo</span>
                <span className={cn("font-black flex-shrink-0", month.balance >= 0 ? 'text-primary' : 'text-accent')}>
                  {formatCurrency(month.balance)}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Reports;