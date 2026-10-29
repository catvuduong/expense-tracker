'use client';

import { Suspense, useEffect, useState } from 'react';
import { ExpenseTracker } from '@/components/expense-tracker';
import { API_URL } from '@/lib/expenses';

export default function Home() {
  const [health, setHealth] = useState<string>('checking...');

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then((d) => setHealth(`api ${d.status} / db ${d.db}`))
      .catch(() => setHealth('api unreachable'));
  }, []);

  return (
    <main className="app">
      {/* The tracker reads today's date, which Cache Components only allows at request time, so it sits behind a Suspense boundary. */}
      <Suspense fallback={<p className="muted">Loading expenses…</p>}>
        <ExpenseTracker />
      </Suspense>
      <p className="health" data-testid="health">
        {health}
      </p>
    </main>
  );
}
