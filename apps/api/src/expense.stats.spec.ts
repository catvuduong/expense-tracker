import { buildStats } from './expense.stats.js';

describe('buildStats', () => {
  it('returns zero totals for a month with no expenses, with every category present', () => {
    expect(buildStats('2026-10', [])).toEqual({
      month: '2026-10',
      total: 0,
      byCategory: [
        { category: 'Food', total: 0, count: 0 },
        { category: 'Transport', total: 0, count: 0 },
        { category: 'Bills', total: 0, count: 0 },
        { category: 'Fun', total: 0, count: 0 },
        { category: 'Other', total: 0, count: 0 },
      ],
    });
  });

  it('sums per category and for the month', () => {
    const stats = buildStats('2026-10', [
      { category: 'Food', amount: 84.2 },
      { category: 'Food', amount: 9.5 },
      { category: 'Transport', amount: 30 },
      { category: 'Bills', amount: 96.45 },
    ]);

    expect(stats.total).toBe(220.15);
    expect(stats.byCategory).toEqual([
      { category: 'Food', total: 93.7, count: 2 },
      { category: 'Transport', total: 30, count: 1 },
      { category: 'Bills', total: 96.45, count: 1 },
      { category: 'Fun', total: 0, count: 0 },
      { category: 'Other', total: 0, count: 0 },
    ]);
  });

  it('adds two-decimal amounts without floating point drift', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in plain floating point.
    const stats = buildStats('2026-10', [
      { category: 'Fun', amount: 0.1 },
      { category: 'Fun', amount: 0.2 },
    ]);
    expect(stats.total).toBe(0.3);
    expect(stats.byCategory[3]).toEqual({ category: 'Fun', total: 0.3, count: 2 });
  });

  it('keeps the category order from CATEGORIES regardless of input order', () => {
    const stats = buildStats('2026-10', [
      { category: 'Other', amount: 1 },
      { category: 'Food', amount: 1 },
    ]);
    expect(stats.byCategory.map((row) => row.category)).toEqual([
      'Food',
      'Transport',
      'Bills',
      'Fun',
      'Other',
    ]);
  });
});
