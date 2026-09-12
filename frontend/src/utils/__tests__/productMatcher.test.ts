import { describe, expect, it } from "vitest";
import {
  calculateItemSimilarity,
  clusterTransactionsItems,
  parseItemSignature,
} from "../productMatcher";
import { Transaction } from "../../types";

describe("productMatcher", () => {
  it("should parse signatures and match abbreviations like marg bec 500g and margarina becel 500g", () => {
    const sig1 = parseItemSignature("MARGARINA BECEL 500G");
    const sig2 = parseItemSignature("MARG BEC 500G");

    expect(sig1.size).toBe("500g");
    expect(sig2.size).toBe("500g");

    const similarity = calculateItemSimilarity(sig1, sig2);
    expect(similarity).toBeGreaterThanOrEqual(0.75);
  });

  it("should correctly identify weighed products like tomate carmem kg and tom carmem", () => {
    const sig1 = parseItemSignature("TOMATE CARMEM KG");
    const sig2 = parseItemSignature("TOM CARMEM", 0.54);

    expect(sig1.isWeighed).toBe(true);
    expect(sig2.isWeighed).toBe(true);

    const similarity = calculateItemSimilarity(sig1, sig2);
    expect(similarity).toBeGreaterThanOrEqual(0.75);
  });

  it("should NOT merge different sizes of the same product", () => {
    const sig1 = parseItemSignature("COCA COLA 350ML");
    const sig2 = parseItemSignature("COCA COLA 2L");

    const similarity = calculateItemSimilarity(sig1, sig2);
    expect(similarity).toBe(0);
  });

  it("should NOT merge conflicting qualifiers like integral vs desnatado", () => {
    const sig1 = parseItemSignature("LEITE INTEGRAL PIRACANJUBA 1L");
    const sig2 = parseItemSignature("LEITE DESNATADO PIRACANJUBA 1L");

    const similarity = calculateItemSimilarity(sig1, sig2);
    expect(similarity).toBe(0);
  });

  it("should cluster transactions with nested variants", () => {
    const mockTransactions: Transaction[] = [
      {
        id: "t1",
        date: "2026-01-10",
        type: "expense",
        amount: 8.99,
        description: "Supermercado Condor",
        category: "Alimentação",
        isPaid: true,
        recurrence: "none",
        createdAt: "2026-01-10T10:00:00.000Z",
        updatedAt: "2026-01-10T10:00:00.000Z",
        notes: JSON.stringify({
          items: [
            {
              description: "MARGARINA BECEL 500G",
              unitPrice: 8.99,
              qty: 1,
            },
          ],
        }),
      },
      {
        id: "t2",
        date: "2026-02-15",
        type: "expense",
        amount: 9.49,
        description: "Bistek Supermercados",
        category: "Alimentação",
        isPaid: true,
        recurrence: "none",
        createdAt: "2026-02-15T10:00:00.000Z",
        updatedAt: "2026-02-15T10:00:00.000Z",
        notes: JSON.stringify({
          items: [
            {
              description: "MARG BEC 500G",
              unitPrice: 9.49,
              qty: 1,
            },
          ],
        }),
      },
      {
        id: "t3",
        date: "2026-03-01",
        type: "expense",
        amount: 4.5,
        description: "Hortifruti Central",
        category: "Alimentação",
        isPaid: true,
        recurrence: "none",
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-01T10:00:00.000Z",
        notes: JSON.stringify({
          items: [
            {
              description: "TOMATE CARMEM KG",
              unitPrice: 8.99,
              qty: 0.5,
              totalPrice: 4.5,
            },
          ],
        }),
      },
    ];

    const clusters = clusterTransactionsItems(mockTransactions, false);

    // Expecting 2 clusters: Margarina Becel 500g and Tomate Carmem
    expect(clusters.length).toBe(2);

    const becelCluster = clusters.find((c) =>
      c.displayName.toLowerCase().includes("becel"),
    );
    expect(becelCluster).toBeDefined();
    expect(becelCluster!.totalPurchases).toBe(2);
    expect(becelCluster!.variantCount).toBe(2);
    expect(becelCluster!.stats.min).toBe(8.99);
    expect(becelCluster!.stats.max).toBe(9.49);
    expect(becelCluster!.stats.priceTrend).toBe("up");

    // Check nested variants inside becelCluster
    expect(becelCluster!.variants.some((v) => v.originalName === "MARGARINA BECEL 500G")).toBe(true);
    expect(becelCluster!.variants.some((v) => v.originalName === "MARG BEC 500G")).toBe(true);
  });
});
