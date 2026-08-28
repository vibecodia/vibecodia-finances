import { Category, Transaction } from "../types";

import { getCategoryName } from "./categoryUtils";
import { formatPaymentMethod } from "./helpers";

const CATEGORY_COLORS = [
  "#FF6384",
  "#36A2EB",
  "#FFCE56",
  "#4BC0C0",
  "#9966FF",
  "#FF9F40",
  "#8BC34A",
  "#E91E63",
  "#00BCD4",
  "#FFEB3B",
  "#795548",
  "#607D8B",
];

const PAYMENT_COLORS = [
  "#4CAF50",
  "#2196F3",
  "#FFC107",
  "#9C27B0",
  "#F44336",
  "#009688",
  "#3F51B5",
  "#FF5722",
  "#CDDC39",
  "#00BCD4",
  "#673AB7",
  "#795548",
];

export interface PieDoughnutChartData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
    borderColor: string;
    borderWidth: number;
  }[];
}

export function buildCategoryDistributionChartData(
  transactions: Transaction[],
  categories: Category[] = [],
  borderColor: string = "#ffffff",
): PieDoughnutChartData {
  const categoryTotals: Record<string, number> = {};

  transactions.forEach((t) => {
    const catName = getCategoryName(categories, t.category);
    categoryTotals[catName] = (categoryTotals[catName] || 0) + t.amount;
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: CATEGORY_COLORS.slice(0, labels.length),
        borderColor,
        borderWidth: 2,
      },
    ],
  };
}

export function buildPaymentMethodDistributionChartData(
  transactions: Transaction[],
  borderColor: string = "#ffffff",
): PieDoughnutChartData {
  const paymentTotals: Record<string, number> = {};

  transactions.forEach((t) => {
    if (t.paymentMethod) {
      const label = formatPaymentMethod(t.paymentMethod);
      paymentTotals[label] = (paymentTotals[label] || 0) + t.amount;
    }
  });

  const labels = Object.keys(paymentTotals);
  const data = Object.values(paymentTotals);

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: PAYMENT_COLORS.slice(0, labels.length),
        borderColor,
        borderWidth: 2,
      },
    ],
  };
}
