import { describe, it, expect } from "vitest";

import { Category, Transaction } from "../../types";
import {
  getBenefitCode,
  isBenefitTransaction,
  isSavingsContribution,
  isSavingsWithdrawal,
} from "../categoryUtils";

describe("categoryUtils - Benefit Detection & Savings Helpers", () => {
  const categories: Category[] = [
    {
      id: "cat-vale",
      name: "Vale",
      code: "vale",
      type: "income",
      isBenefit: true,
    },
    {
      id: "cat-salario",
      name: "Salário",
      code: "salario",
      type: "income",
      isBenefit: false,
    },
    {
      id: "pm-flash",
      name: "Flash",
      code: "flash",
      type: "payment_method",
      isBenefit: true,
    },
    {
      id: "pm-nubank",
      name: "Nubank",
      code: "nubank",
      type: "payment_method",
      isBenefit: false,
    },
    {
      id: "cat-aporte",
      name: "Aporte",
      code: "aporte",
      type: "expense",
      isSavingsContribution: true,
    },
    {
      id: "cat-resgate",
      name: "Resgate de Meta",
      code: "resgate_meta",
      type: "income",
      isSavingsWithdrawal: true,
    },
  ];

  it("detecta benefício quando o paymentMethod tem isBenefit: true", () => {
    const tx: Pick<Transaction, "description" | "category" | "paymentMethod"> = {
      description: "Almoço restaurante",
      category: "Alimentação",
      paymentMethod: "Flash",
    };
    expect(isBenefitTransaction(tx, categories)).toBe(true);
    expect(getBenefitCode(tx, categories)).toBe("flash");
  });

  it("detecta benefício quando a CATEGORIA da receita tem isBenefit: true", () => {
    const tx: Pick<Transaction, "description" | "category" | "paymentMethod"> = {
      description: "Crédito de Benefício Mensal",
      category: "Vale",
    };
    expect(isBenefitTransaction(tx, categories)).toBe(true);
    expect(getBenefitCode(tx, categories)).toBe("vale");
  });

  it("não detecta benefício para receita ou despesa comum", () => {
    const txIncome: Pick<Transaction, "description" | "category" | "paymentMethod"> = {
      description: "Salário Empresa",
      category: "Salário",
      paymentMethod: "Nubank",
    };
    expect(isBenefitTransaction(txIncome, categories)).toBe(false);
    expect(getBenefitCode(txIncome, categories)).toBe(null);

    const txExpense: Pick<Transaction, "description" | "category" | "paymentMethod"> = {
      description: "Supermercado",
      category: "Mercado",
      paymentMethod: "Nubank",
    };
    expect(isBenefitTransaction(txExpense, categories)).toBe(false);
    expect(getBenefitCode(txExpense, categories)).toBe(null);
  });

  it("identifica corretamente categorias de aporte e resgate de metas", () => {
    expect(isSavingsContribution("Aporte", categories)).toBe(true);
    expect(isSavingsContribution("Salário", categories)).toBe(false);

    expect(isSavingsWithdrawal("Resgate de Meta", categories)).toBe(true);
    expect(isSavingsWithdrawal("Vale", categories)).toBe(false);
  });
});
