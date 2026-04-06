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
  { id: 'consorcio_summary', label: 'Resumo Consórcio Porto', collapsed: false, number: 2 },
  { id: 'itau_consorcio_relation', label: 'Relação Financiamento Itaú x Consórcio', collapsed: false, number: 3 },
  { id: 'installments_table', label: 'Tabela de Parcelas Itaú', collapsed: false, number: 4 },
  { id: 'consorcio_installments_table', label: 'Tabela de Parcelas Porto', collapsed: true, number: 5 },
];

const FinanciamentoCasaPlayground: React.FC<FinanciamentoCasaPlaygroundProps> = ({ transactions, theme }) => {
  const [layout, setLayout] = useLocalStorage<LayoutItem[]>('financiamento_playground_layout_v4', DEFAULT_LAYOUT);
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

  // Consórcio Porto - Dados Reais do Contrato (3 cartas)
  const CONSORCIO_CONFIG = {
    quantidadeCartas: 3,
    creditoPorCarta: 187371.03,
    quitacaoPorCarta: 204446.37, // Total para quitar (89.91%)
    percentualPagoAtual: 10.09 / 100,
    dataInicio: parseISO('2023-11-16'),
    valorPrimeiraParcelaTotal: 920.54 * 3, // R$ 2.761,62
    valorParcelaAtualTotal: 928.28 * 3,   // R$ 2,784,84
    prazoTotalMeses: 200
  };

  // Consórcio Porto Data - Reconstrução do Histórico
  const consorcioData = useMemo(() => {
    // 1. Dados Reais fornecidos pelo usuário (per carta)
    const quitacaoPerCarta = CONSORCIO_CONFIG.quitacaoPorCarta; // R$ 204.446,37
    const percentRemaining = 89.91 / 100;
    
    // O Valor Total do Contrato (incluindo taxas) é derivado do saldo de quitação e do percentual restante
    const valorTotalContratoPerCarta = quitacaoPerCarta / percentRemaining;
    const valorTotalContratoTotal = valorTotalContratoPerCarta * 3;
    
    // 2. Calcular o Total Pago (Fluxo de Caixa)
    // De 16/11/2023 até 06/04/2026 = 29 meses
    const today = new Date();
    const start = CONSORCIO_CONFIG.dataInicio;
    const monthsDiff = (today.getFullYear() - start.getFullYear()) * 12 + today.getMonth() - start.getMonth();
    const count = monthsDiff; // Parcelas já pagas até hoje
    
    // Média entre a primeira parcela (920.54) e a atual (928.28)
    const avgParcelaPerCarta = (920.54 + 928.28) / 2;
    const totalPaidReal = count * avgParcelaPerCarta * 3;
    
    const totalCredit = CONSORCIO_CONFIG.creditoPorCarta * 3;
    const totalQuitacao = quitacaoPerCarta * 3;

    const nextVencimento = addMonths(start, count);
    const isNextPendente = today.getMonth() === nextVencimento.getMonth() && today.getFullYear() === nextVencimento.getFullYear();

    return {
      count,
      totalPaid: totalPaidReal,
      firstDate: start,
      lastDate: today,
      nextVencimento,
      isNextPendente,
      avgInstallment: CONSORCIO_CONFIG.valorParcelaAtualTotal,
      totalCreditEstimated: totalCredit,
      totalQuitacao,
      valorTotalContrato: valorTotalContratoTotal,
      percentPaidEstimated: CONSORCIO_CONFIG.percentualPagoAtual * 100,
      detalhePorCarta: {
        credito: CONSORCIO_CONFIG.creditoPorCarta,
        pagoPercent: CONSORCIO_CONFIG.percentualPagoAtual * 100,
        quitacao: quitacaoPerCarta,
        parcela: 928.28
      }
    };
  }, [transactions]);

  // Itau x Consorcio Relation State
  const [consorcioTaxaAdm, setConsorcioTaxaAdm] = useState(12);
  const [consorcioMinContemplacao, setConsorcioMinContemplacao] = useState(40);
  const [consorcioModoUso, setConsorcioModoUso] = useState<'total' | 'uma'>('total');
  const [consorcioIntervaloMeses, setConsorcioIntervaloMeses] = useState(12);
  const [manualContemplacaoDate, setManualContemplacaoDate] = useState<string | null>(null);

  const relationData = useMemo(() => {
    if (!consorcioData) return null;

    const currentSaldoItau = adjustedSacData.find(d => d.parcela === lastParcelaPaga + 1)?.saldoDevedor || 0;
    
    // Previsão baseada no percentual de contemplação desejado
    const targetPaidPercent = consorcioMinContemplacao / 100;
    const remainingPercentToTarget = Math.max(targetPaidPercent - (consorcioData.percentPaidEstimated / 100), 0);
    
    // Quanto falta pagar em R$ para atingir o percentual de contemplação
    const amountToTarget = remainingPercentToTarget * consorcioData.valorTotalContrato;
    const monthsToContemplacao = Math.ceil(amountToTarget / consorcioData.avgInstallment);
    
    const projectedContemplacaoDate = manualContemplacaoDate ? parseISO(manualContemplacaoDate) : addMonths(new Date(), monthsToContemplacao);
    
    const saldoItauAtContemplacao = adjustedSacData.find(d => {
      const dDate = new Date(d.date);
      return dDate.getMonth() === projectedContemplacaoDate.getMonth() && 
             dDate.getFullYear() === projectedContemplacaoDate.getFullYear();
    })?.saldoDevedor || 0;

    // Crédito líquido real (o usuário já forneceu o crédito bruto de 187k)
    // Geralmente o crédito já é o valor que o usuário recebe, mas vamos aplicar a taxa de adm se for sobre o total
    const liquidoTotal = consorcioData.totalCreditEstimated; // Assumindo que 187k já é o crédito disponível
    const liquidoUmaCarta = liquidoTotal / 3;

    // Simular economia (simplificada)
    const valorAmortizacaoImediata = consorcioModoUso === 'total' ? liquidoTotal : liquidoUmaCarta;
    
    const jurosMensal = taxaJurosMensal / 100;
    const economiaJurosEstimada = valorAmortizacaoImediata * jurosMensal * (totalParcelas - lastParcelaPaga);

    return {
      currentSaldoItau,
      projectedContemplacaoDate,
      saldoItauAtContemplacao,
      liquidoTotal,
      liquidoUmaCarta,
      economiaJurosEstimada,
      percentAtualConsorcio: consorcioData.percentPaidEstimated,
      intervalo: consorcioIntervaloMeses
    };
  }, [consorcioData, adjustedSacData, lastParcelaPaga, consorcioMinContemplacao, consorcioTaxaAdm, manualContemplacaoDate, taxaJurosMensal, totalParcelas, consorcioModoUso, consorcioIntervaloMeses]);

  // Consortium Installments Table Data
  const consorcioInstallmentsData = useMemo(() => {
    if (!consorcioData) return [];
    
    const installments = [];
    const today = new Date();
    const startDate = CONSORCIO_CONFIG.dataInicio;
    
    // Total de 200 meses
    for (let i = 1; i <= 200; i++) {
      const vencimento = addMonths(startDate, i - 1);
      const isPaid = vencimento < today && (vencimento.getMonth() !== today.getMonth() || vencimento.getFullYear() !== today.getFullYear());
      const isCurrentMonth = vencimento.getMonth() === today.getMonth() && vencimento.getFullYear() === today.getFullYear();
      
      // Lógica de valores (primeira parcela 920.54, atual 928.28)
      // Vamos assumir uma progressão linear simples para o histórico e manter fixa a atual para o futuro
      let valorMensal = CONSORCIO_CONFIG.valorParcelaAtualTotal;
      if (i === 1) valorMensal = CONSORCIO_CONFIG.valorPrimeiraParcelaTotal;
      else if (i < consorcioData.count) {
        // Interpolar entre inicial e atual
        const progress = (i - 1) / (consorcioData.count - 1);
        valorMensal = CONSORCIO_CONFIG.valorPrimeiraParcelaTotal + (CONSORCIO_CONFIG.valorParcelaAtualTotal - CONSORCIO_CONFIG.valorPrimeiraParcelaTotal) * progress;
      }

      installments.push({
        parcela: i,
        vencimento: format(vencimento, 'yyyy-MM-dd'),
        valor: valorMensal,
        situacao: isPaid ? 'Paga' : (isCurrentMonth ? 'Aberta' : 'Projetada'),
        date: vencimento
      });
    }
    
    return installments;
  }, [consorcioData]);

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

      case 'consorcio_summary':
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <TrendingUp className="w-5 h-5 text-accent" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6 space-y-6">
                {!consorcioData ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center gap-3 opacity-60">
                    <AlertCircle className="w-10 h-10" />
                    <p className="text-sm font-bold">Nenhum dado de Consórcio encontrado</p>
                    <p className="text-[10px]">Verifique transações com "Consórcio Porto" na categoria "Outro".</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                      <div>
                        <h3 className="text-lg font-black text-accent">Grupo Porto Seguro (3 Cartas)</h3>
                        <p className="text-[10px] opacity-60 font-bold uppercase tracking-wider">Início em {formatBrazilDate(format(consorcioData.firstDate, 'yyyy-MM-dd'))}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-accent/10 text-accent text-[10px] font-black rounded-full uppercase">Histórico Reconstruído</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Parcelas Pagas', value: `${consorcioData.count} / 200`, icon: <CheckCircle2 className="w-4 h-4" /> },
                        { label: 'Total Investido', value: formatCurrency(consorcioData.totalPaid), icon: <ArrowUp className="w-4 h-4 text-red-500" />, highlight: true },
                        { label: 'Parcela Atual (3x)', value: formatCurrency(consorcioData.avgInstallment), icon: <TrendingUp className="w-4 h-4" /> },
                        { label: 'Próximo Vencimento', value: formatBrazilDate(format(consorcioData.nextVencimento, 'yyyy-MM-dd')), icon: <Calendar className="w-4 h-4" />, highlight: consorcioData.isNextPendente, status: consorcioData.isNextPendente ? 'Pendente' : 'Projetado' }
                      ].map((stat, i) => (
                        <div key={i} className="p-4 rounded-xl border flex flex-col gap-1" style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBorder + '11' }}>
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase opacity-50">
                            {stat.icon}
                            {stat.label}
                          </div>
                          <div className={`text-sm md:text-base font-black ${stat.highlight ? 'text-accent' : ''}`}>
                            {stat.value}
                          </div>
                          {stat.status && (
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full w-fit ${stat.status === 'Pendente' ? 'bg-amber-500/20 text-amber-600' : 'bg-gray-500/10 text-gray-500'}`}>
                              {stat.status}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: theme.cardBorder }}>
                        <div className="text-[10px] font-black uppercase opacity-50">Crédito Total (Líquido)</div>
                        <div className="text-lg font-black text-primary">{formatCurrency(consorcioData.totalCreditEstimated)}</div>
                        <div className="text-[9px] opacity-60 font-bold italic">R$ {formatCurrency(consorcioData.detalhePorCarta.credito)} por carta</div>
                      </div>
                      <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: theme.cardBorder }}>
                        <div className="text-[10px] font-black uppercase opacity-50">Avanço do Plano</div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-orange-500/10 rounded-full relative">
                            <div 
                              className="h-full bg-accent rounded-full transition-all duration-1000" 
                              style={{ width: `${consorcioData.percentPaidEstimated}%` }} 
                            />
                            {/* Meta Marker */}
                            <div 
                              className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-primary shadow-[0_0_5px_rgba(0,0,0,0.2)] z-10" 
                              style={{ left: `${consorcioMinContemplacao}%` }}
                            >
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] font-black text-primary whitespace-nowrap">
                                POSSÍVEL CONTEMPLAÇÃO {consorcioMinContemplacao}%
                              </div>
                            </div>
                          </div>
                          <span className="text-sm font-black">{consorcioData.percentPaidEstimated.toFixed(2)}%</span>
                        </div>
                        <div className="text-[9px] opacity-60 font-bold">Meta Contemplação: {consorcioMinContemplacao}%</div>
                      </div>
                      <div className="p-4 rounded-xl border space-y-2 relative group" style={{ borderColor: theme.cardBorder }}>
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-black uppercase opacity-50">Saldo p/ Quitação (3 Cartas)</div>
                          <Info className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity text-accent" />
                        </div>
                        <div className="text-lg font-black text-red-600">{formatCurrency(consorcioData.totalQuitacao)}</div>
                        <div className="text-[9px] opacity-60 font-bold italic">R$ {formatCurrency(consorcioData.detalhePorCarta.quitacao)} cada (89,91%)</div>
                        <div className="text-[8px] font-bold text-accent bg-accent/5 p-1 rounded border border-accent/10 mt-1">
                          * Inclui taxa de administração de {consorcioTaxaAdm}% e encargos contratuais.
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );

      case 'itau_consorcio_relation':
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <TrendingUp className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6 space-y-6">
                {!relationData ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center gap-3 opacity-60">
                    <AlertCircle className="w-10 h-10" />
                    <p className="text-sm font-bold">Aguardando dados do Consórcio</p>
                    <p className="text-[10px]">A relação depende de dados reais do Consórcio Porto.</p>
                  </div>
                ) : (
                  <>
                    {/* Controles e Parâmetros */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 rounded-xl bg-cardBorder/10 border border-dashed border-cardBorder">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase opacity-50">Taxa Adm (%)</label>
                        <input 
                          type="number" 
                          value={consorcioTaxaAdm} 
                          onChange={(e) => setConsorcioTaxaAdm(Number(e.target.value))}
                          className="w-full bg-transparent border-b border-cardBorder outline-none focus:border-primary font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase opacity-50">Min. Contemplação (%)</label>
                        <input 
                          type="number" 
                          value={consorcioMinContemplacao} 
                          onChange={(e) => setConsorcioMinContemplacao(Number(e.target.value))}
                          className="w-full bg-transparent border-b border-cardBorder outline-none focus:border-primary font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase opacity-50">Modo de Uso</label>
                        <select 
                          value={consorcioModoUso}
                          onChange={(e) => setConsorcioModoUso(e.target.value as any)}
                          className="w-full bg-transparent border-b border-cardBorder outline-none focus:border-primary font-bold text-sm"
                        >
                          <option value="total">Usar Crédito Total</option>
                          <option value="uma">Usar 1 Carta por vez</option>
                        </select>
                      </div>
                      {consorcioModoUso === 'uma' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase opacity-50">Intervalo (meses)</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="24"
                            value={consorcioIntervaloMeses} 
                            onChange={(e) => setConsorcioIntervaloMeses(Number(e.target.value))}
                            className="w-full bg-transparent border-b border-cardBorder outline-none focus:border-primary font-bold text-sm"
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase opacity-50">Data Contemplação (Manual)</label>
                        <input 
                          type="date" 
                          value={manualContemplacaoDate || ''} 
                          onChange={(e) => setManualContemplacaoDate(e.target.value || null)}
                          className="w-full bg-transparent border-b border-cardBorder outline-none focus:border-primary font-bold text-sm"
                        />
                      </div>
                    </div>

                    {/* Resultados Projeção */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase opacity-40 flex items-center gap-2">
                          <Calendar className="w-3 h-3" /> Projeção de Contemplação
                        </h4>
                        <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: theme.cardBorder }}>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase opacity-50">Data Estimada</span>
                            <span className="text-lg font-black text-accent">{formatBrazilDate(format(relationData.projectedContemplacaoDate, 'yyyy-MM-dd'))}</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase opacity-50">Saldo Itaú nessa data</span>
                            <span className="text-sm font-black opacity-70">{formatCurrency(relationData.saldoItauAtContemplacao)}</span>
                          </div>
                          <div className="pt-2 border-t flex justify-between items-end" style={{ borderColor: theme.cardBorder }}>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase opacity-50 text-primary">Crédito Líquido</span>
                          <span className="text-[8px] opacity-60 font-bold italic">({consorcioModoUso === 'total' ? '3 cartas' : '1 carta'})</span>
                        </div>
                        <span className="text-lg font-black text-primary">
                          {consorcioModoUso === 'total' ? formatCurrency(relationData.liquidoTotal) : formatCurrency(relationData.liquidoUmaCarta)}
                        </span>
                      </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase opacity-40 flex items-center gap-2">
                          <TrendingUp className="w-3 h-3" /> Impacto Financeiro
                        </h4>
                        <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: theme.cardBorder }}>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase opacity-50">Saldo Após Quitação</span>
                            <span className="text-lg font-black text-green-600">
                              {formatCurrency(Math.max(relationData.saldoItauAtContemplacao - (consorcioModoUso === 'total' ? relationData.liquidoTotal : relationData.liquidoUmaCarta), 0))}
                            </span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase opacity-50">Economia de Juros (Est.)</span>
                            <span className="text-sm font-black text-primary flex items-center gap-1">
                              <ArrowDown className="w-3 h-3" /> {formatCurrency(relationData.economiaJurosEstimada)}
                            </span>
                          </div>
                          <div className="pt-2 border-t" style={{ borderColor: theme.cardBorder }}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-black uppercase opacity-50">Avanço Consórcio</span>
                              <span className="text-[10px] font-black">{relationData.percentAtualConsorcio.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-orange-500/10 rounded-full overflow-hidden">
                              <div className="h-full bg-accent" style={{ width: `${relationData.percentAtualConsorcio}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
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

      case 'consorcio_installments_table':
        return (
          <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            {renderCardHeader(item.id, item.label, <Calendar className="w-5 h-5 text-accent" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] md:text-xs border-collapse">
                  <thead>
                    <tr className="bg-cardBorder/30">
                      <th className="p-3 border-b font-bold uppercase tracking-wider">Parcela</th>
                      <th className="p-3 border-b font-bold uppercase tracking-wider">Vencimento</th>
                      <th className="p-3 border-b font-bold uppercase tracking-wider text-right text-accent">Valor (3 Cartas)</th>
                      <th className="p-3 border-b font-bold uppercase tracking-wider text-right">Valor Individual</th>
                      <th className="p-3 border-b font-bold uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: theme.cardBorder }}>
                    {consorcioInstallmentsData.map((d: any) => (
                      <tr key={d.parcela} className={`${d.situacao === 'Aberta' ? 'bg-amber-500/5' : d.situacao === 'Projetada' ? 'opacity-70' : ''}`}>
                        <td className="p-3 font-bold">{d.parcela} / 200</td>
                        <td className="p-3 opacity-70">{formatBrazilDate(d.vencimento)}</td>
                        <td className="p-3 text-right font-black text-accent">{formatCurrency(d.valor)}</td>
                        <td className="p-3 text-right opacity-60">{formatCurrency(d.valor / 3)}</td>
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
