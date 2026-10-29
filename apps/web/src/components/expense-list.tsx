import { Expense, formatCurrency, formatDate } from '@/lib/expenses';

interface ExpenseListProps {
  expenses: Expense[];
  editingId: number | null;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseList({ expenses, editingId, onEdit, onDelete }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <p className="empty" data-testid="expense-empty">
        No expenses match these filters. Add one with the form.
      </p>
    );
  }

  return (
    <ul className="list" data-testid="expense-list">
      {expenses.map((expense) => (
        <li
          key={expense.id}
          className="item"
          data-testid="expense-row"
          data-id={expense.id}
          data-selected={editingId === expense.id}
        >
          <div className="item-main">
            <span className="item-title" data-testid="expense-row-title">
              {expense.title}
            </span>
            <span className="item-meta">
              <span className={`pill pill-${expense.category.toLowerCase()}`}>{expense.category}</span>
              <time dateTime={expense.spentAt}>{formatDate(expense.spentAt)}</time>
            </span>
          </div>
          <span className="item-amount" data-testid="expense-row-amount">
            {formatCurrency(expense.amount)}
          </span>
          <div className="item-actions">
            <button
              type="button"
              className="button small"
              data-testid="expense-edit"
              onClick={() => onEdit(expense)}
            >
              Edit
            </button>
            <button
              type="button"
              className="button small danger"
              data-testid="expense-delete"
              onClick={() => onDelete(expense)}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
