import {
  ExpenseReductionAlert,
  ReductionAlertLevel,
  ReductionLockConfig,
  ReductionWeek,
} from "../types/reductionLock";

export const REDUCTION_LOCK_STORAGE_KEY = "reduction_lock_config";

/**
 * Returns default 4 or 5 weeks for a given month ("YYYY-MM").
 */
export const getDefaultWeeksForMonth = (monthStr: string): ReductionWeek[] => {
  if (!monthStr || !monthStr.includes("-")) {
    return [];
  }

  const [yearStr, monthNumStr] = monthStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10); // 1-12

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return [];
  }

  // Days in month (day 0 of next month)
  const totalDays = new Date(year, month, 0).getDate();

  const periods: { start: number; end: number }[] = [
    { start: 1, end: Math.min(7, totalDays) },
    { start: 8, end: Math.min(14, totalDays) },
    { start: 15, end: Math.min(21, totalDays) },
    { start: 22, end: Math.min(28, totalDays) },
  ];

  if (totalDays > 28) {
    periods.push({ start: 29, end: totalDays });
  }

  const monthFormatted = String(month).padStart(2, "0");

  return periods.map((p, idx) => {
    const startPad = String(p.start).padStart(2, "0");
    const endPad = String(p.end).padStart(2, "0");
    return {
      id: `w-${idx + 1}`,
      label: `Semana ${idx + 1} (${startPad}/${monthFormatted} a ${endPad}/${monthFormatted})`,
      startDate: `${yearStr}-${monthFormatted}-${startPad}`,
      endDate: `${yearStr}-${monthFormatted}-${endPad}`,
      categoryRules: {},
    };
  });
};

/**
 * Formats a date range "YYYY-MM-DD" to "dd/MM a dd/MM".
 */
export const formatWeekDateRange = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return "";
  const startParts = startDate.split("-");
  const endParts = endDate.split("-");
  if (startParts.length < 3 || endParts.length < 3) return `${startDate} a ${endDate}`;
  return `${startParts[2]}/${startParts[1]} a ${endParts[2]}/${endParts[1]}`;
};

/**
 * Calculates the next month string in format "YYYY-MM".
 */
export const getNextMonthString = (monthStr: string): string => {
  const [yearStr, monthNumStr] = monthStr.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthNumStr, 10);

  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
};

/**
 * Calculates the previous month string in format "YYYY-MM".
 */
export const getPreviousMonthString = (monthStr: string): string => {
  const [yearStr, monthNumStr] = monthStr.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthNumStr, 10);

  month -= 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
};

/**
 * Reads initial configuration from localStorage or returns default.
 */
export const getInitialReductionConfig = (): ReductionLockConfig => {
  try {
    const raw = localStorage.getItem(REDUCTION_LOCK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          enabled: Boolean(parsed.enabled),
          monitoredPaymentMethods: Array.isArray(parsed.monitoredPaymentMethods)
            ? parsed.monitoredPaymentMethods
            : [],
          plansByMonth: parsed.plansByMonth && typeof parsed.plansByMonth === "object"
            ? parsed.plansByMonth
            : {},
        };
      }
    }
  } catch (error) {
    console.error("Erro ao carregar configuração da trava de redução:", error);
  }

  return {
    enabled: false,
    monitoredPaymentMethods: [],
    plansByMonth: {},
  };
};

/**
 * Evaluates whether an expense triggers an active reduction lock alert.
 */
export const checkExpenseReductionAlert = (
  params: {
    category: string;
    paymentMethod?: string;
    date: string;
    dueDate?: string;
    createdAt?: string;
  },
  config: ReductionLockConfig,
): ExpenseReductionAlert | null => {
  if (!config.enabled) {
    return null;
  }

  // If no monitored payment methods are configured, we don't alert (or if method doesn't match)
  if (!config.monitoredPaymentMethods || config.monitoredPaymentMethods.length === 0) {
    return null;
  }

  const expensePaymentMethod = (params.paymentMethod || "").trim().toLowerCase();
  const isMonitored = config.monitoredPaymentMethods.some(
    (m) => m.trim().toLowerCase() === expensePaymentMethod,
  );

  if (!isMonitored) {
    return null;
  }

  // Prioritize createdAt (data de criação/compra do gasto no cartão) para checagem da trava,
  // com fallback para dueDate ou date caso não fornecido.
  const rawDate = params.createdAt || params.dueDate || params.date;
  if (!rawDate) {
    return null;
  }

  // Normalize date string to YYYY-MM-DD
  const dateString = rawDate.slice(0, 10);
  const monthKey = dateString.slice(0, 7); // YYYY-MM

  const monthWeeks = config.plansByMonth[monthKey] || getDefaultWeeksForMonth(monthKey);
  if (!monthWeeks || monthWeeks.length === 0) {
    return null;
  }

  // Find the matching week
  const matchingWeek = monthWeeks.find(
    (w) => dateString >= w.startDate && dateString <= w.endDate,
  );

  if (!matchingWeek || !matchingWeek.categoryRules) {
    return null;
  }

  // Check category rule
  const normalizedCategory = params.category.trim().toLowerCase();
  let ruleLevel: ReductionAlertLevel = "none";

  for (const [catName, level] of Object.entries(matchingWeek.categoryRules)) {
    if (catName.trim().toLowerCase() === normalizedCategory) {
      ruleLevel = level;
      break;
    }
  }

  if (ruleLevel === "yellow" || ruleLevel === "orange" || ruleLevel === "red") {
    return {
      level: ruleLevel,
      weekLabel: matchingWeek.label,
      startDate: matchingWeek.startDate,
      endDate: matchingWeek.endDate,
      categoryName: params.category,
      paymentMethod: params.paymentMethod || "Cartão Selecionado",
    };
  }

  return null;
};

/**
 * Copies the current month's week rules to the next month.
 */
export const copyPlanToNextMonth = (
  currentMonthStr: string,
  config: ReductionLockConfig,
): { newConfig: ReductionLockConfig; nextMonthStr: string } => {
  const nextMonthStr = getNextMonthString(currentMonthStr);
  const currentWeeks =
    config.plansByMonth[currentMonthStr] || getDefaultWeeksForMonth(currentMonthStr);
  const nextWeeksDefault = getDefaultWeeksForMonth(nextMonthStr);

  // Copy category rules from current weeks to next weeks
  const updatedNextWeeks = nextWeeksDefault.map((nextWeek, idx) => {
    const sourceWeek = currentWeeks[idx];
    return {
      ...nextWeek,
      categoryRules: sourceWeek ? { ...sourceWeek.categoryRules } : {},
    };
  });

  const newConfig: ReductionLockConfig = {
    ...config,
    plansByMonth: {
      ...config.plansByMonth,
      [nextMonthStr]: updatedNextWeeks,
    },
  };

  return { newConfig, nextMonthStr };
};
