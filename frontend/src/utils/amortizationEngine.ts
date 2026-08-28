import { addMonths, format, parseISO } from "date-fns";

export interface HistoryItem {
  parcela: number;
  vencimento: string;
  amortizacao: number;
  juros: number;
  seguroMIP: number;
  seguroDFI: number;
  fgtsMensal: number;
  situacao: "Paga" | "Aberta" | "Projetada";
  total: number;
  saldoDevedor: number;
  operacao?: string;
}

export interface SACInstallment {
  parcela: number;
  vencimento: string;
  amortizacao: number;
  extraAmount?: number;
  juros: number;
  seguros: number;
  fgtsMensal: number;
  total: number;
  saldoDevedor: number;
  date: Date;
  situacao: string;
  operacao?: string;
}

export interface ConsorcioInstallment {
  parcela: number;
  vencimento: string;
  valor: number;
  faltaParaCredito: number;
  situacao: string;
  date: Date;
}

export function getStatusByDate(date: Date, referenceDate: Date = new Date()): string {
  return date < referenceDate ? "Paga" : "Projetada";
}

export function calculateAdjustedSAC(
  history: HistoryItem[],
  totalParcelasContrato: number,
  taxaMensal: number,
  referenceDate: Date = new Date(),
): SACInstallment[] {
  const results: SACInstallment[] = [];

  history.forEach((item) => {
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
      situacao: item.situacao || getStatusByDate(date, referenceDate),
      operacao: item.operacao,
    });
  });

  if (results.length === 0) return results;

  const lastReal = results[results.length - 1];
  const initialLength = results.length;
  let currentSaldo = lastReal.saldoDevedor;
  const startDate = parseISO(lastReal.vencimento);

  for (let i = initialLength + 1; i <= totalParcelasContrato; i++) {
    const currentMonth = addMonths(startDate, i - initialLength);
    const juros = currentSaldo * taxaMensal;

    const parcelasRestantes = totalParcelasContrato - i + 1;
    const amortizacaoBase =
      parcelasRestantes > 0 ? currentSaldo / parcelasRestantes : currentSaldo;

    const seguros = 177.06 + 47.91;
    const fgtsSubsidy = i <= 19 ? lastReal.fgtsMensal : 0;

    currentSaldo = Math.max(currentSaldo - amortizacaoBase, 0);

    results.push({
      parcela: i,
      vencimento: format(currentMonth, "yyyy-MM-dd"),
      amortizacao: amortizacaoBase,
      extraAmount: 0,
      juros: juros,
      seguros: seguros,
      fgtsMensal: fgtsSubsidy,
      total: Math.max(amortizacaoBase + juros + seguros - fgtsSubsidy, 0),
      saldoDevedor: currentSaldo,
      date: currentMonth,
      situacao: getStatusByDate(currentMonth, referenceDate),
    });

    if (currentSaldo <= 0) break;
  }

  return results;
}

export function calculateConsorcioProjections(
  totalParcelas: number,
  valorParcela: number,
  mesContemplacao: number,
  startDate: Date = new Date(),
  referenceDate: Date = new Date(),
): ConsorcioInstallment[] {
  const installments: ConsorcioInstallment[] = [];

  for (let i = 1; i <= totalParcelas; i++) {
    const installmentDate = addMonths(startDate, i - 1);
    const faltaParaCredito = Math.max(0, mesContemplacao - i);

    installments.push({
      parcela: i,
      vencimento: format(installmentDate, "yyyy-MM-dd"),
      valor: valorParcela,
      faltaParaCredito,
      situacao: getStatusByDate(installmentDate, referenceDate),
      date: installmentDate,
    });
  }

  return installments;
}
