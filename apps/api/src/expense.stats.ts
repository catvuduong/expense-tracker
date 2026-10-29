import { CATEGORIES, Category } from './expense.validation.js';

export interface CategoryTotal {
  category: Category;
  total: number;
  count: number;
}

export interface MonthStats {
  month: string;
  total: number;
  byCategory: CategoryTotal[];
}

/**
 * Totals per category and for the whole month. Sums are done in whole cents so that
 * adding two-decimal amounts never drifts (0.1 + 0.2 style errors). Every category is
 * listed, in CATEGORIES order, even when it has no expenses, so charts keep their slots.
 */
export function buildStats(month: string, expenses: { category: string; amount: number }[]): MonthStats {
  const cents = new Map<string, number>(CATEGORIES.map((category) => [category, 0]));
  const counts = new Map<string, number>(CATEGORIES.map((category) => [category, 0]));
  let totalCents = 0;

  for (const { category, amount } of expenses) {
    const amountCents = Math.round(amount * 100);
    cents.set(category, (cents.get(category) ?? 0) + amountCents);
    counts.set(category, (counts.get(category) ?? 0) + 1);
    totalCents += amountCents;
  }

  return {
    month,
    total: totalCents / 100,
    byCategory: CATEGORIES.map((category) => ({
      category,
      total: (cents.get(category) ?? 0) / 100,
      count: counts.get(category) ?? 0,
    })),
  };
}
