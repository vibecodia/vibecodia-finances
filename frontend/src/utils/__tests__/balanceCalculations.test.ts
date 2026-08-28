import { describe, it, expect } from "vitest";

import { Transaction, SavingsGoal, Category, SavingsContribution } from "../../types";
import {
  calculateBalances,
  calculateRemainingBalance,
} from "../balanceCalculations";

const createTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "tx-default",
  description: "Teste",
  amount: 100,
  type: "expense",
  date: "2026-08-01",
  category: "cat-outros",
  isPaid: true,
  status: "active",
  recurrence: "none",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

const createContribution = (
  overrides: Partial<SavingsContribution> = {},
): SavingsContribution => ({
  id: "contrib-default",
  amount: 100,
  date: "2026-08-01",
  type: "deposit",
  isPaid: true,
  status: "active",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

describe("balanceCalculations", () => {
  const mockCategories: Category[] = [
    {
      _id: "cat-aporte",
      name: "Aporte",
      code: "aporte",
      type: "expense",
      color: "#00ff00",
      isSavingsContribution: true,
    },
    {
      _id: "cat-resgate",
      name: "Resgate",
      code: "resgate_meta",
      type: "income",
      color: "#0000ff",
      isSavingsWithdrawal: true,
    },
    {
      _id: "cat-salario",
      name: "Salário",
      code: "salario",
      type: "income",
      color: "#ffff00",
    },
    {
      _id: "cat-alimentacao",
      name: "Alimentação",
      code: "alimentacao",
      type: "expense",
      color: "#ff0000",
    },
  ];

  it("retorna zeros quando não há transações nem metas", () => {
    const balances = calculateBalances([], [], new Date("2026-08-15"));
    expect(balances.totalBalance).toBe(0);
    expect(balances.currentMonthBalance).toBe(0);
    expect(balances.previousBalance).toBe(0);
    expect(balances.projectedBalance).toBe(0);
    expect(balances.pendingBalance).toBe(0);
    expect(balances.adjustedBalance).toBe(0);
  });

  it("soma receitas e despesas pagas corretamente dentro do mês", () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: "tx-1",
        description: "Salário",
        amount: 5000,
        type: "income",
        date: "2026-08-05",
        isPaid: true,
        category: "cat-salario",
      }),
      createTransaction({
        id: "tx-2",
        description: "Supermercado",
        amount: 1200,
        type: "expense",
        date: "2026-08-10",
        isPaid: true,
        category: "cat-alimentacao",
      }),
    ];

    const balances = calculateBalances(
      transactions,
      [],
      new Date("2026-08-15"),
      mockCategories,
    );

    // 5000 - 1200 = 3800
    expect(balances.totalBalance).toBe(3800);
    expect(balances.currentMonthBalance).toBe(3800);
    expect(balances.previousBalance).toBe(0);
    expect(balances.projectedBalance).toBe(3800);
    expect(balances.adjustedBalance).toBe(3800);
  });

  it("ignora transações com status 'deleted'", () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: "tx-1",
        description: "Salário",
        amount: 5000,
        type: "income",
        date: "2026-08-05",
        isPaid: true,
      }),
      createTransaction({
        id: "tx-2",
        description: "Compra cancelada",
        amount: 2000,
        type: "expense",
        date: "2026-08-10",
        isPaid: true,
        status: "deleted", // Deletada!
      }),
    ];

    const balances = calculateBalances(transactions, [], new Date("2026-08-15"));
    expect(balances.totalBalance).toBe(5000);
    expect(balances.currentMonthBalance).toBe(5000);
  });

  it("inclui transações pendentes no projectedBalance mas não no totalBalance", () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: "tx-1",
        description: "Salário Recebido",
        amount: 4000,
        type: "income",
        date: "2026-08-05",
        isPaid: true,
      }),
      createTransaction({
        id: "tx-2",
        description: "Aluguel Pendente",
        amount: 1500,
        type: "expense",
        date: "2026-08-25",
        isPaid: false, // Pendente!
      }),
    ];

    const balances = calculateBalances(transactions, [], new Date("2026-08-15"));
    expect(balances.totalBalance).toBe(4000); // Apenas a paga
    expect(balances.pendingBalance).toBe(-1500); // Pendente de despesa
    expect(balances.projectedBalance).toBe(2500); // 4000 - 1500
  });

  it("exclui movimentações de metas de transações para evitar contagem dupla e deduz via totalGoalsImpact", () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: "tx-1",
        description: "Salário",
        amount: 6000,
        type: "income",
        date: "2026-08-01",
        isPaid: true,
        category: "cat-salario",
      }),
      createTransaction({
        id: "tx-aporte",
        description: "Aporte Meta Carro",
        amount: 1000,
        type: "expense",
        date: "2026-08-10",
        isPaid: true,
        category: "cat-aporte",
        savingsGoalId: "goal-carro",
      }),
    ];

    const goals: SavingsGoal[] = [
      {
        id: "goal-carro",
        name: "Carro Novo",
        targetAmount: 20000,
        currentAmount: 1000,
        status: "active",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
        contributions: [
          createContribution({
            id: "c-1",
            amount: 1000,
            date: "2026-08-10",
            type: "deposit",
            isPaid: true,
          }),
        ],
      },
    ];

    const balances = calculateBalances(
      transactions,
      goals,
      new Date("2026-08-15"),
      mockCategories,
    );

    // O totalBalance bancário é 6000 (a transação de aporte foi excluída do saldo comum para não contar duas vezes)
    expect(balances.totalBalance).toBe(6000);
    // O adjustedBalance desconta o impacto da meta: 6000 - 1000 = 5000
    expect(balances.adjustedBalance).toBe(5000);
  });

  it("calcula calculateRemainingBalance fielmente", () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: "tx-1",
        description: "Entrada",
        amount: 3500,
        type: "income",
        date: "2026-08-01",
        isPaid: true,
      }),
      createTransaction({
        id: "tx-2",
        description: "Saída",
        amount: 500,
        type: "expense",
        date: "2026-08-05",
        isPaid: true,
      }),
    ];

    expect(calculateRemainingBalance(transactions, new Date("2026-08-15"))).toBe(
      3000,
    );
  });
});
