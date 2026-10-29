import { currentMonth, isIsoDate, monthRange, validateExpense } from './expense.validation.js';

const valid = { title: 'Lunch', amount: 12.5, category: 'Food' };

describe('validateExpense', () => {
  it('accepts a complete expense and trims the title', () => {
    expect(validateExpense({ ...valid, title: '  Lunch  ', spentAt: '2026-10-03' })).toEqual({
      ok: true,
      value: { title: 'Lunch', amount: 12.5, category: 'Food', spentAt: '2026-10-03' },
    });
  });

  it('leaves spentAt undefined when it is not sent', () => {
    const result = validateExpense(valid);
    expect(result.ok && result.value.spentAt).toBeUndefined();
  });

  it('rejects a body that is not an object', () => {
    expect(validateExpense(null)).toEqual({ ok: false, errors: ['body must be a JSON object'] });
    expect(validateExpense(['Lunch'])).toEqual({ ok: false, errors: ['body must be a JSON object'] });
    expect(validateExpense('Lunch')).toEqual({ ok: false, errors: ['body must be a JSON object'] });
  });

  it.each(['', '   ', undefined, 42])('rejects title %j', (title) => {
    expect(validateExpense({ ...valid, title })).toEqual({
      ok: false,
      errors: ['title is required'],
    });
  });

  it('rejects a title longer than 120 characters', () => {
    const result = validateExpense({ ...valid, title: 'x'.repeat(121) });
    expect(result).toEqual({ ok: false, errors: ['title must be at most 120 characters'] });
  });

  it.each([0, -5, 0.001])('rejects amount %p', (amount) => {
    const result = validateExpense({ ...valid, amount });
    expect(result.ok).toBe(false);
  });

  it('rejects amount 0 with a clear message', () => {
    expect(validateExpense({ ...valid, amount: 0 })).toEqual({
      ok: false,
      errors: ['amount must be greater than 0'],
    });
  });

  it.each(['12.50', null, NaN, Infinity])('rejects non-numeric amount %p', (amount) => {
    expect(validateExpense({ ...valid, amount })).toEqual({
      ok: false,
      errors: ['amount must be a number'],
    });
  });

  it('rejects an amount with more than two decimal places', () => {
    expect(validateExpense({ ...valid, amount: 1.005 })).toEqual({
      ok: false,
      errors: ['amount must have at most 2 decimal places'],
    });
  });

  it('accepts amounts with two decimals, including values that are not exact in binary', () => {
    expect(validateExpense({ ...valid, amount: 19.99 }).ok).toBe(true);
    expect(validateExpense({ ...valid, amount: 0.07 }).ok).toBe(true);
  });

  it('rejects an amount larger than the NUMERIC(12, 2) column can hold', () => {
    expect(validateExpense({ ...valid, amount: 10_000_000_000 })).toEqual({
      ok: false,
      errors: ['amount must be at most 9999999999.99'],
    });
  });

  it.each(['Travel', 'food', '', undefined])('rejects category %j outside the fixed list', (category) => {
    expect(validateExpense({ ...valid, category })).toEqual({
      ok: false,
      errors: ['category must be one of Food, Transport, Bills, Fun, Other'],
    });
  });

  it.each(['Food', 'Transport', 'Bills', 'Fun', 'Other'])('accepts category %s', (category) => {
    expect(validateExpense({ ...valid, category }).ok).toBe(true);
  });

  it.each(['2026-02-30', '10/03/2026', '2026-10-3', 20261003])('rejects spentAt %p', (spentAt) => {
    expect(validateExpense({ ...valid, spentAt })).toEqual({
      ok: false,
      errors: ['spentAt must be a valid date in YYYY-MM-DD format'],
    });
  });

  it('reports every problem at once', () => {
    const result = validateExpense({ title: '', amount: -1, category: 'Travel' });
    expect(result).toEqual({
      ok: false,
      errors: [
        'title is required',
        'amount must be greater than 0',
        'category must be one of Food, Transport, Bills, Fun, Other',
      ],
    });
  });
});

describe('isIsoDate', () => {
  it('accepts leap days only in leap years', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
  });
});

describe('monthRange', () => {
  it('returns the first day of the month and of the next month', () => {
    expect(monthRange('2026-10')).toEqual({ start: '2026-10-01', end: '2026-11-01' });
  });

  it('rolls over the year at December', () => {
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
  });

  it.each(['2026-13', '2026-00', '2026-1', '26-10', '2026/10', '', 'October'])('rejects %j', (month) => {
    expect(monthRange(month)).toBeNull();
  });
});

describe('currentMonth', () => {
  it('formats the given date as YYYY-MM', () => {
    expect(currentMonth(new Date('2026-10-29T12:00:00Z'))).toBe('2026-10');
  });
});
