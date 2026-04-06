import {
  format,
  parseISO,
  addMonths,
} from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Maximize2,
  TrendingUp,
  Home,
  Info,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

import { ColorPalette } from '../contexts/ThemeContext';
import { useLocalStorage } from '../hooks/trello/useLocalStorage';
import { Transaction } from '../types';
import { formatCurrency, formatBrazilDate } from '../utils/helpers';


interface HistoryItem {
  parcela: number;
  vencimento: string;
  amortizacao: number;
  juros: number;
  seguroMIP: number;
  seguroDFI: number;
  fgtsMensal: number;
  situacao: 'Paga' | 'Aberta' | 'Projetada';
  total: number;
  saldoDevedor: number;
  operacao?: string;
}

const ITAU_HISTORY: HistoryItem[] = [
  { parcela: 1, vencimento: '2025-07-26', amortizacao: 1392.63, juros: 6012.44, seguroMIP: 326.30, seguroDFI: 94.34, fgtsMensal: 0, situacao: 'Paga', total: 7825.71, saldoDevedor: 582120.34 },
  { parcela: 2, vencimento: '2025-08-26', amortizacao: 1395.03, juros: 6008.42, seguroMIP: 172.26, seguroDFI: 47.25, fgtsMensal: 0, situacao: 'Paga', total: 7622.96, saldoDevedor: 581727.72 },
  { parcela: 3, vencimento: '2025-09-26', amortizacao: 1397.49, juros: 6004.60, seguroMIP: 172.15, seguroDFI: 47.34, fgtsMensal: 0, situacao: 'Paga', total: 7621.58, saldoDevedor: 581354.07 },
  { parcela: 4, vencimento: '2025-10-26', amortizacao: 1399.89, juros: 6000.49, seguroMIP: 172.03, seguroDFI: 47.42, fgtsMensal: 0, situacao: 'Paga', total: 7619.83, saldoDevedor: 580953.53 },
  { parcela: 5, vencimento: '2025-11-26', amortizacao: 1420.69, juros: 6075.02, seguroMIP: 174.17, seguroDFI: 47.50, fgtsMensal: 0, situacao: 'Paga', total: 7717.38, saldoDevedor: 588165.60, operacao: 'Pula parcela (+7.619,83)' },
  { parcela: 6, vencimento: '2025-12-26', amortizacao: 1441.81, juros: 6150.48, seguroMIP: 178.01, seguroDFI: 47.58, fgtsMensal: 0, situacao: 'Paga', total: 7817.88, saldoDevedor: 595467.88, operacao: 'Pula parcela (+7.717,38)' },
  { parcela: 7, vencimento: '2026-01-26', amortizacao: 1444.26, juros: 6146.05, seguroMIP: 177.88, seguroDFI: 47.66, fgtsMensal: 6018.20, situacao: 'Paga', total: 1797.65, saldoDevedor: 595035.32, operacao: 'Utilização FGTS DAMP III (-72.244,05)' },
  { parcela: 8, vencimento: '2026-02-26', amortizacao: 1446.74, juros: 6141.69, seguroMIP: 177.75, seguroDFI: 47.74, fgtsMensal: 6016.72, situacao: 'Paga', total: 1797.20, saldoDevedor: 594610.26 },
  { parcela: 9, vencimento: '2026-03-26', amortizacao: 1449.19, juros: 6137.17, seguroMIP: 177.62, seguroDFI: 47.82, fgtsMensal: 6015.09, situacao: 'Paga', total: 1796.71, saldoDevedor: 594168.34 },
  { parcela: 10, vencimento: '2026-04-26', amortizacao: 1451.64, juros: 6132.56, seguroMIP: 177.49, seguroDFI: 47.91, fgtsMensal: 6013.39, situacao: 'Aberta', total: 1796.21, saldoDevedor: 593719.06 },
  { parcela: 11, vencimento: '2026-05-26', amortizacao: 1451.64, juros: 6117.60, seguroMIP: 177.06, seguroDFI: 47.91, fgtsMensal: 6001.54, situacao: 'Projetada', total: 1792.67, saldoDevedor: 592267.42 },
  { parcela: 12, vencimento: '2026-06-26', amortizacao: 1451.64, juros: 6102.65, seguroMIP: 176.62, seguroDFI: 47.91, fgtsMensal: 5989.69, situacao: 'Projetada', total: 1789.13, saldoDevedor: 590815.78 },
  { parcela: 13, vencimento: '2026-07-26', amortizacao: 1451.64, juros: 6087.69, seguroMIP: 176.19, seguroDFI: 47.91, fgtsMensal: 5977.84, situacao: 'Projetada', total: 1785.59, saldoDevedor: 589364.14 },
  { parcela: 14, vencimento: '2026-08-26', amortizacao: 1451.64, juros: 6072.73, seguroMIP: 179.47, seguroDFI: 47.91, fgtsMensal: 5968.85, situacao: 'Projetada', total: 1782.90, saldoDevedor: 587912.50 },
  { parcela: 15, vencimento: '2026-09-26', amortizacao: 1451.64, juros: 6057.77, seguroMIP: 179.02, seguroDFI: 47.91, fgtsMensal: 5956.98, situacao: 'Projetada', total: 1779.36, saldoDevedor: 586460.86 },
  { parcela: 16, vencimento: '2026-10-26', amortizacao: 1451.64, juros: 6042.82, seguroMIP: 178.58, seguroDFI: 47.91, fgtsMensal: 5945.13, situacao: 'Projetada', total: 1775.82, saldoDevedor: 585009.22 },
  { parcela: 17, vencimento: '2026-11-26', amortizacao: 1451.64, juros: 6027.86, seguroMIP: 178.14, seguroDFI: 47.91, fgtsMensal: 5933.27, situacao: 'Projetada', total: 1772.28, saldoDevedor: 583557.58 },
  { parcela: 18, vencimento: '2026-12-26', amortizacao: 1451.64, juros: 6012.90, seguroMIP: 179.76, seguroDFI: 47.91, fgtsMensal: 5923.00, situacao: 'Projetada', total: 1769.21, saldoDevedor: 582105.94 },
  { parcela: 19, vencimento: '2027-01-26', amortizacao: 1451.64, juros: 5997.94, seguroMIP: 179.32, seguroDFI: 47.91, fgtsMensal: 3201.20, situacao: 'Projetada', total: 4475.61, saldoDevedor: 580654.30 },
  { parcela: 20, vencimento: '2027-02-26', amortizacao: 1451.64, juros: 5982.99, seguroMIP: 178.87, seguroDFI: 47.91, fgtsMensal: 0, situacao: 'Projetada', total: 7661.41, saldoDevedor: 579202.66 },
];

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
  { id: 'installments_table', label: 'Tabela de Parcelas', collapsed: false, number: 2 },
];

const FinanciamentoCasaPlayground: React.FC<FinanciamentoCasaPlaygroundProps> = ({ transactions, theme }) => {
  const [layout, setLayout] = useLocalStorage<LayoutItem[]>('financiamento_playground_layout_v2', DEFAULT_LAYOUT);
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  
  // Manual inputs for simulation
   const [overrideTotalParcelas, setOverrideTotalParcelas] = useState<number | null>(419);
   const [taxaJurosMensal] = useState<number>(0.010303871);
   const [taxaEfetivaAnual] = useState<number>(13.090000000);
   const [numeroContrato] = useState<string>('10197455901');
   const [valorOriginal] = useState<number>(582500);

  // Derived stats base
  const totalParcelas = overrideTotalParcelas || 419;

  // SAC Calculation for Juros vs Principal
  const calculateAdjustedSAC = (totalParcelas: number, taxaJuros: number) => {
    const results: any[] = [];
    
    // 1. Iniciar com o histórico real do Itaú
    ITAU_HISTORY.forEach((item: HistoryItem) => {
      results.push({
        parcela: item.parcela,
        vencimento: item.vencimento,
        amortizacao: item.amortizacao,
        extraAmount: 0,
        juros: item.juros,
        seguros: item.seguroMIP + item.seguroDFI,
        fgtsMensal: item.fgtsMensal,
        total: item.total,
        saldoDevedor: item.saldoDevedor,
        date: parseISO(item.vencimento),
        situacao: item.situacao,
        operacao: item.operacao
      });
    });

    // 2. Continuar projeção a partir da última parcela do histórico
    const lastReal = results[results.length - 1];
    let currentSaldo = lastReal.saldoDevedor;
    const amortizacaoBase = 1451.64; // Valor observado nas projeções reais
    const taxa = taxaJuros / 100;
    const startDate = parseISO(lastReal.vencimento);

    for (let i = results.length + 1; i <= totalParcelas; i++) {
      const currentMonth = addMonths(startDate, i - results.length);
      const juros = currentSaldo * taxa;
      
      // Manter seguros e subsídio FGTS constantes para projeção simplificada
      const seguros = 177.06 + 47.91; // Baseado na parcela 11
      const fgtsSubsidy = i <= 19 ? lastReal.fgtsMensal : 0; // FGTS DAMP III costuma ter prazo (ex: 12 meses)
      
      currentSaldo = Math.max(currentSaldo - amortizacaoBase, 0);

      results.push({
        parcela: i,
        vencimento: format(currentMonth, 'yyyy-MM-dd'),
        amortizacao: amortizacaoBase,
        extraAmount: 0,
        juros: juros,
        seguros: seguros,
        fgtsMensal: fgtsSubsidy,
        total: Math.max(amortizacaoBase + juros + seguros - fgtsSubsidy, 0),
        saldoDevedor: currentSaldo,
        date: currentMonth,
        situacao: 'Projetada'
      });

      if (currentSaldo <= 0) break;
    }
    return results;
  };

  const adjustedSacData = useMemo(() => {
    return calculateAdjustedSAC(valorOriginal, totalParcelas);
  }, [valorOriginal, totalParcelas, taxaJurosMensal]);

  // Derived stats dependent on adjustedSacData
  const paidInstallments = useMemo(() => {
    return adjustedSacData.filter((d: any) => d.date < new Date());
  }, [adjustedSacData]);

  const lastParcelaPaga = paidInstallments.length > 0 ? Math.max(...paidInstallments.map((d: any) => d.parcela)) : 0;
  const progressPercent = totalParcelas > 0 ? (lastParcelaPaga / totalParcelas) * 100 : 0;

  // Parse transactions
  const parsedData = useMemo(() => {
    return transactions
      .filter((t: any) => 
        t.type === 'expense' && 
        t.status !== 'deleted' && 
        t.category?.toLowerCase() === 'moradia' &&
        /Financiamento casa \d+\/\d+/i.test(t.description || '')
      )
      .map((t: any): any => {
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
      .sort((a: any, b: any) => a.parcelaPaga - b.parcelaPaga);
  }, [transactions]);

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

  const lastDate = adjustedSacData.length > 0 ? adjustedSacData[adjustedSacData.length - 1].vencimento : '';

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

  const renderSection = (item: LayoutItem, index: number) => {
    const isCollapsed = item.collapsed;
    
    switch (item.id) {
      case 'header_summary':
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <Home className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-black text-primary">Contrato {numeroContrato}</h3>
                    <p className="text-xs opacity-60 font-bold uppercase tracking-wider">CARTEIRA HIPOTECARIA | SISTEMA SAC</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase">Débito Automático</span>
                    <span className="px-3 py-1 bg-accent/10 text-accent text-[10px] font-black rounded-full uppercase">Itaú Real Data</span>
                  </div>
                </div>

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
                    { label: 'Taxa Juros (M)', value: `${taxaJurosMensal.toFixed(4)}%`, icon: <TrendingUp className="w-4 h-4" /> },
                    { label: 'Taxa Efetiva (A)', value: `${taxaEfetivaAnual.toFixed(2)}%`, icon: <TrendingUp className="w-4 h-4" />, highlight: true },
                    { label: 'Vencimento Final', value: formatBrazilDate(lastDate), icon: <Calendar className="w-4 h-4" /> }
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: theme.cardBorder }}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold opacity-60">
                      <Info className="w-4 h-4 text-primary" />
                      Utilização de FGTS DAMP III aplicada em 06/01/2026: R$ 72.244,05
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                      <AlertCircle className="w-4 h-4" />
                      2 Operações "Pula Parcela" realizadas: +R$ 15.337,21 ao saldo devedor
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <label className="text-[10px] font-black uppercase opacity-50">Ajustar total parcelas:</label>
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

      case 'installments_table':
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <Calendar className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] md:text-xs border-collapse">
                  <thead>
                    <tr className="bg-cardBorder/30">
                      <th className="p-3 border-b font-bold uppercase tracking-wider">Parcela</th>
                      <th className="p-3 border-b font-bold uppercase tracking-wider">Vencimento</th>
                      <th className="p-3 border-b font-bold uppercase tracking-wider text-right">Amort.</th>
                      <th className="p-3 border-b font-bold uppercase tracking-wider text-right">Juros</th>
                      <th className="p-3 border-b font-bold uppercase tracking-wider text-right">Seguros</th>
                      <th className="p-3 border-b font-bold uppercase tracking-wider text-right text-blue-500">FGTS Sub.</th>
                      <th className="p-3 border-b font-bold uppercase tracking-wider text-right text-primary">Total Pago</th>
                      <th className="p-3 border-b font-bold uppercase tracking-wider text-right">Saldo Dev.</th>
                      <th className="p-3 border-b font-bold uppercase tracking-wider text-center">Observação</th>
                      <th className="p-3 border-b font-bold uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: theme.cardBorder }}>
                    {adjustedSacData.map((d: any) => (
                      <tr key={d.parcela} className={`${d.situacao === 'Aberta' ? 'bg-amber-500/5' : d.situacao === 'Projetada' ? 'opacity-70' : ''} ${d.operacao ? 'bg-primary/5' : ''}`}>
                        <td className="p-3 font-bold">{d.parcela}</td>
                        <td className="p-3 opacity-70">{formatBrazilDate(d.vencimento)}</td>
                        <td className="p-3 text-right">{formatCurrency(d.amortizacao)}</td>
                        <td className="p-3 text-right">{formatCurrency(d.juros)}</td>
                        <td className="p-3 text-right">{formatCurrency(d.seguros)}</td>
                        <td className="p-3 text-right text-blue-500">{d.fgtsMensal > 0 ? `-${formatCurrency(d.fgtsMensal)}` : '-'}</td>
                        <td className="p-3 text-right font-black text-primary">{formatCurrency(d.total)}</td>
                        <td className="p-3 text-right font-medium opacity-60">{formatCurrency(d.saldoDevedor)}</td>
                        <td className="p-3 text-center">
                          {d.operacao && (
                            <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <AlertCircle className="w-3 h-3" />
                              {d.operacao}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            d.situacao === 'Paga' ? 'bg-green-500/20 text-green-600' : 
                            d.situacao === 'Aberta' ? 'bg-amber-500/20 text-amber-600' : 
                            'bg-gray-500/10 text-gray-500'
                          }`}>
                            {d.situacao}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

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
