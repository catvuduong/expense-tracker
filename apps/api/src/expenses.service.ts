import { Injectable, NotFoundException } from '@nestjs/common';
import { buildStats, MonthStats } from './expense.stats.js';
import { Category, currentMonth, ExpenseInput, monthRange } from './expense.validation.js';
import { DbService } from './db.service.js';

export interface Expense {
  id: number;
  title: string;
  amount: number;
  category: Category;
  spentAt: string;
}

interface ExpenseRow extends Omit<Expense, 'amount'> {
  amount: string;
}

export interface ExpenseFilter {
  month?: { start: string; end: string };
  category?: Category;
}

// Columns returned to the API. numeric comes back as a string from pg, and a date
// would come back as a JS Date in local time, so both are converted in SQL / toExpense.
const COLUMNS = `id, title, amount, category, to_char(spent_at, 'YYYY-MM-DD') AS "spentAt"`;

// Sample data for an empty table so the home page is not blank on first run.
// Offsets are days before today: the set spans roughly the last two months.
const SEED_SQL = `
INSERT INTO expenses (title, amount, category, spent_at)
SELECT seed.title, seed.amount, seed.category, CURRENT_DATE - seed.days_ago
FROM (VALUES
  ('Weekly groceries', 84.20, 'Food', 1),
  ('Metro card top-up', 30.00, 'Transport', 3),
  ('Electricity bill', 96.45, 'Bills', 6),
  ('Cinema night', 28.50, 'Fun', 12),
  ('Hardware store, light bulbs', 18.40, 'Other', 20),
  ('Ride to the airport', 42.75, 'Transport', 33),
  ('Internet subscription', 49.99, 'Bills', 45),
  ('Board game cafe', 35.00, 'Fun', 55)
) AS seed(title, amount, category, days_ago)
WHERE NOT EXISTS (SELECT 1 FROM expenses)`;

function toExpense(row: ExpenseRow): Expense {
  return { ...row, amount: Number(row.amount) };
}

@Injectable()
export class ExpensesService {
  private seeded: Promise<void> | null = null;

  constructor(private readonly db: DbService) {}

  async list(filter: ExpenseFilter = {}): Promise<Expense[]> {
    await this.ensureSeeded();
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filter.month) {
      params.push(filter.month.start, filter.month.end);
      conditions.push(`spent_at >= $${params.length - 1} AND spent_at < $${params.length}`);
    }
    if (filter.category) {
      params.push(filter.category);
      conditions.push(`category = $${params.length}`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await this.db.query<ExpenseRow>(
      `SELECT ${COLUMNS} FROM expenses ${where} ORDER BY spent_at DESC, id DESC`,
      params,
    );
    return rows.map(toExpense);
  }

  async create(input: ExpenseInput): Promise<Expense> {
    await this.ensureSeeded();
    const [row] = await this.db.query<ExpenseRow>(
      `INSERT INTO expenses (title, amount, category, spent_at)
       VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE))
       RETURNING ${COLUMNS}`,
      [input.title, input.amount, input.category, input.spentAt ?? null],
    );
    return toExpense(row);
  }

  async update(id: number, input: ExpenseInput): Promise<Expense> {
    await this.ensureSeeded();
    const rows = await this.db.query<ExpenseRow>(
      `UPDATE expenses
       SET title = $1, amount = $2, category = $3, spent_at = COALESCE($4::date, spent_at)
       WHERE id = $5
       RETURNING ${COLUMNS}`,
      [input.title, input.amount, input.category, input.spentAt ?? null, id],
    );
    if (rows.length === 0) throw new NotFoundException(`expense ${id} not found`);
    return toExpense(rows[0]);
  }

  async remove(id: number): Promise<void> {
    await this.ensureSeeded();
    const rows = await this.db.query<{ id: number }>(
      'DELETE FROM expenses WHERE id = $1 RETURNING id',
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`expense ${id} not found`);
  }

  async stats(month: string = currentMonth()): Promise<MonthStats> {
    await this.ensureSeeded();
    const range = monthRange(month);
    if (!range) throw new Error(`stats called with invalid month ${month}`);
    const rows = await this.db.query<{ category: string; amount: string }>(
      'SELECT category, amount FROM expenses WHERE spent_at >= $1 AND spent_at < $2',
      [range.start, range.end],
    );
    return buildStats(
      month,
      rows.map((row) => ({ category: row.category, amount: Number(row.amount) })),
    );
  }

  private ensureSeeded(): Promise<void> {
    // Memoised per process. The insert itself only runs while the table is empty.
    this.seeded ??= this.db.query(SEED_SQL).then(
      () => undefined,
      (error: unknown) => {
        this.seeded = null;
        throw error;
      },
    );
    return this.seeded;
  }
}
