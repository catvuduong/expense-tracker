'use client';

import { FormEvent, useState } from 'react';
import {
  CATEGORIES,
  Category,
  Expense,
  errorMessage,
  expenseApi,
  todayIso,
} from '@/lib/expenses';

interface ExpenseFormProps {
  /** Expense being edited, or null to add a new one. The parent re-mounts the form when this changes. */
  editing: Expense | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function ExpenseForm({ editing, onSaved, onCancel }: ExpenseFormProps) {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [category, setCategory] = useState<Category>(editing?.category ?? 'Food');
  const [spentAt, setSpentAt] = useState(editing?.spentAt ?? todayIso());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const input = { title, amount: Number(amount), category, spentAt };
    try {
      if (editing) await expenseApi.update(editing.id, input);
      else await expenseApi.create(input);
      setTitle('');
      setAmount('');
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} data-testid="expense-form">
      <h2>{editing ? 'Edit expense' : 'Add expense'}</h2>

      <label className="field">
        <span>Title</span>
        <input
          data-testid="expense-title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Coffee, rent, taxi…"
          maxLength={120}
          required
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Amount (USD)</span>
          <input
            data-testid="expense-amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </label>

        <label className="field">
          <span>Date</span>
          <input
            data-testid="expense-date"
            name="spentAt"
            type="date"
            value={spentAt}
            onChange={(e) => setSpentAt(e.target.value)}
            required
          />
        </label>
      </div>

      <label className="field">
        <span>Category</span>
        <select
          data-testid="expense-category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          {CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="error" role="alert" data-testid="expense-error">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" className="button primary" data-testid="expense-submit" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add expense'}
        </button>
        {editing && (
          <button type="button" className="button" onClick={onCancel} data-testid="expense-cancel">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
