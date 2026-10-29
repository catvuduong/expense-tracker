'use client';

import { useEffect, useState } from 'react';
import { CategoryChart } from './category-chart';
import { ExpenseForm } from './expense-form';
import { ExpenseList } from './expense-list';
import {
  CATEGORIES,
  Category,
  Expense,
  MonthStats,
  currentMonth,
  errorMessage,
  expenseApi,
  formatCurrency,
  formatMonth,
} from '@/lib/expenses';

export function ExpenseTracker() {
  const [month, setMonth] = useState(currentMonth);
  const [category, setCategory] = useState<Category | ''>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([expenseApi.list({ month, category }), expenseApi.stats(month)])
      .then(([list, summary]) => {
        if (cancelled) return;
        setExpenses(list);
        setStats(summary);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, category, reloadKey]);

  function reload() {
    setReloadKey((key) => key + 1);
  }

  async function handleDelete(expense: Expense) {
    setError(null);
    try {
      await expenseApi.remove(expense.id);
      if (editing?.id === expense.id) setEditing(null);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const listTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthCount = stats?.byCategory.reduce((sum, row) => sum + row.count, 0) ?? 0;

  return (
    <section className="tracker">
      <header className="toolbar">
        <div>
          <h1>Expenses</h1>
          <p className="muted" data-testid="month-label">
            {formatMonth(month)}
          </p>
        </div>
        <div className="filters">
          <label className="field">
            <span>Month</span>
            <input
              type="month"
              data-testid="filter-month"
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select
              data-testid="filter-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | '')}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="summary card">
        <span className="muted">Total for {formatMonth(month)}</span>
        <strong className="summary-total" data-testid="month-total">
          {stats ? formatCurrency(stats.total) : '…'}
        </strong>
        <span className="muted" data-testid="month-count">
          {monthCount} {monthCount === 1 ? 'expense' : 'expenses'}
        </span>
      </div>

      {error && (
        <p className="error" role="alert" data-testid="page-error">
          {error}
        </p>
      )}

      <div className="layout">
        <aside className="stack">
          <div className="card">
            <ExpenseForm
              key={editing?.id ?? 'new'}
              editing={editing}
              onSaved={() => {
                setEditing(null);
                reload();
              }}
              onCancel={() => setEditing(null)}
            />
          </div>
          <div className="card">
            <h2>By category</h2>
            {stats ? <CategoryChart stats={stats} /> : <p className="muted">Loading…</p>}
          </div>
        </aside>

        <section className="card">
          <div className="list-header">
            <h2>{category || 'All categories'}</h2>
            <span className="muted" data-testid="list-total">
              {formatCurrency(listTotal)} shown
            </span>
          </div>
          {loading && expenses.length === 0 ? (
            <p className="muted">Loading…</p>
          ) : (
            <ExpenseList
              expenses={expenses}
              editingId={editing?.id ?? null}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          )}
        </section>
      </div>
    </section>
  );
}
