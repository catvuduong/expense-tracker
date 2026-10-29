export const CATEGORIES = ['Food', 'Transport', 'Bills', 'Fun', 'Other'] as const;

export type Category = (typeof CATEGORIES)[number];

export interface ExpenseInput {
  title: string;
  amount: number;
  category: Category;
  spentAt?: string;
}

export type ValidationResult = { ok: true; value: ExpenseInput } | { ok: false; errors: string[] };

const MAX_TITLE_LENGTH = 120;
// NUMERIC(12, 2) is the column type, so the largest storable amount is 9999999999.99.
const MAX_AMOUNT = 9_999_999_999.99;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Returns the first day of `month` and the first day of the following month (exclusive). */
export function monthRange(month: string): { start: string; end: string } | null {
  const match = MONTH.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const next = new Date(Date.UTC(year, monthIndex + 1, 1));
  const end = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`;
  return { start: `${match[1]}-${match[2]}-01`, end };
}

export function currentMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export function validateExpense(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const { title, amount, category, spentAt } = body as Record<string, unknown>;
  const errors: string[] = [];

  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  if (!trimmedTitle) errors.push('title is required');
  else if (trimmedTitle.length > MAX_TITLE_LENGTH)
    errors.push(`title must be at most ${MAX_TITLE_LENGTH} characters`);

  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    errors.push('amount must be a number');
  } else if (amount <= 0) {
    errors.push('amount must be greater than 0');
  } else if (amount > MAX_AMOUNT) {
    errors.push(`amount must be at most ${MAX_AMOUNT}`);
  } else if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
    errors.push('amount must have at most 2 decimal places');
  }

  if (!isCategory(category)) errors.push(`category must be one of ${CATEGORIES.join(', ')}`);

  if (spentAt !== undefined && (typeof spentAt !== 'string' || !isIsoDate(spentAt))) {
    errors.push('spentAt must be a valid date in YYYY-MM-DD format');
  }

  if (errors.length > 0 || !isCategory(category) || typeof amount !== 'number') {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      title: trimmedTitle,
      amount,
      category,
      spentAt: spentAt as string | undefined,
    },
  };
}
