export type ReductionAlertLevel = "none" | "yellow" | "orange" | "red";

export interface ReductionWeek {
  id: string;
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  categoryRules: Record<string, ReductionAlertLevel>;
}

export interface ReductionLockConfig {
  enabled: boolean;
  monitoredPaymentMethods: string[];
  plansByMonth: Record<string, ReductionWeek[]>;
}

export interface ExpenseReductionAlert {
  level: "yellow" | "orange" | "red";
  weekLabel: string;
  startDate: string;
  endDate: string;
  categoryName: string;
  paymentMethod: string;
}
