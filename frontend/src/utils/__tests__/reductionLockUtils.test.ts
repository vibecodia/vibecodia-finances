import { describe, it, expect } from "vitest";

import { ReductionLockConfig } from "../../types/reductionLock";
import {
  getDefaultWeeksForMonth,
  formatWeekDateRange,
  getNextMonthString,
  getPreviousMonthString,
  checkExpenseReductionAlert,
  copyPlanToNextMonth,
} from "../reductionLockUtils";

describe("reductionLockUtils", () => {
  describe("getDefaultWeeksForMonth", () => {
    it("generates 4 weeks for February in a non-leap year (28 days)", () => {
      const weeks = getDefaultWeeksForMonth("2023-02");
      expect(weeks).toHaveLength(4);
      expect(weeks[0].startDate).toBe("2023-02-01");
      expect(weeks[0].endDate).toBe("2023-02-07");
      expect(weeks[3].startDate).toBe("2023-02-22");
      expect(weeks[3].endDate).toBe("2023-02-28");
    });

    it("generates 5 weeks for a 30-day month", () => {
      const weeks = getDefaultWeeksForMonth("2026-09");
      expect(weeks).toHaveLength(5);
      expect(weeks[0].startDate).toBe("2026-09-01");
      expect(weeks[0].endDate).toBe("2026-09-07");
      expect(weeks[4].startDate).toBe("2026-09-29");
      expect(weeks[4].endDate).toBe("2026-09-30");
    });

    it("generates 5 weeks for a 31-day month", () => {
      const weeks = getDefaultWeeksForMonth("2026-08");
      expect(weeks).toHaveLength(5);
      expect(weeks[4].startDate).toBe("2026-08-29");
      expect(weeks[4].endDate).toBe("2026-08-31");
    });

    it("returns empty array for invalid month string", () => {
      expect(getDefaultWeeksForMonth("invalid")).toEqual([]);
    });
  });

  describe("month navigation helpers", () => {
    it("calculates next month correctly including year rollover", () => {
      expect(getNextMonthString("2026-09")).toBe("2026-10");
      expect(getNextMonthString("2026-12")).toBe("2027-01");
    });

    it("calculates previous month correctly including year rollback", () => {
      expect(getPreviousMonthString("2026-10")).toBe("2026-09");
      expect(getPreviousMonthString("2026-01")).toBe("2025-12");
    });

    it("formats week date range nicely", () => {
      expect(formatWeekDateRange("2026-09-01", "2026-09-07")).toBe("01/09 a 07/09");
    });
  });

  describe("checkExpenseReductionAlert", () => {
    const sampleConfig: ReductionLockConfig = {
      enabled: true,
      monitoredPaymentMethods: ["Cartão XP", "Cartão de Crédito"],
      plansByMonth: {
        "2026-09": [
          {
            id: "w-1",
            label: "Semana 1 (01/09 a 07/09)",
            startDate: "2026-09-01",
            endDate: "2026-09-07",
            categoryRules: {
              Compras: "red",
              Alimentação: "yellow",
              Lazer: "orange",
            },
          },
          {
            id: "w-2",
            label: "Semana 2 (08/09 a 14/09)",
            startDate: "2026-09-08",
            endDate: "2026-09-14",
            categoryRules: {
              Transporte: "red",
            },
          },
        ],
      },
    };

    it("returns null if reduction lock is disabled", () => {
      const disabledConfig = { ...sampleConfig, enabled: false };
      const alert = checkExpenseReductionAlert(
        {
          category: "Compras",
          paymentMethod: "Cartão XP",
          date: "2026-09-05",
        },
        disabledConfig,
      );
      expect(alert).toBeNull();
    });

    it("returns null if payment method is not monitored", () => {
      const alert = checkExpenseReductionAlert(
        {
          category: "Compras",
          paymentMethod: "PIX",
          date: "2026-09-05",
        },
        sampleConfig,
      );
      expect(alert).toBeNull();
    });

    it("returns red alert for Compras on Cartão XP in Semana 1", () => {
      const alert = checkExpenseReductionAlert(
        {
          category: "Compras",
          paymentMethod: "cartão xp", // case-insensitive test
          date: "2026-09-03",
        },
        sampleConfig,
      );
      expect(alert).not.toBeNull();
      expect(alert?.level).toBe("red");
      expect(alert?.categoryName).toBe("Compras");
      expect(alert?.weekLabel).toContain("Semana 1");
    });

    it("returns yellow alert for Alimentação in Semana 1", () => {
      const alert = checkExpenseReductionAlert(
        {
          category: "alimentação",
          paymentMethod: "Cartão XP",
          date: "2026-09-04",
        },
        sampleConfig,
      );
      expect(alert).not.toBeNull();
      expect(alert?.level).toBe("yellow");
    });

    it("returns null if category has no lock in that week", () => {
      const alert = checkExpenseReductionAlert(
        {
          category: "Saúde",
          paymentMethod: "Cartão XP",
          date: "2026-09-04",
        },
        sampleConfig,
      );
      expect(alert).toBeNull();
    });

    it("prioritizes createdAt (data de criação/compra) over future dueDate (vencimento da fatura)", () => {
      const alert = checkExpenseReductionAlert(
        {
          category: "Compras",
          paymentMethod: "Cartão XP",
          createdAt: "2026-09-03", // week 1 (rule for Compras is red)
          date: "2026-10-15",      // future invoice payment date
          dueDate: "2026-10-15",   // future invoice due date
        },
        sampleConfig,
      );
      expect(alert).not.toBeNull();
      expect(alert?.level).toBe("red");
      expect(alert?.weekLabel).toContain("Semana 1");
    });

    it("falls back to dueDate when createdAt is not provided", () => {
      const alert = checkExpenseReductionAlert(
        {
          category: "Transporte",
          paymentMethod: "Cartão de Crédito",
          date: "2026-09-01", // week 1 (no rule for Transporte)
          dueDate: "2026-09-10", // week 2 (rule for Transporte is red)
        },
        sampleConfig,
      );
      expect(alert).not.toBeNull();
      expect(alert?.level).toBe("red");
      expect(alert?.weekLabel).toContain("Semana 2");
    });
  });

  describe("copyPlanToNextMonth", () => {
    it("copies rules from current month to next month", () => {
      const config: ReductionLockConfig = {
        enabled: true,
        monitoredPaymentMethods: ["Cartão XP"],
        plansByMonth: {
          "2026-09": [
            {
              id: "w-1",
              label: "Semana 1",
              startDate: "2026-09-01",
              endDate: "2026-09-07",
              categoryRules: { Compras: "red", Alimentação: "orange" },
            },
          ],
        },
      };

      const { newConfig, nextMonthStr } = copyPlanToNextMonth("2026-09", config);
      expect(nextMonthStr).toBe("2026-10");
      expect(newConfig.plansByMonth["2026-10"]).toBeDefined();
      expect(newConfig.plansByMonth["2026-10"][0].categoryRules).toEqual({
        Compras: "red",
        Alimentação: "orange",
      });
      // Dates of next month should be October
      expect(newConfig.plansByMonth["2026-10"][0].startDate).toBe("2026-10-01");
    });
  });

  describe("custom weeks matching (handwritten notebook format)", () => {
    it("handles customized periods like 01/09 to 12/09 and 13/09 to 19/09", () => {
      const customConfig: ReductionLockConfig = {
        enabled: true,
        monitoredPaymentMethods: ["Cartão XP"],
        plansByMonth: {
          "2026-09": [
            {
              id: "w-custom-1",
              label: "Período 1 (01/09 a 12/09)",
              startDate: "2026-09-01",
              endDate: "2026-09-12",
              categoryRules: {
                Compras: "red",
                Alimentação: "yellow",
              },
            },
            {
              id: "w-custom-2",
              label: "Período 2 (13/09 a 19/09)",
              startDate: "2026-09-13",
              endDate: "2026-09-19",
              categoryRules: {
                Beleza: "orange",
              },
            },
          ],
        },
      };

      // Day 10 should fall in custom period 1
      const alertDay10 = checkExpenseReductionAlert(
        {
          category: "Compras",
          paymentMethod: "Cartão XP",
          date: "2026-09-10",
        },
        customConfig,
      );
      expect(alertDay10).not.toBeNull();
      expect(alertDay10?.level).toBe("red");
      expect(alertDay10?.weekLabel).toBe("Período 1 (01/09 a 12/09)");

      // Day 13 should fall in custom period 2
      const alertDay13 = checkExpenseReductionAlert(
        {
          category: "Beleza",
          paymentMethod: "Cartão XP",
          date: "2026-09-13",
        },
        customConfig,
      );
      expect(alertDay13).not.toBeNull();
      expect(alertDay13?.level).toBe("orange");
      expect(alertDay13?.weekLabel).toBe("Período 2 (13/09 a 19/09)");
    });
  });
});
