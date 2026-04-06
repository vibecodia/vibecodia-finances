import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  LineController,
  BarController,
  DoughnutController,
  PieController,
  Filler,
} from 'chart.js';
import {
  format,
  parseISO,
  isSameMonth,
  addMonths,
  startOfMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Maximize2,
  TrendingDown,
  TrendingUp,
  Calculator,
  RefreshCw,
  PieChart as PieChartIcon,
  Table as TableIcon,
  Home,
  Info,
  LineChart,
  CheckCircle2,
  Clock
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { Bar, Line, Chart } from 'react-chartjs-2';

import { ColorPalette } from '../contexts/ThemeContext';
import { useLocalStorage } from '../hooks/trello/useLocalStorage';
import { Transaction } from '../types';
import { formatCurrency, formatBrazilDate } from '../utils/helpers';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  LineController,
  BarController,
  DoughnutController,
  PieController,
  Filler
);

interface ParsedFinancingTransaction {
  parcelaPaga: number;
  totalParcelas: number;
  amount: number;
  date: string;
  id: string;
  isPaid: boolean;
  description: string | undefined;
}

interface AmortizationResult {
  economy: number;
  newTotalParcelas?: number;
  parcelasEliminadas?: number;
  newNextParcela?: number;
  reduction?: number;
}

interface FinanciamentoCasaPlaygroundProps {
  transactions: Transaction[];
  theme: ColorPalette;
}

interface LayoutItem {
  id: string;
  label: string;
  collapsed: boolean;
  number: number;
}

const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: 'header_summary', label: 'Resumo do Financiamento', collapsed: false, number: 1 },
  { id: 'payment_history_line', label: 'Evolução das Parcelas', collapsed: false, number: 2 },
  { id: 'installments_table', label: 'Tabela de Parcelas', collapsed: false, number: 3 },
  { id: 'consorcio_porto_cross', label: 'Cruzamento com Consórcio Porto', collapsed: false, number: 4 },
  { id: 'payment_calendar', label: 'Calendário de Quitação', collapsed: true, number: 5 },
  { id: 'interest_vs_principal', label: 'Juros vs Principal (Simulação SAC)', collapsed: true, number: 6 },
  { id: 'amortization_simulator', label: 'Simulador de Amortização', collapsed: true, number: 7 },
  { id: 'payoff_projection', label: 'Projeção de Quitação', collapsed: true, number: 8 },
  { id: 'monthly_comparison', label: 'Comparativo Mês a Mês', collapsed: true, number: 9 },
];

const FinanciamentoCasaPlayground: React.FC<FinanciamentoCasaPlaygroundProps> = ({ transactions, theme }) => {
  const [layout, setLayout] = useLocalStorage<LayoutItem[]>('financiamento_playground_layout_v2', DEFAULT_LAYOUT);
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  
  // Manual inputs for simulation
  const [overrideTotalParcelas, setOverrideTotalParcelas] = useState<number | null>(null);
  const [taxaJurosMensal, setTaxaJurosMensal] = useState<number>(0.8); // 0.8% a.m. (approx 10% a.a.)
  const [valorOriginal, setValorOriginal] = useState<number>(300000);
  const [amortizacaoExtra, setAmortizacaoExtra] = useState<number>(0);
  const [amortizationMode, setAmortizationMode] = useState<'prazo' | 'parcela'>('prazo');

  // Consórcio Porto state with persistence
  const [totalParcelasConsorcioManual, setTotalParcelasConsorcioManual] = useLocalStorage<number | null>('financiamento_consorcio_total_parcelas_v1', null);
  const [creditoConsorcio, setCreditoConsorcio] = useLocalStorage<number>('financiamento_consorcio_credito_v1', 200000);
  const [mesesAteContemplacao, setMesesAteContemplacao] = useLocalStorage<number>('financiamento_consorcio_meses_contemplacao_v1', 24);
  const [mesesCarencia, setMesesCarencia] = useLocalStorage<number>('financiamento_consorcio_meses_carencia_v1', 6);
  
  // Manual history inputs (before app)
  const [totalPagoConsorcioAnterior, setTotalPagoConsorcioAnterior] = useLocalStorage<number>('financiamento_consorcio_anterior_v1', 0);
  const [parcelasAnterioresConsorcio, setParcelasAnterioresConsorcio] = useLocalStorage<number>('financiamento_consorcio_parcelas_anteriores_v1', 0);

  // Parse transactions
  const parsedData = useMemo(() => {
    return transactions
      .filter((t: Transaction) => 
        t.type === 'expense' && 
        t.status !== 'deleted' && 
        t.category?.toLowerCase() === 'moradia' &&
        /Financiamento casa \d+\/\d+/i.test(t.description || '')
      )
      .map((t: Transaction): ParsedFinancingTransaction => {
        const match = (t.description || '').match(/Financiamento casa (\d+)\/(\d+)/i);
        return {
          parcelaPaga: parseInt(match![1]),
          totalParcelas: parseInt(match![2]),
          amount: t.amount,
          date: t.date,
          id: t.id,
          isPaid: t.isPaid,
          description: t.description
        };
      })
      .sort((a, b) => a.parcelaPaga - b.parcelaPaga);
  }, [transactions]);

  // Consórcio Porto data parsing
  const consorcioData = useMemo(() => {
    const matched = transactions.filter(t => 
      t.status !== 'deleted' && 
      t.description?.toLowerCase().includes('consórcio porto') &&
      t.category?.toLowerCase() === 'outro'
    );
    
    const totalPagoConsorcio = matched.reduce((sum, t) => sum + t.amount, 0);
    const parcelasConsorcio = matched.length;
    
    const dates = matched.map(t => new Date(t.date).getTime()).sort((a, b) => a - b);
    const primeiraParcelaConsorcio = dates.length > 0 ? new Date(dates[0]).toISOString() : null;
    const ultimaParcelaConsorcio = dates.length > 0 ? new Date(dates[dates.length - 1]).toISOString() : null;

    // Real combined metrics
    const totalPagoConsorcioReal = totalPagoConsorcioAnterior + totalPagoConsorcio;
    const parcelasConsorcioReal = parcelasAnterioresConsorcio + parcelasConsorcio;
    const mediaParcelaConsorcioReal = parcelasConsorcioReal > 0 ? totalPagoConsorcioReal / parcelasConsorcioReal : 0;

    return {
      totalPagoConsorcio,
      parcelasConsorcio,
      totalPagoConsorcioReal,
      parcelasConsorcioReal,
      mediaParcelaConsorcio: mediaParcelaConsorcioReal,
      primeiraParcelaConsorcio,
      ultimaParcelaConsorcio
    };
  }, [transactions, totalPagoConsorcioAnterior, parcelasAnterioresConsorcio]);

  if (parsedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center gap-4" style={{ color: theme.text }}>
        <Home className="w-20 h-20 opacity-10" />
        <div className="max-w-md">
          <p className="text-xl font-bold">Nenhuma transação encontrada</p>
          <p className="opacity-60 text-sm mt-2">
            Não encontramos transações com o padrão "Financiamento casa X/Y" na categoria "Moradia".
          </p>
        </div>
      </div>
    );
  }

  // Derived stats
  const detectedTotalParcelas = Math.max(...parsedData.map((d) => d.totalParcelas), 0);
  const totalParcelas = overrideTotalParcelas || detectedTotalParcelas;
  const parcelasPagasCount = new Set(parsedData.map((d) => d.parcelaPaga)).size;
  const lastParcelaPaga = Math.max(...parsedData.map((d) => d.parcelaPaga), 0);
  const parcelasFaltantes = Math.max(totalParcelas - lastParcelaPaga, 0);
  const totalPago = parsedData.reduce((sum: number, d) => sum + d.amount, 0);
  const mediaMensal = parcelasPagasCount > 0 ? totalPago / parcelasPagasCount : 0;
  const valorEstimadoRestante = mediaMensal * parcelasFaltantes;
  const progressPercent = totalParcelas > 0 ? (lastParcelaPaga / totalParcelas) * 100 : 0;

  // Consórcio cross-calculations
  const totalParcelasConsorcio = totalParcelasConsorcioManual || Math.max(consorcioData.parcelasConsorcioReal, 1);
  const consorcioFundingProgress = creditoConsorcio > 0 ? (consorcioData.totalPagoConsorcioReal / creditoConsorcio) * 100 : 0;

  const consorcioCrossResults = useMemo(() => {
    const totalMeses = lastParcelaPaga + mesesAteContemplacao + mesesCarencia;
    const amortizacaoMensal = valorOriginal / totalParcelas;
    
    // Saldo devedor SAC no momento do uso (após contemplação + carência)
    const saldoNoMomentoUso = Math.max(valorOriginal - (amortizacaoMensal * totalMeses), 0);
    const cobertura = saldoNoMomentoUso > 0 ? (creditoConsorcio / saldoNoMomentoUso) * 100 : 0;
    const diferencaRestante = saldoNoMomentoUso - creditoConsorcio;

    // Economia de juros: juros evitados do ponto de quitação em diante
    // Estimamos somando os juros das parcelas que seriam pagas do totalMeses até o fim
    let economyJurosEstimada = 0;
    const taxa = taxaJurosMensal / 100;
    let currentSaldo = saldoNoMomentoUso;
    
    for (let i = totalMeses + 1; i <= totalParcelas; i++) {
      economyJurosEstimada += currentSaldo * taxa;
      currentSaldo -= amortizacaoMensal;
      if (currentSaldo <= 0) break;
    }

    return {
      saldoNoMomentoUso,
      cobertura,
      diferencaRestante,
      economyJurosEstimada
    };
  }, [valorOriginal, totalParcelas, lastParcelaPaga, mesesAteContemplacao, mesesCarencia, creditoConsorcio, taxaJurosMensal]);

  const firstDate = parsedData.length > 0 ? parsedData[0].date : '';
  const lastDate = parsedData.length > 0 ? parsedData[parsedData.length - 1].date : '';

  // Layout helpers
  const toggleCollapse = (id: string) => {
    setLayout(prev => prev.map(item => item.id === id ? { ...item, collapsed: !item.collapsed } : item));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newLayout = [...layout];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newLayout.length) {
      [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
      setLayout(newLayout.map((item, idx) => ({ ...item, number: idx + 1 })));
    }
  };

  const renderCardHeader = (id: string, label: string, icon: React.ReactNode, index: number, isCollapsed: boolean) => (
    <div className="p-4 border-b font-semibold text-text flex items-center justify-between group" style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBorder + '33' }}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm lg:text-base">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <button 
          onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }}
          disabled={index === 0}
          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-0 group-hover:opacity-100 disabled:opacity-0"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }}
          disabled={index === layout.length - 1}
          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-0 group-hover:opacity-100 disabled:opacity-0"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setMaximizedId(id)}
          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-50 hover:opacity-100"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => toggleCollapse(id)}
          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-50 hover:opacity-100"
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  // Chart data for Line Chart (Evolução das Parcelas)
  const lineChartData = {
    labels: parsedData.map((d) => format(parseISO(d.date), 'MMM/yy', { locale: ptBR })),
    datasets: [
      {
        label: 'Parcela Mensal',
        data: parsedData.map((d) => d.amount),
        borderColor: theme.primary,
        backgroundColor: theme.primary + '33',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  // SAC Calculation for Juros vs Principal
  const sacData = useMemo(() => {
    const amortizacaoMensal = valorOriginal / totalParcelas;
    const results = [];
    let saldoDevedor = valorOriginal;
    const taxa = taxaJurosMensal / 100;

    for (let i = 1; i <= totalParcelas; i++) {
      const juros = saldoDevedor * taxa;
      const totalParcela = amortizacaoMensal + juros;
      results.push({
        parcela: i,
        amortizacao: amortizacaoMensal,
        juros: juros,
        total: totalParcela,
        saldoDevedor: Math.max(saldoDevedor - amortizacaoMensal, 0)
      });
      saldoDevedor -= amortizacaoMensal;
    }
    return results;
  }, [valorOriginal, totalParcelas, taxaJurosMensal]);

  const sacChartData = {
    labels: sacData.slice(0, Math.max(lastParcelaPaga + 12, 24)).map(d => `P${d.parcela}`),
    datasets: [
      {
        label: 'Principal',
        data: sacData.slice(0, Math.max(lastParcelaPaga + 12, 24)).map(d => d.amortizacao),
        backgroundColor: theme.primary,
        stack: 'stack1',
      },
      {
        label: 'Juros',
        data: sacData.slice(0, Math.max(lastParcelaPaga + 12, 24)).map(d => d.juros),
        backgroundColor: theme.accent,
        stack: 'stack1',
      }
    ]
  };

  // Amortization Simulation
  const amortizationResult = useMemo((): AmortizationResult | null => {
    if (amortizacaoExtra <= 0) return null;
    
    const amortizacaoMensalOriginal = valorOriginal / totalParcelas;
    const taxa = taxaJurosMensal / 100;
    const saldoDevedorAtual = sacData[lastParcelaPaga - 1]?.saldoDevedor || valorOriginal;
    
    if (amortizationMode === 'prazo') {
      // Reducing term: Keep parcela amount (approx), but pay off faster
      // This is complex for SAC, but let's simplify: 
      // How many monthly amortizations does the extra payment cover?
      const parcelasEliminadas = Math.floor(amortizacaoExtra / amortizacaoMensalOriginal);
      const newTotalParcelas = totalParcelas - parcelasEliminadas;
      
      // Interest savings: sum of juros of the eliminated installments (last ones in SAC)
      const economy = sacData.slice(newTotalParcelas).reduce((sum, d) => sum + d.juros, 0);
      
      return {
        newTotalParcelas,
        parcelasEliminadas,
        economy
      };
    } else {
      // Reducing installment: Term stays same, but new principal is lower
      const newSaldoDevedor = saldoDevedorAtual - amortizacaoExtra;
      const remainingParcelas = totalParcelas - lastParcelaPaga;
      const newAmortizacaoMensal = newSaldoDevedor / remainingParcelas;
      const newNextParcela = newAmortizacaoMensal + (newSaldoDevedor * taxa);
      const oldNextParcela = sacData[lastParcelaPaga]?.total || 0;
      
      // Total savings is more complex, let's estimate
      const economy = (oldNextParcela - newNextParcela) * remainingParcelas;
      
      return {
        newNextParcela,
        reduction: oldNextParcela - newNextParcela,
        economy
      };
    }
  }, [amortizacaoExtra, amortizationMode, sacData, lastParcelaPaga, totalParcelas, valorOriginal, taxaJurosMensal]);

  // Payoff Projection
  const currentProjectionEndDate = useMemo(() => {
    if (parcelasFaltantes <= 0) return 'Quitado';
    return format(addMonths(parseISO(lastDate || new Date().toISOString()), parcelasFaltantes), 'MMMM/yyyy', { locale: ptBR });
  }, [parcelasFaltantes, lastDate]);

  const amortizedProjectionEndDate = useMemo(() => {
    if (!amortizationResult || amortizationMode !== 'prazo') return null;
    const newParcelasFaltantes = (amortizationResult.newTotalParcelas || 0) - lastParcelaPaga;
    if (newParcelasFaltantes <= 0) return 'Imediata';
    return format(addMonths(parseISO(lastDate || new Date().toISOString()), newParcelasFaltantes), 'MMMM/yyyy', { locale: ptBR });
  }, [amortizationResult, amortizationMode, lastParcelaPaga, lastDate]);

  // Calendar Grid Data
  const calendarMonths = useMemo(() => {
    if (parsedData.length === 0) return [];
    const months = [];
    const startDate = startOfMonth(parseISO(firstDate));
    const totalMonthsToShow = totalParcelas;
    
    for (let i = 0; i < totalMonthsToShow; i++) {
      const currentMonth = addMonths(startDate, i);
      const parcelaNum = i + 1;
      const paidInfo = parsedData.find(d => d.parcelaPaga === parcelaNum);
      const isCurrent = isSameMonth(currentMonth, new Date());
      
      months.push({
        date: currentMonth,
        label: format(currentMonth, 'MMM/yy', { locale: ptBR }),
        parcela: parcelaNum,
        isPaid: !!paidInfo,
        isCurrent
      });
    }
    return months;
  }, [firstDate, totalParcelas, parsedData]);

  const renderSection = (item: LayoutItem, index: number) => {
    const isCollapsed = item.collapsed;
    
    switch (item.id) {
      case 'header_summary':
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <Home className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase opacity-60">
                    <span>Progresso de Quitação</span>
                    <span>{lastParcelaPaga} / {totalParcelas} ({progressPercent.toFixed(1)}%)</span>
                  </div>
                  <div className="h-4 w-full bg-cardBorder/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Parcelas Pagas', value: lastParcelaPaga, icon: <CheckCircle2 className="w-4 h-4" /> },
                    { label: 'Parcelas Faltantes', value: parcelasFaltantes, icon: <Clock className="w-4 h-4" /> },
                    { label: 'Total Pago', value: formatCurrency(totalPago), icon: <TrendingUp className="w-4 h-4" />, highlight: true },
                    { label: 'Est. Restante', value: formatCurrency(valorEstimadoRestante), icon: <TrendingDown className="w-4 h-4" /> }
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-xl border flex flex-col gap-1" style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBorder + '11' }}>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase opacity-50">
                        {stat.icon}
                        {stat.label}
                      </div>
                      <div className={`text-sm md:text-base font-black ${stat.highlight ? 'text-primary' : ''}`}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t" style={{ borderColor: theme.cardBorder }}>
                  <div className="flex items-center gap-2 text-xs font-bold opacity-60">
                    <Calendar className="w-4 h-4" />
                    Primeira parcela: {formatBrazilDate(firstDate)} → Última registrada: {formatBrazilDate(lastDate)}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] font-black uppercase opacity-50">Ajustar total (Y):</label>
                    <input 
                      type="number"
                      value={totalParcelas}
                      onChange={(e) => setOverrideTotalParcelas(parseInt(e.target.value))}
                      className="w-20 p-2 rounded-lg border text-xs font-bold text-center outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'payment_history_line':
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <LineChart className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6 h-80">
                <Line 
                  data={lineChartData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { ticks: { color: theme.text, callback: (v: number | string) => formatCurrency(v as number) }, grid: { color: theme.cardBorder } },
                      x: { ticks: { color: theme.text }, grid: { color: theme.cardBorder } }
                    }
                  }}
                />
              </div>
            )}
          </div>
        );

      case 'installments_table':
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <TableIcon className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-cardBorder/30">
                      <th className="p-4 border-b font-bold uppercase text-[10px] tracking-wider">Parcela</th>
                      <th className="p-4 border-b font-bold uppercase text-[10px] tracking-wider">Data</th>
                      <th className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right">Valor</th>
                      <th className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right">Variação</th>
                      <th className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: theme.cardBorder }}>
                    {parsedData.map((d, i) => {
                      const variation = i > 0 ? d.amount - parsedData[i-1].amount : 0;
                      return (
                        <tr key={d.id} className={`${!d.isPaid ? 'bg-red-500/10' : ''}`}>
                          <td className="p-4 font-bold">{d.parcelaPaga}/{d.totalParcelas}</td>
                          <td className="p-4 opacity-70">{formatBrazilDate(d.date)}</td>
                          <td className="p-4 text-right font-black text-primary">{formatCurrency(d.amount)}</td>
                          <td className={`p-4 text-right font-bold text-xs ${variation > 0 ? 'text-red-500' : variation < 0 ? 'text-green-500' : 'opacity-30'}`}>
                            {variation !== 0 ? (variation > 0 ? `+${formatCurrency(variation)}` : formatCurrency(variation)) : '-'}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${d.isPaid ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>
                              {d.isPaid ? 'Paga' : 'Pendente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case 'payment_calendar':
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <Calendar className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2">
                  {calendarMonths.map((m, i) => (
                    <div 
                      key={i} 
                      className={`p-2 rounded-lg border text-center flex flex-col gap-1 transition-all hover:scale-105 cursor-default ${
                        m.isPaid ? 'bg-green-500/10 border-green-500/30' : 
                        m.isCurrent ? 'border-primary shadow-sm' : 
                        'bg-gray-100/50 border-gray-200'
                      }`}
                      style={{ 
                        borderColor: m.isCurrent ? theme.primary : (m.isPaid ? undefined : theme.cardBorder),
                        opacity: m.isPaid || m.isCurrent ? 1 : 0.4
                      }}
                    >
                      <span className="text-[8px] font-black uppercase opacity-60">{m.label}</span>
                      <span className={`text-[10px] font-bold ${m.isPaid ? 'text-green-600' : ''}`}>{m.parcela}/{totalParcelas}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'interest_vs_principal':
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <PieChartIcon className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-black uppercase opacity-50">Valor Original do Financiamento (R$)</label>
                      <input 
                        type="number"
                        value={valorOriginal}
                        onChange={(e) => setValorOriginal(parseFloat(e.target.value))}
                        className="p-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-primary/20"
                        style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-black uppercase opacity-50">Taxa de Juros Mensal (%)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={taxaJurosMensal}
                        onChange={(e) => setTaxaJurosMensal(parseFloat(e.target.value))}
                        className="p-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-primary/20"
                        style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                      />
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <Info className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">Nota sobre SAC</span>
                      </div>
                      <p className="text-[11px] opacity-70 leading-relaxed">
                        No Sistema de Amortização Constante (SAC), o valor da amortização do principal é fixo todo mês, 
                        enquanto os juros diminuem progressivamente conforme o saldo devedor cai.
                      </p>
                    </div>
                  </div>
                  <div className="h-64">
                    <Bar 
                      data={sacChartData}
                      options={{
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom', labels: { color: theme.text, boxWidth: 10, font: { size: 10 } } } },
                        scales: {
                          y: { stacked: true, ticks: { color: theme.text, font: { size: 9 }, callback: (v: number | string) => formatCurrency(v as number) }, grid: { color: theme.cardBorder } },
                          x: { stacked: true, ticks: { color: theme.text, font: { size: 9 } }, grid: { color: theme.cardBorder } }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'amortization_simulator':
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <Calculator className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-black uppercase opacity-50">Valor de Amortização Extra (R$)</label>
                      <input 
                        type="number"
                        value={amortizacaoExtra}
                        onChange={(e) => setAmortizacaoExtra(parseFloat(e.target.value))}
                        className="p-4 rounded-2xl border text-xl font-black outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div className="flex gap-1 p-1 bg-cardBorder/30 rounded-xl">
                      <button
                        onClick={() => setAmortizationMode('prazo')}
                        className={`flex-1 py-3 rounded-lg text-xs font-black transition-all ${
                          amortizationMode === 'prazo' ? 'bg-primary text-white shadow-lg' : 'opacity-50 hover:opacity-100'
                        }`}
                      >
                        REDUZIR PRAZO
                      </button>
                      <button
                        onClick={() => setAmortizationMode('parcela')}
                        className={`flex-1 py-3 rounded-lg text-xs font-black transition-all ${
                          amortizationMode === 'parcela' ? 'bg-primary text-white shadow-lg' : 'opacity-50 hover:opacity-100'
                        }`}
                      >
                        REDUZIR PARCELA
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-4">
                    {amortizacaoExtra > 0 && amortizationResult ? (
                      <>
                        <div className="p-6 rounded-2xl bg-primary text-white shadow-xl space-y-2">
                          <div className="text-[10px] font-black uppercase opacity-70">Economia estimada de juros</div>
                          <div className="text-3xl font-black">{formatCurrency(amortizationResult.economy)}</div>
                          <div className="text-xs opacity-80 pt-2 border-t border-white/20">
                            {amortizationMode === 'prazo' 
                              ? `Elimina aproximadamente ${amortizationResult.parcelasEliminadas} parcelas do final.`
                              : `Redução de ${formatCurrency(amortizationResult.reduction || 0)} na próxima parcela.`
                            }
                          </div>
                        </div>
                        {amortizationMode === 'prazo' && (
                          <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed" style={{ borderColor: theme.cardBorder }}>
                            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                              <RefreshCw className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black uppercase opacity-50">Novo Total de Parcelas</div>
                              <div className="font-bold">{amortizationResult.newTotalParcelas} meses</div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-30 gap-3 border-2 border-dashed rounded-3xl" style={{ borderColor: theme.cardBorder }}>
                        <Calculator className="w-12 h-12" />
                        <p className="text-sm font-bold">Insira um valor para simular a economia</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'payoff_projection':
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <TrendingUp className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl border flex flex-col items-center text-center gap-2" style={{ borderColor: theme.cardBorder }}>
                    <div className="text-[10px] font-black uppercase opacity-50">Projeção Atual</div>
                    <div className="text-2xl font-black text-text">{currentProjectionEndDate}</div>
                    <div className="text-xs opacity-60">Mantendo o pagamento mensal atual</div>
                  </div>
                  <div className={`p-6 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all ${amortizacaoExtra > 0 && amortizationMode === 'prazo' ? 'bg-accent/10 border-accent/30' : ''}`} style={{ borderColor: amortizacaoExtra > 0 && amortizationMode === 'prazo' ? undefined : theme.cardBorder }}>
                    <div className="text-[10px] font-black uppercase opacity-50">Com Amortização</div>
                    <div className={`text-2xl font-black ${amortizacaoExtra > 0 && amortizationMode === 'prazo' ? 'text-accent' : 'text-text opacity-30'}`}>
                      {amortizacaoExtra > 0 && amortizationMode === 'prazo' ? amortizedProjectionEndDate : currentProjectionEndDate}
                    </div>
                    <div className="text-xs opacity-60">Considerando o aporte extra simulado</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'monthly_comparison':
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <BarChart3 className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6 h-80">
                <Chart 
                  type="bar"
                  data={{
                    labels: parsedData.map((d) => `P${d.parcelaPaga}`),
                    datasets: [
                      {
                        label: 'Valor da Parcela',
                        data: parsedData.map((d) => d.amount),
                        backgroundColor: theme.primary + '88',
                        borderColor: theme.primary,
                        borderWidth: 1,
                        type: 'bar' as const,
                        order: 2
                      },
                      {
                        label: 'Tendência',
                        data: parsedData.map((d) => d.amount),
                        borderColor: theme.accent,
                        borderWidth: 2,
                        fill: false,
                        type: 'line' as const,
                        pointRadius: 0,
                        tension: 0.1,
                        order: 1
                      }
                    ]
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: theme.text } } },
                    scales: {
                      y: { ticks: { color: theme.text, callback: (v: number | string) => formatCurrency(v as number) }, grid: { color: theme.cardBorder } },
                      x: { ticks: { color: theme.text }, grid: { color: theme.cardBorder } }
                    }
                  }}
                />
              </div>
            )}
          </div>
        );

      case 'consorcio_porto_cross': {
        const isFinancingDataMissing = valorOriginal <= 0 || taxaJurosMensal <= 0;
        
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <RefreshCw className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6 space-y-8">
                {isFinancingDataMissing ? (
                  <div className="p-8 text-center bg-accent/5 border border-dashed border-accent/30 rounded-2xl flex flex-col items-center gap-3">
                    <Info className="w-8 h-8 text-accent opacity-50" />
                    <p className="text-sm font-bold text-accent">Preencha os dados do financiamento na seção 5 para ativar os cálculos de cruzamento.</p>
                  </div>
                ) : (
                  <>
                    {/* Previous Data Warning Box */}
                    <div className="p-5 rounded-2xl border-2 bg-amber-500/5 space-y-4" style={{ borderColor: '#f59e0b55' }}>
                      <div className="flex items-center gap-2 text-amber-600">
                        <Info className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">⚠️ Dados anteriores ao app</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold opacity-60 uppercase">Valor pago antes do app (R$)</label>
                          <input 
                            type="number"
                            value={totalPagoConsorcioAnterior}
                            onChange={(e) => setTotalPagoConsorcioAnterior(parseFloat(e.target.value) || 0)}
                            className="p-2.5 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
                            style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold opacity-60 uppercase">Parcelas pagas antes do app</label>
                          <input 
                            type="number"
                            value={parcelasAnterioresConsorcio}
                            onChange={(e) => setParcelasAnterioresConsorcio(parseInt(e.target.value) || 0)}
                            className="p-2.5 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
                            style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                          />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-amber-500/10 text-[10px] font-black text-amber-700 uppercase tracking-tight">
                        Total combinado: {formatCurrency(consorcioData.totalPagoConsorcioReal)} em {consorcioData.parcelasConsorcioReal} parcelas
                      </div>
                    </div>

                    {/* Inputs Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-black uppercase opacity-50">Crédito estimado na contemplação (R$)</label>
                          <input 
                            type="number"
                            value={creditoConsorcio}
                            onChange={(e) => setCreditoConsorcio(parseFloat(e.target.value))}
                            className="p-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-black uppercase opacity-50">Total de parcelas do consórcio</label>
                          <input 
                            type="number"
                            value={totalParcelasConsorcio}
                            onChange={(e) => setTotalParcelasConsorcioManual(parseInt(e.target.value))}
                            className="p-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                          />
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-black uppercase opacity-50">Estimativa de contemplação: em {mesesAteContemplacao} meses</label>
                          </div>
                          <input 
                            type="range"
                            min="1"
                            max="120"
                            value={mesesAteContemplacao}
                            onChange={(e) => setMesesAteContemplacao(parseInt(e.target.value))}
                            className="w-full h-2 bg-cardBorder/30 rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <div className="flex justify-between text-[10px] font-bold opacity-40">
                            <span>1 mês</span>
                            <span>120 meses</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-black uppercase opacity-50">Meses de carência após contemplação</label>
                          <input 
                            type="number"
                            value={mesesCarencia}
                            onChange={(e) => setMesesCarencia(parseInt(e.target.value))}
                            className="p-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-primary/20 w-32"
                            style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Funding Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase opacity-50">
                        <span>Aporte no Consórcio vs Crédito</span>
                        <span>{formatCurrency(consorcioData.totalPagoConsorcioReal)} / {formatCurrency(creditoConsorcio)} ({consorcioFundingProgress.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 w-full bg-cardBorder/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min(consorcioFundingProgress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Result Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-5 rounded-2xl border bg-cardBorder/10 flex flex-col gap-2 text-center" style={{ borderColor: theme.cardBorder }}>
                        <span className="text-[10px] font-black uppercase opacity-50">Saldo Devedor na Contemplação</span>
                        <span className="text-xl font-black text-red-500">{formatCurrency(consorcioCrossResults.saldoNoMomentoUso)}</span>
                      </div>
                      
                      <div className="p-5 rounded-2xl border bg-cardBorder/10 flex flex-col gap-2 text-center" style={{ borderColor: theme.cardBorder }}>
                        <span className="text-[10px] font-black uppercase opacity-50">Cobertura do Consórcio</span>
                        <span className={`text-xl font-black ${
                          consorcioCrossResults.cobertura > 90 ? 'text-green-500' : 
                          consorcioCrossResults.cobertura > 70 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {consorcioCrossResults.cobertura.toFixed(1)}%
                        </span>
                      </div>

                      <div className="p-5 rounded-2xl border bg-cardBorder/10 flex flex-col gap-2 text-center" style={{ borderColor: theme.cardBorder }}>
                        <span className="text-[10px] font-black uppercase opacity-50">Diferença a Pagar</span>
                        <span className={`text-xl font-black ${consorcioCrossResults.diferencaRestante <= 0 ? 'text-green-500' : 'text-text'}`}>
                          {formatCurrency(consorcioCrossResults.diferencaRestante)}
                        </span>
                      </div>
                    </div>

                    {/* Economy Highlight */}
                    <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Calculator className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase text-primary">Economia estimada de juros evitados</p>
                          <p className="text-2xl font-black text-primary">{formatCurrency(consorcioCrossResults.economyJurosEstimada)}</p>
                        </div>
                      </div>
                      <div className="text-[11px] opacity-60 max-w-xs text-center md:text-right italic">
                        Ao quitar o saldo devedor com o consórcio, você deixa de pagar os juros projetados para as parcelas futuras do financiamento.
                      </div>
                    </div>

                    {/* Small Stat Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t" style={{ borderColor: theme.cardBorder }}>
                      <div>
                        <p className="text-[9px] font-black uppercase opacity-40">Total Pago no Consórcio</p>
                        <p className="text-xs font-bold">{formatCurrency(consorcioData.totalPagoConsorcioReal)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase opacity-40">Parcelas Pagas</p>
                        <p className="text-xs font-bold">{consorcioData.parcelasConsorcioReal} de {totalParcelasConsorcio}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase opacity-40">Média Mensal</p>
                        <p className="text-xs font-bold">{formatCurrency(consorcioData.mediaParcelaConsorcio)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase opacity-40">Primeira Parcela</p>
                        <p className="text-xs font-bold">{consorcioData.primeiraParcelaConsorcio ? formatBrazilDate(consorcioData.primeiraParcelaConsorcio) : '-'}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Detailed Consórcio Table - Always Visible if Section Expanded */}
                <div className="space-y-4 pt-6 border-t" style={{ borderColor: theme.cardBorder }}>
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-primary" />
                    <span className="text-xs font-black uppercase opacity-50">Histórico de Pagamentos Consórcio</span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border" style={{ borderColor: theme.cardBorder }}>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-cardBorder/20">
                          <th className="p-3 border-b font-bold uppercase text-[9px] tracking-wider">Data</th>
                          <th className="p-3 border-b font-bold uppercase text-[9px] tracking-wider">Descrição</th>
                          <th className="p-3 border-b font-bold uppercase text-[9px] tracking-wider text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: theme.cardBorder }}>
                        {transactions
                          .filter(t => 
                            t.status !== 'deleted' && 
                            t.description?.toLowerCase().includes('consórcio porto') &&
                            t.category?.toLowerCase() === 'outro'
                          )
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((t) => (
                            <tr key={t.id} className="hover:bg-primary/5 transition-colors">
                              <td className="p-3 opacity-70">{formatBrazilDate(t.date)}</td>
                              <td className="p-3 font-medium">{t.description}</td>
                              <td className="p-3 text-right font-black text-primary">{formatCurrency(t.amount)}</td>
                            </tr>
                          ))}
                        {consorcioData.parcelasConsorcio === 0 && (
                          <tr>
                            <td colSpan={3} className="p-8 text-center opacity-40 italic">Nenhuma transação de consórcio encontrada.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 gap-6">
        {layout.sort((a, b) => a.number - b.number).map((item, index) => renderSection(item, index))}
      </div>

      {/* Maximized Modal */}
      {maximizedId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div 
            className="w-full h-full bg-cardBackground rounded-3xl border shadow-2xl flex flex-col overflow-hidden"
            style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBackground }}
          >
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: theme.cardBorder }}>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-text">
                  {layout.find(i => i.id === maximizedId)?.label}
                </span>
              </div>
              <button 
                onClick={() => setMaximizedId(null)}
                className="p-2 hover:bg-cardBorder rounded-xl transition-colors text-text"
              >
                <ChevronDown className="w-6 h-6 rotate-180" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {renderSection(layout.find(i => i.id === maximizedId)!, layout.findIndex(i => i.id === maximizedId))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanciamentoCasaPlayground;
