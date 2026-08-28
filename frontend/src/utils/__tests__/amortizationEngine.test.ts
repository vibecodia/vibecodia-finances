import { describe, it, expect } from "vitest";

import {
  calculateAdjustedSAC,
  calculateConsorcioProjections,
  HistoryItem,
} from "../amortizationEngine";

describe("amortizationEngine", () => {
  const mockHistory: HistoryItem[] = [
    {
      parcela: 1,
      vencimento: "2025-07-26",
      amortizacao: 1000,
      juros: 5000,
      seguroMIP: 150,
      seguroDFI: 50,
      fgtsMensal: 0,
      situacao: "Paga",
      total: 6200,
      saldoDevedor: 500000,
    },
    {
      parcela: 2,
      vencimento: "2025-08-26",
      amortizacao: 1000,
      juros: 4990,
      seguroMIP: 150,
      seguroDFI: 50,
      fgtsMensal: 0,
      situacao: "Paga",
      total: 6190,
      saldoDevedor: 499000,
    },
  ];

  it("retorna array vazio quando histórico é vazio", () => {
    const result = calculateAdjustedSAC([], 10, 0.01);
    expect(result).toEqual([]);
  });

  it("calcula projeção SAC decrescendo juros conforme saldo devedor reduz", () => {
    const totalParcelas = 5;
    const taxa = 0.01; // 1% ao mês
    const result = calculateAdjustedSAC(mockHistory, totalParcelas, taxa);

    expect(result.length).toBe(5);
    // Parcelas 1 e 2 vieram do histórico real
    expect(result[0].parcela).toBe(1);
    expect(result[0].saldoDevedor).toBe(500000);
    expect(result[1].parcela).toBe(2);
    expect(result[1].saldoDevedor).toBe(499000);

    // Parcelas 3, 4 e 5 foram projetadas
    expect(result[2].parcela).toBe(3);
    expect(result[2].saldoDevedor).toBeLessThan(result[1].saldoDevedor);
    expect(result[3].juros).toBeLessThan(result[2].juros);
  });

  it("projeta parcelas de consórcio calculando meses restantes para contemplação", () => {
    const totalParcelas = 10;
    const valorParcela = 2500;
    const mesContemplacao = 4;
    const startDate = new Date("2026-01-15");

    const result = calculateConsorcioProjections(
      totalParcelas,
      valorParcela,
      mesContemplacao,
      startDate,
    );

    expect(result.length).toBe(10);
    expect(result[0].faltaParaCredito).toBe(3); // 4 - 1
    expect(result[1].faltaParaCredito).toBe(2); // 4 - 2
    expect(result[3].faltaParaCredito).toBe(0); // Mês 4: contemplado!
    expect(result[4].faltaParaCredito).toBe(0); // Após contemplação permanece 0
  });
});
