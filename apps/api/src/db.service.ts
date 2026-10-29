import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

// Run once per process before the first query. Idempotent, so it is safe on every cold start.
const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS items (id SERIAL PRIMARY KEY, title TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now())',
  `CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    category TEXT NOT NULL,
    spent_at DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
].join(';\n');

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, max: 3 })
    : null;
  private ready: Promise<void> | null = null;

  get enabled(): boolean {
    return this.pool !== null;
  }

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.pool) throw new Error('DATABASE_URL is not set');
    this.ready ??= this.pool.query(SCHEMA).then(() => undefined);
    await this.ready;
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
