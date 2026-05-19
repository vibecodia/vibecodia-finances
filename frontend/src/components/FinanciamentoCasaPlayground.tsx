import {
  format,
  parseISO,
  addMonths,
  differenceInMonths,
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
import { 
  formatCurrency, 
  formatBrazilDate 
} from '../utils/helpers';
import { Select } from './ui/Select';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';


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
  
  const today = useMemo(() => new Date(), []);

  const getStatusByDate = (date: Date): 'Paga' | 'Aberta' | 'Projetada' => {
    if (date <= today) return 'Paga';
    if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
      return 'Aberta';
    }
    return 'Projetada';
  };

  // Manual inputs for simulation
   const [overrideTotalParcelas, setOverrideTotalParcelas] = useState<number | null>(419);
   const [taxaJurosMensal] = useState<number>(0.010303871);
   const [taxaEfetivaAnual] = useState<number>(13.090000000);
   const [numeroContrato] = useState<string>('10197455901');

  // Derived stats base
  const totalParcelas = overrideTotalParcelas || 419;

  // SAC Calculation for Juros vs Principal
  const calculateAdjustedSAC = (totalParcelasContrato: number, taxaMensal: number) => {
    const results: any[] = [];
    
    // 1. Iniciar com o histórico real do Itaú
    ITAU_HISTORY.forEach((item: HistoryItem) => {
      const date = parseISO(item.vencimento);
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
        date: date,
        situacao: getStatusByDate(date),
        operacao: item.operacao
      });
    });

    // 2. Continuar projeção a partir da última parcela do histórico
    const lastReal = results[results.length - 1];
    const initialLength = results.length;
    let currentSaldo = lastReal.saldoDevedor;
    const taxa = taxaMensal;
    const startDate = parseISO(lastReal.vencimento);

    for (let i = initialLength + 1; i <= totalParcelasContrato; i++) {
      const currentMonth = addMonths(startDate, i - initialLength);
      const juros = currentSaldo * taxa;
      
      // No SAC real, a amortização é calculada sobre o saldo devedor atual dividido pelo prazo restante
      const parcelasRestantes = totalParcelasContrato - i + 1;
      const amortizacaoBase = parcelasRestantes > 0 ? currentSaldo / parcelasRestantes : currentSaldo;
      
      const seguros = 177.06 + 47.91; 
      const fgtsSubsidy = i <= 19 ? lastReal.fgtsMensal : 0; 
      
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
        situacao: getStatusByDate(currentMonth)
      });

      if (currentSaldo <= 0) break;
    }
    return results;
  };

  const adjustedSacData = useMemo(() => {
    return calculateAdjustedSAC(totalParcelas, taxaJurosMensal);
  }, [totalParcelas, taxaJurosMensal]);

  // Derived stats dependent on adjustedSacData
  const paidInstallments = useMemo(() => {
    return adjustedSacData.filter((d: any) => d.situacao === 'Paga');
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
    // 1. Buscar transações reais do Consórcio Porto no banco
    const portoTransactions = transactions.filter(t => 
      t.description?.toLowerCase().includes('consórcio porto') &&
      t.status !== 'deleted'
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 2. Dados Reais fornecidos pelo usuário (per carta)
    const quitacaoPerCarta = CONSORCIO_CONFIG.quitacaoPorCarta; // R$ 204.446,37 (89.91%)
    const percentRemaining = 89.91 / 100;
    
    // Valor 100% do contrato (incluindo taxas administrativas diluídas)
    const valorTotalContratoPerCarta = quitacaoPerCarta / percentRemaining;
    const valorTotalContratoTotal = valorTotalContratoPerCarta * 3;
    
    // 3. Calcular o Total Pago (Fluxo de Caixa e progresso)
    const start = CONSORCIO_CONFIG.dataInicio;
    const monthsSinceStart = (today.getFullYear() - start.getFullYear()) * 12 + today.getMonth() - start.getMonth();
    
    // Consideramos os meses decorridos como parcelas pagas/vencidas
    const count = monthsSinceStart; 
    
    // Estimativa de total pago em caixa (fluxo financeiro)
    const avgParcelaPerCarta = (920.54 + 928.28) / 2;
    const totalPaidReal = count * avgParcelaPerCarta * 3;
    
    const totalCredit = CONSORCIO_CONFIG.creditoPorCarta * 3;
    const totalQuitacao = quitacaoPerCarta * 3;

    // Próximo vencimento (dia 16 do mês seguinte ao último pago)
    const nextVencimento = addMonths(start, count);
    
    // Verifica se a parcela do mês atual já foi paga nas transações
    const hasPaidCurrentMonth = portoTransactions.some(t => {
      const d = parseISO(t.date);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });

    const isNextPendente = today >= nextVencimento && !hasPaidCurrentMonth;

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
  }, [transactions, today]);

  // Itau x Consorcio Relation State
  const [consorcioTaxaAdm, setConsorcioTaxaAdm] = useState(12);
  const [consorcioMinContemplacao, setConsorcioMinContemplacao] = useState(40);
  const [consorcioModoUso, setConsorcioModoUso] = useState<'total' | 'uma'>('total');
  const [consorcioIntervaloMeses, setConsorcioIntervaloMeses] = useState(12);
  const [manualContemplacaoDate, setManualContemplacaoDate] = useState<string | null>(null);

  const relationData = useMemo(() => {
    if (!consorcioData) return null;

    const currentSaldoItau = adjustedSacData.find(d => d.parcela === lastParcelaPaga + 1)?.saldoDevedor || 0;
    
    // 1. Projeção de Contemplação
    const targetPaidPercent = consorcioMinContemplacao / 100;
    const remainingPercentToTarget = Math.max(targetPaidPercent - (consorcioData.percentPaidEstimated / 100), 0);
    const amountToTarget = remainingPercentToTarget * consorcioData.valorTotalContrato;
    const monthsToContemplacao = Math.ceil(amountToTarget / consorcioData.avgInstallment);
    
    const projectedContemplacaoDate = manualContemplacaoDate ? parseISO(manualContemplacaoDate) : addMonths(today, monthsToContemplacao);
    
    // Parcela do Itaú na data da contemplação
    const itauParcelaAtContemplacao = adjustedSacData.find(d => {
      const dDate = new Date(d.date);
      return dDate.getMonth() === projectedContemplacaoDate.getMonth() && 
             dDate.getFullYear() === projectedContemplacaoDate.getFullYear();
    });

    const saldoItauAtContemplacao = itauParcelaAtContemplacao?.saldoDevedor || 0;
    const parcelaIndexAtContemplacao = itauParcelaAtContemplacao?.parcela || totalParcelas;

    // 2. Cenário de Amortização
    const liquidoTotal = consorcioData.totalCreditEstimated;
    const liquidoUso = consorcioModoUso === 'total' ? liquidoTotal : liquidoTotal / 3;
    
    const novoSaldoItau = Math.max(saldoItauAtContemplacao - liquidoUso, 0);
    
    // 3. Projeção de Economia (Nova data de quitação)
    // No SAC, se amortizamos o saldo, o número de parcelas diminui drasticamente se mantivermos o valor da amortização
    const amortizacaoBaseAtual = itauParcelaAtContemplacao?.amortizacao || 1451.64;
    const parcelasRestantesOriginal = totalParcelas - parcelaIndexAtContemplacao;
    const novasParcelasRestantes = amortizacaoBaseAtual > 0 ? Math.ceil(novoSaldoItau / amortizacaoBaseAtual) : 0;
    
    const economiaParcelas = Math.max(parcelasRestantesOriginal - novasParcelasRestantes, 0);
    const novaDataQuitacao = addMonths(projectedContemplacaoDate, novasParcelasRestantes);
    
    // Economia de Juros Estimada (Saldo Amortizado * Taxa * Tempo Médio)
    const jurosMensal = taxaJurosMensal;
    const economiaJuros = liquidoUso * jurosMensal * parcelasRestantesOriginal * 0.5; // Estimativa conservadora (0.5 pelo decréscimo do SAC)

    // Cálculo da Sobra de Crédito (Crédito Injetado - Saldo de Quitação)
    const sobraCredito = liquidoUso - saldoItauAtContemplacao;

    // Parcelas do consórcio restantes na data em que o Itaú for quitado
    // Cálculo preciso usando date-fns para evitar erros de sinal ou arredondamento
    const consorcioStart = parseISO('2023-11-16');
    // monthsElapsedAtQuitacao = diferença entre o início (2023) e a quitação (2028+)
    const monthsElapsedAtQuitacao = Math.max(0, (novaDataQuitacao.getFullYear() - consorcioStart.getFullYear()) * 12 + (novaDataQuitacao.getMonth() - consorcioStart.getMonth()));
    
    // O consórcio tem 200 meses no total. 
    // Restam = Total - (Meses de uso até a quitação do Itaú)
    const consorcioRestanteNaQuitacao = Math.max(200 - monthsElapsedAtQuitacao, 0);

    return {
      currentSaldoItau,
      projectedContemplacaoDate,
      saldoItauAtContemplacao,
      parcelaIndexAtContemplacao,
      liquidoUso,
      novoSaldoItau,
      novasParcelasRestantes,
      parcelasRestantesOriginal,
      economiaParcelas,
      novaDataQuitacao,
      economiaJuros,
      percentAtualConsorcio: consorcioData.percentPaidEstimated,
      mesesAteContemplacao: Math.max(0, differenceInMonths(projectedContemplacaoDate, today)),
      consorcioRestante: consorcioRestanteNaQuitacao,
      consorcioRestanteValor: consorcioRestanteNaQuitacao * consorcioData.avgInstallment,
      sobraCredito
    };
  }, [consorcioData, adjustedSacData, lastParcelaPaga, consorcioMinContemplacao, consorcioTaxaAdm, manualContemplacaoDate, taxaJurosMensal, totalParcelas, consorcioModoUso, consorcioIntervaloMeses, today]);

  // Consortium Installments Table Data
  const consorcioInstallmentsData = useMemo(() => {
    if (!consorcioData) return [];
    
    const installments = [];
    const startDate = CONSORCIO_CONFIG.dataInicio;
    const totalCredit = consorcioData.totalCreditEstimated; // R$ 562.113,09
    const count = consorcioData.count; // Meses decorridos
    const currentPercent = CONSORCIO_CONFIG.percentualPagoAtual; // 10.09%
    
    // Distribuição da redução do percentual para garantir que chegue a 100% (falta 0) em 200 meses
    const pastReductionPerMonth = count > 0 ? currentPercent / count : 0;
    const futureReductionPerMonth = (1 - currentPercent) / (200 - count);

    for (let i = 1; i <= 200; i++) {
      const vencimento = addMonths(startDate, i - 1);
      
      let valorMensal = CONSORCIO_CONFIG.valorParcelaAtualTotal;
      if (i === 1) valorMensal = CONSORCIO_CONFIG.valorPrimeiraParcelaTotal;
      else if (i < count) {
        const progress = (i - 1) / (count - 1);
        valorMensal = CONSORCIO_CONFIG.valorPrimeiraParcelaTotal + (CONSORCIO_CONFIG.valorParcelaAtualTotal - CONSORCIO_CONFIG.valorPrimeiraParcelaTotal) * progress;
      }

      // Percentual pago do PLANO
      const percentPaidSoFar = i <= count 
        ? i * pastReductionPerMonth 
        : currentPercent + (i - count) * futureReductionPerMonth;
      
      // Quanto falta para atingir o CRÉDITO LÍQUIDO
      const faltaParaCredito = totalCredit * (1 - Math.min(percentPaidSoFar, 1));

      installments.push({
        parcela: i,
        vencimento: format(vencimento, 'yyyy-MM-dd'),
        valor: valorMensal,
        faltaParaCredito: faltaParaCredito,
        situacao: getStatusByDate(vencimento),
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
        t.category === 'Patrimônio' &&
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
          <p className="text-muted-foreground text-sm mt-2">
            Não encontramos transações com o padrão "Financiamento casa X/Y" na categoria "Patrimônio".
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
    <div className="p-4 border-b font-semibold text-foreground flex items-center justify-between group bg-muted/30 border-border">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm lg:text-base uppercase font-black tracking-tight">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button 
          onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }}
          disabled={index === 0}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 disabled:opacity-0"
          title="Mover para Cima"
        >
          <ArrowUp className="w-4 h-4" />
        </Button>
        <Button 
          onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }}
          disabled={index === layout.length - 1}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 disabled:opacity-0"
          title="Mover para Baixo"
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
        <Button 
          onClick={() => setMaximizedId(id)}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Maximizar"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => toggleCollapse(id)}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title={isCollapsed ? "Expandir" : "Minimizar"}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );

  const renderSection = (item: LayoutItem, index: number) => {
    const isCollapsed = item.collapsed;
    
    switch (item.id) {
      case 'header_summary':
        return (
          <Card key={item.id} noPadding className="overflow-hidden shadow-md">
            {renderCardHeader(item.id, item.label, <Home className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-black text-primary">Contrato {numeroContrato}</h3>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">CARTEIRA HIPOTECARIA | SISTEMA SAC</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase">Débito Automático</span>
                    <span className="px-3 py-1 bg-accent/10 text-accent text-[10px] font-black rounded-full uppercase">Itaú Real Data</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                    <span>Progresso de Quitação</span>
                    <span>{lastParcelaPaga} / {totalParcelas} ({progressPercent.toFixed(1)}%)</span>
                  </div>
                  <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Parcelas Pagas', value: lastParcelaPaga, icon: <CheckCircle2 className="w-4 h-4" /> },
                    { label: 'Taxa Juros (M)', value: `${(taxaJurosMensal * 100).toFixed(4)}%`, icon: <TrendingUp className="w-4 h-4" /> },
                    { label: 'Taxa Efetiva (A)', value: `${taxaEfetivaAnual.toFixed(2)}%`, icon: <TrendingUp className="w-4 h-4" />, highlight: true },
                    { label: 'Vencimento Final', value: formatBrazilDate(lastDate), icon: <Calendar className="w-4 h-4" /> }
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-xl border border-border bg-muted/10 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                        {stat.icon}
                        {stat.label}
                      </div>
                      <div className={`text-sm md:text-base font-black ${stat.highlight ? 'text-primary' : 'text-foreground'}`}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                      <Info className="w-4 h-4 text-primary" />
                      Utilização de FGTS DAMP III aplicada em 06/01/2026: R$ 72.244,05
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                      <AlertCircle className="w-4 h-4" />
                      2 Operações "Pula Parcela" realizadas: +R$ 15.337,21 ao saldo devedor
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Ajustar total parcelas:</label>
                    <Input 
                      type="number"
                      value={totalParcelas}
                      onChange={(e) => setOverrideTotalParcelas(parseInt(e.target.value))}
                      className="w-24 text-center font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
        );

      case 'consorcio_summary':
        return (
          <Card key={item.id} noPadding className="overflow-hidden shadow-md">
            {renderCardHeader(item.id, item.label, <TrendingUp className="w-5 h-5 text-accent" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6 space-y-6">
                {!consorcioData ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center gap-3 text-muted-foreground">
                    <AlertCircle className="w-10 h-10" />
                    <p className="text-sm font-bold">Nenhum dado de Consórcio encontrado</p>
                    <p className="text-[10px]">Verifique transações com "Consórcio Porto" na categoria "Patrimônio".</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                      <div>
                        <h3 className="text-lg font-black text-accent">Grupo Porto Seguro (3 Cartas)</h3>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Início em {formatBrazilDate(format(consorcioData.firstDate, 'yyyy-MM-dd'))}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-accent/10 text-accent text-[10px] font-black rounded-full uppercase">Histórico Reconstruído</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Parcelas Pagas', value: `${consorcioData.count} / 200`, icon: <CheckCircle2 className="w-4 h-4" /> },
                        { label: 'Total Investido', value: formatCurrency(consorcioData.totalPaid), icon: <ArrowUp className="w-4 h-4 text-destructive" />, highlight: true },
                        { label: 'Parcela Atual (3x)', value: formatCurrency(consorcioData.avgInstallment), icon: <TrendingUp className="w-4 h-4" /> },
                        { label: 'Próximo Vencimento', value: formatBrazilDate(format(consorcioData.nextVencimento, 'yyyy-MM-dd')), icon: <Calendar className="w-4 h-4" />, highlight: consorcioData.isNextPendente, status: consorcioData.isNextPendente ? 'Pendente' : 'Projetado' }
                      ].map((stat, i) => (
                        <div key={i} className="p-4 rounded-xl border border-border bg-muted/10 flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                            {stat.icon}
                            {stat.label}
                          </div>
                          <div className={`text-sm md:text-base font-black ${stat.highlight ? 'text-accent' : 'text-foreground'}`}>
                            {stat.value}
                          </div>
                          {stat.status && (
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full w-fit ${stat.status === 'Pendente' ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                              {stat.status}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl border border-border bg-muted/5 space-y-2">
                        <div className="text-[10px] font-black uppercase text-muted-foreground">Crédito Total (Líquido)</div>
                        <div className="text-lg font-black text-primary">{formatCurrency(consorcioData.totalCreditEstimated)}</div>
                        <div className="text-[9px] text-muted-foreground font-bold italic">R$ {formatCurrency(consorcioData.detalhePorCarta.credito)} por carta</div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-muted/5 space-y-2">
                        <div className="text-[10px] font-black uppercase text-muted-foreground">Avanço do Plano</div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-primary/10 rounded-full relative">
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
                        <div className="text-[9px] text-muted-foreground font-bold">Meta Contemplação: {consorcioMinContemplacao}%</div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-muted/5 space-y-2 relative group">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-black uppercase text-muted-foreground">Saldo p/ Quitação (3 Cartas)</div>
                          <Info className="w-3 h-3 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity text-accent" />
                        </div>
                        <div className="text-lg font-black text-destructive">{formatCurrency(consorcioData.totalQuitacao)}</div>
                        <div className="text-[9px] text-muted-foreground font-bold italic">R$ {formatCurrency(consorcioData.detalhePorCarta.quitacao)} cada (89,91%)</div>
                        <div className="text-[8px] font-bold text-accent bg-accent/5 p-1 rounded border border-accent/10 mt-1">
                          * Inclui taxa de administração de {consorcioTaxaAdm}% e encargos contratuais.
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        );

      case 'itau_consorcio_relation':
        return (
          <Card key={item.id} noPadding className="overflow-hidden shadow-md">
            {renderCardHeader(item.id, item.label, <TrendingUp className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="p-6 space-y-8">
                {!relationData ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center gap-3 text-muted-foreground">
                    <AlertCircle className="w-10 h-10" />
                    <p className="text-sm font-bold">Aguardando dados do Consórcio</p>
                    <p className="text-[10px]">A relação depende de dados reais do Consórcio Porto.</p>
                  </div>
                ) : (
                  <>
                    {/* 1. Painel de Controle Estratégico */}
                    <div className="bg-muted/10 p-5 rounded-2xl border border-border space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <Info className="w-4 h-4 text-primary" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Parâmetros de Simulação Estratégica</h4>
                      </div>
                      
                      <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[140px] space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5 ml-1 h-4">
                            Taxa Adm (%) <Info className="w-3 h-3 opacity-40" />
                          </label>
                          <Input 
                            type="number" 
                            value={consorcioTaxaAdm} 
                            onChange={(e) => setConsorcioTaxaAdm(Number(e.target.value))}
                            className="font-bold py-2.5"
                          />
                        </div>
                        <div className="flex-1 min-w-[140px] space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5 ml-1 h-4">
                            Gatilho (%)
                          </label>
                          <Input 
                            type="number" 
                            value={consorcioMinContemplacao} 
                            onChange={(e) => setConsorcioMinContemplacao(Number(e.target.value))}
                            className="font-bold py-2.5"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-[160px] space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5 ml-1 h-4">
                            Fixar Data (Manual)
                          </label>
                          <Input
                            type="date" 
                            value={manualContemplacaoDate || ''} 
                            onChange={(e) => setManualContemplacaoDate(e.target.value || null)}
                            className="font-bold py-2.5"
                          />
                        </div>

                        <div className="flex-1 min-w-[200px] space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5 ml-1 h-4">
                            Modo de Utilização
                          </label>
                          <Select
                            value={consorcioModoUso}
                            onChange={(e) => setConsorcioModoUso(e.target.value as any)}
                            className="font-bold py-2.5"
                          >
                            <option value="total">Crédito Total (3 Cartas)</option>
                            <option value="uma">Faseado (1 Carta p/ vez)</option>
                          </Select>
                        </div>
                        
                        {consorcioModoUso === 'uma' && (
                          <div className="flex-1 min-w-[120px] space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                            <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5 ml-1 h-4">Intervalo</label>
                            <Input 
                              type="number" 
                              min="1" 
                              max="24"
                              value={consorcioIntervaloMeses} 
                              onChange={(e) => setConsorcioIntervaloMeses(Number(e.target.value))}
                              className="font-bold py-2.5"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Timeline de Eventos */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Coluna 1: O Evento (Contemplação) */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black text-xs">1</div>
                          <h4 className="text-xs font-black uppercase text-muted-foreground opacity-60">O Gatilho: Contemplação</h4>
                        </div>
                        <div className="p-5 rounded-2xl border-2 border-accent/20 bg-accent/[0.02] space-y-4">
                          <div>
                            <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50 block mb-1">Data Estimada do Aporte</span>
                            <span className="text-2xl font-black text-accent">{formatBrazilDate(format(relationData.projectedContemplacaoDate, 'yyyy-MM-dd'))}</span>
                            <p className="text-[10px] font-bold text-muted-foreground opacity-60 mt-1">Daqui a ~{relationData.mesesAteContemplacao} meses de contribuição</p>
                          </div>
                          <div className="pt-4 border-t border-accent/10 flex justify-between items-center">
                            <div>
                              <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50 block">Crédito Injetado</span>
                              <span className="text-lg font-black text-primary">{formatCurrency(relationData.liquidoUso)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50 block">Modo</span>
                              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded-full uppercase">
                                {consorcioModoUso === 'total' ? 'Aporte Único' : 'Aporte Parcial'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Coluna 2: Impacto no Financiamento */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">2</div>
                          <h4 className="text-xs font-black uppercase text-muted-foreground opacity-60">Impacto no Itaú</h4>
                        </div>
                        <div className="p-5 rounded-2xl border border-border bg-muted/5 space-y-5">
                          <div>
                            <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50 block mb-1">Saldo na Data</span>
                            <span className="text-sm font-black text-muted-foreground opacity-60 line-through">{formatCurrency(relationData.saldoItauAtContemplacao)}</span>
                          </div>
                          
                          <div className="pt-2">
                            <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50 block mb-1">Novo Saldo Itaú</span>
                            <span className="text-xl font-black text-green-600">{formatCurrency(relationData.novoSaldoItau)}</span>
                          </div>
                          
                          <div className="p-3 bg-green-500/5 rounded-xl border border-green-500/10 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase">
                              <span className="text-green-600">Economia de Tempo</span>
                              <span className="text-green-600">-{relationData.economiaParcelas} meses</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-muted-foreground opacity-60">Parcelas Restantes:</span>
                              <span className="text-[10px] font-black text-foreground">{relationData.novasParcelasRestantes} (eram {relationData.parcelasRestantesOriginal})</span>
                            </div>
                          </div>

                          <div className="pt-2">
                            <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50 block mb-1">Economia Estimada de Juros</span>
                            <div className="flex items-center gap-2 text-primary">
                              <ArrowDown className="w-4 h-4" />
                              <span className="text-xl font-black">{formatCurrency(relationData.economiaJuros)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Coluna 3: Resultado Consolidado */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-black text-xs">3</div>
                          <h4 className="text-xs font-black uppercase text-muted-foreground opacity-60">Status Pós-Ação</h4>
                        </div>
                        <div className="p-5 rounded-2xl bg-muted/20 border border-border space-y-5 flex flex-col justify-between h-[300px]">
                          <div className="space-y-4">
                            <div>
                              <span className="text-[10px] font-black uppercase text-primary opacity-70 block mb-1">Quitação Itaú</span>
                              <span className="text-lg font-black text-foreground">{formatBrazilDate(format(relationData.novaDataQuitacao, 'yyyy-MM-dd'))}</span>
                              <p className="text-[9px] font-bold text-muted-foreground opacity-60">Antecipação drástica do contrato SAC</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-black uppercase text-accent opacity-70 block mb-1">Restante Consórcio</span>
                              <span className="text-lg font-black text-foreground">{relationData.consorcioRestante} parcelas</span>
                              <p className="text-[9px] font-bold text-accent italic">Total a pagar: {formatCurrency(relationData.consorcioRestanteValor)}</p>
                            </div>
                            <div className="pt-2 border-t border-border/30">
                              <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50 block mb-1">Sobra de Crédito (Cashback)</span>
                              <span className={`text-lg font-black ${relationData.sobraCredito >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                {formatCurrency(relationData.sobraCredito)}
                              </span>
                              <p className="text-[9px] font-bold text-muted-foreground opacity-60">Crédito Injetado - Quitação Itaú</p>
                            </div>
                          </div>
                          
                          <div className="pt-4 border-t border-border">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50">Eficiência da Operação</span>
                              <span className="text-[10px] font-black text-primary">ALTA</span>
                            </div>
                            <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: '85%' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nota de Rodapé Profissional */}
                    <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-[10px] font-medium leading-relaxed text-muted-foreground opacity-70">
                        <span className="font-black text-primary uppercase mr-1">Nota Técnica:</span> 
                        Esta simulação considera a manutenção do valor de amortização base do Itaú após o aporte do consórcio. 
                        A economia de juros é uma estimativa baseada no saldo devedor amortizado e no custo de oportunidade do capital. 
                        Valores reais podem variar conforme taxas de seguros e correções monetárias (TR) não previstas nesta projeção.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        );

      case 'installments_table':
        return (
          <Card key={item.id} noPadding className="overflow-hidden shadow-md">
            {renderCardHeader(item.id, item.label, <Calendar className="w-5 h-5 text-primary" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] md:text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-foreground">
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider">Parcela</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider">Vencimento</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider text-right">Amort.</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider text-right">Juros</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider text-right">Seguros</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider text-right text-blue-500">FGTS Sub.</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider text-right text-primary">Total Pago</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider text-right">Saldo Dev.</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider text-center">Observação</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {adjustedSacData.map((d: any) => (
                      <tr key={d.parcela} className={cn(
                        "text-foreground hover:bg-primary/5 transition-colors",
                        d.situacao === 'Aberta' && 'bg-amber-500/5',
                        d.situacao === 'Projetada' && 'opacity-70',
                        d.operacao && 'bg-primary/5'
                      )}>
                        <td className="p-3 font-bold">{d.parcela}</td>
                        <td className="p-3 text-muted-foreground">{formatBrazilDate(d.vencimento)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(d.amortizacao)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(d.juros)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(d.seguros)}</td>
                        <td className="p-3 text-right font-mono text-blue-500">{d.fgtsMensal > 0 ? `-${formatCurrency(d.fgtsMensal)}` : '-'}</td>
                        <td className="p-3 text-right font-mono font-black text-primary">{formatCurrency(d.total)}</td>
                        <td className="p-3 text-right font-mono font-medium text-muted-foreground">{formatCurrency(d.saldoDevedor)}</td>
                        <td className="p-3 text-center">
                          {d.operacao && (
                            <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <AlertCircle className="w-3 h-3" />
                              {d.operacao}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                            d.situacao === 'Paga' ? 'bg-green-500/20 text-green-600' : 
                            d.situacao === 'Aberta' ? 'bg-amber-500/20 text-amber-600' : 
                            'bg-muted text-muted-foreground'
                          )}>
                            {d.situacao}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );

      case 'consorcio_installments_table':
        return (
          <Card key={item.id} noPadding className="overflow-hidden shadow-md">
            {renderCardHeader(item.id, item.label, <Calendar className="w-5 h-5 text-accent" />, index, isCollapsed)}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] md:text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-foreground">
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider">Parcela</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider">Vencimento</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider text-right text-accent">Valor (3 Cartas)</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider text-right">Valor Individual</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider text-right text-primary">Falta p/ Crédito</th>
                      <th className="p-3 border-b border-border font-bold uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {consorcioInstallmentsData.map((d: any) => (
                      <tr key={d.parcela} className={cn(
                        "text-foreground hover:bg-primary/5 transition-colors",
                        d.situacao === 'Aberta' && 'bg-amber-500/5',
                        d.situacao === 'Projetada' && 'opacity-70'
                      )}>
                        <td className="p-3 font-bold">{d.parcela} / 200</td>
                        <td className="p-3 text-muted-foreground">{formatBrazilDate(d.vencimento)}</td>
                        <td className="p-3 text-right font-black text-accent">{formatCurrency(d.valor)}</td>
                        <td className="p-3 text-right text-muted-foreground opacity-60">{formatCurrency(d.valor / 3)}</td>
                        <td className="p-3 text-right font-black text-primary">{formatCurrency(d.faltaParaCredito)}</td>
                        <td className="p-3 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                            d.situacao === 'Paga' ? 'bg-green-500/20 text-green-600' : 
                            d.situacao === 'Aberta' ? 'bg-amber-500/20 text-amber-600' : 
                            'bg-muted text-muted-foreground'
                          )}>
                            {d.situacao}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
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
            className="w-full h-full bg-card rounded-3xl border shadow-2xl flex flex-col overflow-hidden"
            style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBackground }}
          >
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: theme.cardBorder }}>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-foreground">
                  {layout.find(i => i.id === maximizedId)?.label}
                </span>
              </div>
              <button 
                onClick={() => setMaximizedId(null)}
                className="p-2 hover:bg-muted rounded-xl transition-colors text-foreground"
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
