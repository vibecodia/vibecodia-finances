import { describe, it, expect, beforeEach } from "vitest";

import { Transaction, SavingsGoal } from "../../../types";
import { guestStorageAdapter } from "../guestStorageAdapter";

describe("guestStorageAdapter", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const mockLocalStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it("retorna array vazio quando não há transações salvas", () => {
    expect(guestStorageAdapter.getTransactions()).toEqual([]);
  });

  it("salva e recupera transações com fidelidade", () => {
    const mockTransactions: Transaction[] = [
      {
        id: "tx-1",
        description: "Almoço",
        amount: 45,
        type: "expense",
        date: "2026-08-01",
        category: "cat-1",
        isPaid: true,
        status: "active",
        recurrence: "none",
        createdAt: "2026-08-01",
        updatedAt: "2026-08-01",
      },
    ];
    guestStorageAdapter.saveTransactions(mockTransactions);
    expect(guestStorageAdapter.getTransactions()).toEqual(mockTransactions);
  });

  it("salva e recupera metas com fidelidade", () => {
    const mockGoals: SavingsGoal[] = [
      {
        id: "g-1",
        name: "Viagem",
        targetAmount: 5000,
        currentAmount: 0,
        status: "active",
        contributions: [],
        createdAt: "2026-08-01",
        updatedAt: "2026-08-01",
      },
    ];
    guestStorageAdapter.saveGoals(mockGoals);
    expect(guestStorageAdapter.getGoals()).toEqual(mockGoals);
  });

  it("limpa todo o armazenamento do convidado com clearAll", () => {
    guestStorageAdapter.saveTransactions([
      {
        id: "tx-1",
        description: "Teste",
        amount: 10,
        type: "expense",
        date: "2026-08-01",
        category: "cat-1",
        isPaid: true,
        status: "active",
        recurrence: "none",
        createdAt: "2026-08-01",
        updatedAt: "2026-08-01",
      },
    ]);
    guestStorageAdapter.saveGoals([
      {
        id: "g-1",
        name: "Teste",
        targetAmount: 100,
        currentAmount: 0,
        status: "active",
        contributions: [],
        createdAt: "2026-08-01",
        updatedAt: "2026-08-01",
      },
    ]);

    guestStorageAdapter.clearAll();

    expect(guestStorageAdapter.getTransactions()).toEqual([]);
    expect(guestStorageAdapter.getGoals()).toEqual([]);
  });
});
