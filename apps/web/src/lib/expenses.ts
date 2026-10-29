export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const CATEGORIES = ['Food', 'Transport', 'Bills', 'Fun', 'Other'] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: number;
  title: string;
  amount: number;
  category: Category;
  spentAt: string;
}

export type ExpenseInput = Omit<Expense, 'id'>;

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

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatCurrency(value: number): string {
  return currency.format(value);
}

/** Local calendar date as YYYY-MM-DD. toISOString would give the UTC date instead. */
function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function currentMonth(): string {
  return localDate(new Date()).slice(0, 7);
}

export function todayIso(): string {
  return localDate(new Date());
}

export function formatDate(spentAt: string): string {
  // Parse as a local date. new Date('YYYY-MM-DD') is UTC midnight and shows the previous day west of UTC.
  const [year, month, day] = spentAt.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonth(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // Nest sends { message: string | string[] } for validation and not-found errors.
    const message = body?.message;
    throw new Error(Array.isArray(message) ? message.join('. ') : (message ?? `Request failed (${res.status})`));
  }
  return body as T;
}

export const expenseApi = {
  list(filter: { month?: string; category?: Category | '' }): Promise<Expense[]> {
    const params = new URLSearchParams();
    if (filter.month) params.set('month', filter.month);
    if (filter.category) params.set('category', filter.category);
    return request<Expense[]>(`/expenses?${params}`);
  },
  stats(month: string): Promise<MonthStats> {
    return request<MonthStats>(`/stats?month=${month}`);
  },
  create(input: ExpenseInput): Promise<Expense> {
    return request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(input) });
  },
  update(id: number, input: ExpenseInput): Promise<Expense> {
    return request<Expense>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  },
  remove(id: number): Promise<void> {
    return request<void>(`/expenses/${id}`, { method: 'DELETE' });
  },
};
