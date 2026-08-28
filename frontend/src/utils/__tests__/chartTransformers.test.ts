import { describe, it, expect } from "vitest";

import { Category, Transaction } from "../../types";
import {
  buildCategoryDistributionChartData,
  buildPaymentMethodDistributionChartData,
} from "../chartTransformers";

describe("chartTransformers", () => {
  const mockCategories: Category[] = [
    {
      _id: "cat-1",
      name: "Alimentação",
      code: "alimentacao",
      type: "expense",
      color: "#ff0000",
    },
    {
      _id: "cat-2",
      name: "Transporte",
      code: "transporte",
      type: "expense",
      color: "#0000ff",
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: "tx-1",
      description: "Supermercado",
      amount: 150,
      type: "expense",
      date: "2026-08-01",
      category: "cat-1",
      paymentMethod: "pix",
      isPaid: true,
      status: "active",
      recurrence: "none",
      createdAt: "2026-08-01",
      updatedAt: "2026-08-01",
    },
    {
      id: "tx-2",
      description: "Padaria",
      amount: 50,
      type: "expense",
      date: "2026-08-02",
      category: "cat-1",
      paymentMethod: "credit_card",
      isPaid: true,
      status: "active",
      recurrence: "none",
      createdAt: "2026-08-02",
      updatedAt: "2026-08-02",
    },
    {
      id: "tx-3",
      description: "Uber",
      amount: 40,
      type: "expense",
      date: "2026-08-03",
      category: "cat-2",
      paymentMethod: "pix",
      isPaid: true,
      status: "active",
      recurrence: "none",
      createdAt: "2026-08-03",
      updatedAt: "2026-08-03",
    },
  ];

  it("agrupa totais de categorias e retorna labels e datasets formatados", () => {
    const result = buildCategoryDistributionChartData(
      mockTransactions,
      mockCategories,
      "#1e293b",
    );

    expect(result.labels).toContain("Alimentação");
    expect(result.labels).toContain("Transporte");

    const alimentacaoIndex = result.labels.indexOf("Alimentação");
    const transporteIndex = result.labels.indexOf("Transporte");

    expect(result.datasets[0].data[alimentacaoIndex]).toBe(200); // 150 + 50
    expect(result.datasets[0].data[transporteIndex]).toBe(40);
    expect(result.datasets[0].borderColor).toBe("#1e293b");
  });

  it("agrupa totais por meio de pagamento corretamente", () => {
    const result = buildPaymentMethodDistributionChartData(
      mockTransactions,
      "#000000",
    );

    expect(result.labels.length).toBeGreaterThan(0);
    expect(result.datasets[0].borderWidth).toBe(2);
    expect(result.datasets[0].borderColor).toBe("#000000");
  });
});
