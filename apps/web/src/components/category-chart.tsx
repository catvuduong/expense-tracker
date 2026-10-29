import { formatCurrency, MonthStats } from '@/lib/expenses';

interface CategoryChartProps {
  stats: MonthStats;
}

/** Horizontal bars on one shared scale, starting at the same baseline. Each bar is labelled, so colour is never the only key. */
export function CategoryChart({ stats }: CategoryChartProps) {
  const largest = Math.max(0, ...stats.byCategory.map((row) => row.total));
  const slug = (category: string) => category.toLowerCase();

  return (
    <ul className="chart" data-testid="category-chart" aria-label="Spending per category">
      {stats.byCategory.map((row) => {
        const width = largest > 0 ? (row.total / largest) * 100 : 0;
        const label = `${row.category}: ${formatCurrency(row.total)} across ${row.count} ${row.count === 1 ? 'expense' : 'expenses'}`;
        return (
          <li key={row.category} className="chart-row" data-testid={`chart-row-${slug(row.category)}`}>
            <span className="chart-label">
              <span className={`swatch swatch-${slug(row.category)}`} aria-hidden="true" />
              {row.category}
            </span>
            <span className="chart-track">
              <span
                className={`chart-bar swatch-${slug(row.category)}`}
                style={{ width: `${width}%` }}
                title={label}
                aria-label={label}
                role="img"
                data-testid={`chart-bar-${slug(row.category)}`}
                data-value={row.total}
              />
            </span>
            <span className="chart-value">{formatCurrency(row.total)}</span>
          </li>
        );
      })}
    </ul>
  );
}
