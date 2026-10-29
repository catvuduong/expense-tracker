import { test, expect } from '@playwright/test';

const API = 'http://localhost:3001';

// Expenses in this month are used only by the stats test, so its totals are exact.
const QUIET_MONTH = '2001-05';

test.describe('expenses API', () => {
  test('GET /expenses returns seeded or existing rows with the expected shape', async ({ request }) => {
    const res = await request.get(`${API}/expenses`);
    expect(res.status()).toBe(200);
    const rows = await res.json();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toEqual({
      id: expect.any(Number),
      title: expect.any(String),
      amount: expect.any(Number),
      category: expect.stringMatching(/^(Food|Transport|Bills|Fun|Other)$/),
      spentAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  test('POST creates an expense that the month and category filters find', async ({ request }) => {
    const title = `API lunch ${Date.now()}`;
    const created = await request.post(`${API}/expenses`, {
      data: { title, amount: 12.5, category: 'Food', spentAt: '2001-05-10' },
    });
    expect(created.status()).toBe(201);
    const expense = await created.json();
    expect(expense).toMatchObject({ title, amount: 12.5, category: 'Food', spentAt: '2001-05-10' });

    const byMonth = await (await request.get(`${API}/expenses?month=${QUIET_MONTH}`)).json();
    expect(byMonth.map((row: { id: number }) => row.id)).toContain(expense.id);

    const byCategory = await (await request.get(`${API}/expenses?month=${QUIET_MONTH}&category=Food`)).json();
    expect(byCategory.map((row: { id: number }) => row.id)).toContain(expense.id);

    const otherCategory = await (await request.get(`${API}/expenses?month=${QUIET_MONTH}&category=Fun`)).json();
    expect(otherCategory.map((row: { id: number }) => row.id)).not.toContain(expense.id);

    await request.delete(`${API}/expenses/${expense.id}`);
  });

  test('POST trims the title and defaults spentAt to today', async ({ request }) => {
    const created = await request.post(`${API}/expenses`, {
      data: { title: '   Bus pass   ', amount: 3, category: 'Transport' },
    });
    expect(created.status()).toBe(201);
    const expense = await created.json();
    expect(expense.title).toBe('Bus pass');
    expect(expense.spentAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await request.delete(`${API}/expenses/${expense.id}`);
  });

  test('POST rejects invalid input with 400 and every message', async ({ request }) => {
    const res = await request.post(`${API}/expenses`, {
      data: { title: '  ', amount: 0, category: 'Travel' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toEqual([
      'title is required',
      'amount must be greater than 0',
      'category must be one of Food, Transport, Bills, Fun, Other',
    ]);
  });

  test('POST rejects a negative amount and a bad date', async ({ request }) => {
    const negative = await request.post(`${API}/expenses`, {
      data: { title: 'Refund', amount: -4, category: 'Bills' },
    });
    expect(negative.status()).toBe(400);

    const badDate = await request.post(`${API}/expenses`, {
      data: { title: 'Gym', amount: 20, category: 'Fun', spentAt: '2026-02-30' },
    });
    expect(badDate.status()).toBe(400);
    expect((await badDate.json()).message).toEqual(['spentAt must be a valid date in YYYY-MM-DD format']);
  });

  test('PUT replaces the fields of an expense', async ({ request }) => {
    const created = await (
      await request.post(`${API}/expenses`, {
        data: { title: 'Old title', amount: 5, category: 'Other', spentAt: '2001-05-02' },
      })
    ).json();

    const res = await request.put(`${API}/expenses/${created.id}`, {
      data: { title: 'New title', amount: 9.99, category: 'Fun', spentAt: '2001-05-03' },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({
      id: created.id,
      title: 'New title',
      amount: 9.99,
      category: 'Fun',
      spentAt: '2001-05-03',
    });
    await request.delete(`${API}/expenses/${created.id}`);
  });

  test('PUT and DELETE return 404 for an unknown id', async ({ request }) => {
    const body = { title: 'Ghost', amount: 1, category: 'Food' };
    expect((await request.put(`${API}/expenses/2147483600`, { data: body })).status()).toBe(404);
    expect((await request.delete(`${API}/expenses/2147483600`)).status()).toBe(404);
  });

  test('PUT validates the body like POST', async ({ request }) => {
    const created = await (
      await request.post(`${API}/expenses`, { data: { title: 'Tea', amount: 2, category: 'Food' } })
    ).json();
    const res = await request.put(`${API}/expenses/${created.id}`, {
      data: { title: 'Tea', amount: 2.001, category: 'Food' },
    });
    expect(res.status()).toBe(400);
    await request.delete(`${API}/expenses/${created.id}`);
  });

  test('DELETE removes the expense and returns 204', async ({ request }) => {
    const created = await (
      await request.post(`${API}/expenses`, { data: { title: 'Temp', amount: 1, category: 'Other' } })
    ).json();

    const res = await request.delete(`${API}/expenses/${created.id}`);
    expect(res.status()).toBe(204);

    const rows = await (await request.get(`${API}/expenses`)).json();
    expect(rows.map((row: { id: number }) => row.id)).not.toContain(created.id);
  });

  test('GET /expenses rejects a malformed month or unknown category', async ({ request }) => {
    expect((await request.get(`${API}/expenses?month=2026-13`)).status()).toBe(400);
    expect((await request.get(`${API}/expenses?month=October`)).status()).toBe(400);
    expect((await request.get(`${API}/expenses?category=Travel`)).status()).toBe(400);
  });

  test('GET /stats totals each category and the month', async ({ request }) => {
    const ids: number[] = [];
    for (const data of [
      { title: 'Stats food', amount: 10.25, category: 'Food', spentAt: '2001-05-04' },
      { title: 'Stats fun', amount: 4.75, category: 'Fun', spentAt: '2001-05-20' },
      { title: 'Stats food again', amount: 0.1, category: 'Food', spentAt: '2001-05-31' },
    ]) {
      ids.push((await (await request.post(`${API}/expenses`, { data })).json()).id);
    }

    const res = await request.get(`${API}/stats?month=${QUIET_MONTH}`);
    expect(res.status()).toBe(200);
    const stats = await res.json();

    expect(stats.month).toBe(QUIET_MONTH);
    expect(stats.total).toBe(15.1);
    expect(stats.byCategory).toEqual([
      { category: 'Food', total: 10.35, count: 2 },
      { category: 'Transport', total: 0, count: 0 },
      { category: 'Bills', total: 0, count: 0 },
      { category: 'Fun', total: 4.75, count: 1 },
      { category: 'Other', total: 0, count: 0 },
    ]);

    for (const id of ids) await request.delete(`${API}/expenses/${id}`);
  });

  test('GET /stats rejects a malformed month', async ({ request }) => {
    expect((await request.get(`${API}/stats?month=2026-00`)).status()).toBe(400);
  });
});
