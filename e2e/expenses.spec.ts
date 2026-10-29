import { test, expect, Page } from '@playwright/test';

// Titles carry a timestamp so tests do not depend on what other runs left in the database.
function uniqueTitle(label: string) {
  return `${label} ${Date.now()} ${Math.random().toString(36).slice(2, 6)}`;
}

async function addExpense(page: Page, title: string, amount: string, category: string) {
  await page.getByTestId('expense-title').fill(title);
  await page.getByTestId('expense-amount').fill(amount);
  await page.getByTestId('expense-category').selectOption(category);
  await page.getByTestId('expense-submit').click();
  await expect(page.getByTestId('expense-row').filter({ hasText: title })).toBeVisible();
}

test.describe('expense tracker', () => {
  test('shows seeded or existing expenses, the month total and the category chart', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('expense-row').first()).toBeVisible();
    await expect(page.getByTestId('month-total')).toContainText('$');
    await expect(page.getByTestId('category-chart').getByRole('img')).toHaveCount(5);
    await expect(page.getByTestId('chart-row-food')).toBeVisible();
  });

  test('adds an expense through the form and formats the amount as currency', async ({ page }) => {
    await page.goto('/');
    const title = uniqueTitle('Coffee');

    await addExpense(page, title, '7.5', 'Fun');

    const row = page.getByTestId('expense-row').filter({ hasText: title });
    await expect(row.getByTestId('expense-row-amount')).toHaveText('$7.50');
    await expect(row).toContainText('Fun');
    // The form resets after a successful add.
    await expect(page.getByTestId('expense-title')).toHaveValue('');
  });

  test('rejects an empty title and shows the API error', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('expense-title').fill('   ');
    await page.getByTestId('expense-amount').fill('3');
    await page.getByTestId('expense-submit').click();
    await expect(page.getByTestId('expense-error')).toContainText('title is required');
  });

  test('filters the list by category', async ({ page }) => {
    await page.goto('/');
    const title = uniqueTitle('Parking');
    await addExpense(page, title, '4', 'Transport');
    const row = page.getByTestId('expense-row').filter({ hasText: title });

    await page.getByTestId('filter-category').selectOption('Transport');
    await expect(row).toBeVisible();

    await page.getByTestId('filter-category').selectOption('Food');
    await expect(row).toHaveCount(0);

    await page.getByTestId('filter-category').selectOption('');
    await expect(row).toBeVisible();
  });

  test('filters the list by month', async ({ page }) => {
    await page.goto('/');
    const title = uniqueTitle('Taxi');
    await addExpense(page, title, '18', 'Transport');
    const row = page.getByTestId('expense-row').filter({ hasText: title });
    await expect(row).toBeVisible();

    // A month with no expenses in it, so the list is empty and the total is zero.
    await page.getByTestId('filter-month').fill('2001-01');
    await expect(row).toHaveCount(0);
    await expect(page.getByTestId('expense-empty')).toBeVisible();
    await expect(page.getByTestId('month-total')).toHaveText('$0.00');

    await page.getByTestId('filter-month').fill(currentMonth());
    await expect(row).toBeVisible();
  });

  test('edits an expense and saves the change', async ({ page }) => {
    await page.goto('/');
    const title = uniqueTitle('Lunch');
    await addExpense(page, title, '11', 'Food');
    const row = page.getByTestId('expense-row').filter({ hasText: title });

    await row.getByTestId('expense-edit').click();
    await expect(page.getByTestId('expense-form')).toContainText('Edit expense');
    await page.getByTestId('expense-amount').fill('13.25');
    await page.getByTestId('expense-submit').click();

    await expect(row.getByTestId('expense-row-amount')).toHaveText('$13.25');
    await expect(page.getByTestId('expense-form')).toContainText('Add expense');
  });

  test('deletes an expense', async ({ page }) => {
    await page.goto('/');
    const title = uniqueTitle('Doomed');
    await addExpense(page, title, '2', 'Other');
    const row = page.getByTestId('expense-row').filter({ hasText: title });

    await row.getByTestId('expense-delete').click();

    await expect(row).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('expense-row').filter({ hasText: title })).toHaveCount(0);
  });
});

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
