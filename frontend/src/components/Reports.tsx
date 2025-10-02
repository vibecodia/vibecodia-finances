import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, TooltipItem } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Transaction, SavingsGoal } from '../types';
import { getMonthlyData, getCategoryData, formatCurrency, getCurrentBrazilDate } from '../utils/helpers';
import { BarChart3, PieChart, TrendingUp, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

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
          <BarChart3 className="w-8 h-8 text-text opacity-70" />
        </div>
        <p className="text-text opacity-90 mb-2">Nenhum dado para exibir</p>
        <p className="text-sm text-text opacity-70">
          Adicione algumas transações para ver os relatórios
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-text mb-2">
          Relatórios Financeiros
        </h1>
        <div className="flex items-center justify-center gap-2 text-text opacity-90">
          <button onClick={() => setCurrentMonth(prevMonth => subMonths(prevMonth, 1))} className="p-1 rounded-full hover:bg-cardBorder">
            <ChevronLeft className="w-5 h-5 text-text" />
          </button>
          <p className="text-text opacity-90">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
          <button onClick={() => setCurrentMonth(prevMonth => addMonths(prevMonth, 1))} className="p-1 rounded-full hover:bg-cardBorder">
            <ChevronRight className="w-5 h-5 text-text" />
          </button>
        </div>
      </div>

      {showAiMessagePopup && (
        <div className="fixed inset-0 bg-background bg-opacity-50 flex items-center justify-center z-50">
          <div className="p-6 rounded-lg shadow-xl max-w-sm w-full text-center relative" style={{ backgroundColor: theme.cardBackground }}>
            <h3 className="text-lg font-semibold text-text mb-4">Insight de IA</h3>
            <p className="text-text opacity-90 mb-6">{aiMessage}</p>
            <button
              onClick={() => setShowAiMessagePopup(false)}
              className={`${buttonColorClass} hover:opacity-80 text-white font-bold py-2 px-4 rounded-full transition-all duration-500 ease-in-out`}
            >
              Fechar ({countdown})
            </button>
          </div>
        </div>
      )}

      {/* Monthly Trends */}
      <div className="rounded-2xl border p-6 relative" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#E0E0E0' }}>
            <TrendingUp className="w-5 h-5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-text truncate">
              Evolução Mensal
            </h2>
            <p className="text-sm text-text opacity-90 truncate">
              das finanças nos últimos 6 meses
            </p>
          </div>
        </div>
        <div className="h-64">
          <Bar data={barChartData} options={barChartOptions} />
        </div>

        

        
      </div>
      {/* Category Distribution */}
      {categoryData.length > 0 && (
        <div className="rounded-2xl border p-6" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#E0E0E0' }}>
              <PieChart className="w-5 h-5 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-text truncate">
                Gastos por Categoria
              </h2>
              <p className="text-sm text-text opacity-90 truncate">
                Distribuição das suas despesas pagas
              </p>
            </div>
          </div>
          <div className="h-64 mb-6 relative">
            <div className={`absolute inset-0 flex items-center justify-center ${loadingAi ? 'animate-spin-slow' : ''}`}>
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
            <button
              onClick={generateAiMessage}
              className="absolute top-4 right-4 text-white p-1 rounded-full shadow-lg flex items-center justify-center z-50 transition-all duration-300 ease-in-out transform hover:scale-110 animate-pulse" style={{ backgroundColor: theme.primary }}
              aria-label="Gerar insights de IA"
              disabled={loadingAi}
            >
              <Brain className="w-6 h-6" />
            </button>
            {loadingAi && (
              <div className="absolute inset-0 bg-background bg-opacity-50 flex items-center justify-center rounded-2xl z-40">
                <p className="text-white text-lg font-semibold">Gerando Relatório IA...</p>
              </div>
            )}
          </div>
          
          {/* Category Details */}
          <div className="space-y-3">
            {categoryData.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg gap-3" style={{ backgroundColor: theme.cardBorder }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="font-medium text-text truncate">
                    {category.category}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-text">
                    {formatCurrency(category.amount)}
                  </p>
                  <p className="text-sm text-text opacity-90">
                    {category.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {monthlyData.slice(-3).map((month, index) => (
          <div key={index} className="rounded-xl border p-4" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            <h3 className="font-semibold text-text mb-3 truncate">
              {month.month}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text opacity-90 truncate pr-2">Receitas</span>
                <span className="font-medium text-primary flex-shrink-0">
                  {formatCurrency(month.income)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text opacity-90 truncate pr-2">Despesas</span>
                <span className="font-medium text-accent flex-shrink-0">
                  {formatCurrency(month.expenses)}
                </span>
              </div>
              {month.goalsImpact && month.goalsImpact > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text opacity-90 truncate pr-2">Metas</span>
                  <span className="font-medium text-primary flex-shrink-0">
                    {formatCurrency(month.goalsImpact)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t" style={{ borderColor: theme.cardBorder }}>
                <span className="font-medium text-text truncate pr-2">Saldo</span>
                <span className={`font-semibold flex-shrink-0 ${month.balance >= 0 ? 'text-primary' : 'text-accent'}`}>
                  {formatCurrency(month.balance)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;