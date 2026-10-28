import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface IDatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  transaction<T>(callback: (client: IDatabaseClient) => Promise<T>): Promise<T>;
  isPostgres: boolean;
  close(): Promise<void>;
}

class PostgresDatabaseClient implements IDatabaseClient {
  private pool: Pool;
  public isPostgres = true;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const res = await this.pool.query(sql, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount ?? res.rows.length,
    };
  }

  async transaction<T>(callback: (client: IDatabaseClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const wrapper: IDatabaseClient = {
        isPostgres: true,
        query: async <R = any>(sql: string, params: any[] = []) => {
          const res = await client.query(sql, params);
          return { rows: res.rows as R[], rowCount: res.rowCount ?? res.rows.length };
        },
        transaction: async () => { throw new Error('Nested transactions not supported'); },
        close: async () => {},
      };
      const result = await callback(wrapper);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class SqliteDatabaseClient implements IDatabaseClient {
  private db: sqlite3.Database;
  public isPostgres = false;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new sqlite3.Database(dbPath);
    this.db.run('PRAGMA foreign_keys = ON;');
  }

  // Convert PostgreSQL $1, $2, $3 to SQLite ?, ?, ?
  private adaptSql(sql: string): string {
    return sql.replace(/\$(\d+)/g, '?');
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const adaptedSql = this.adaptSql(sql);
    const isSelect = /^\s*(SELECT|PRAGMA)/i.test(adaptedSql);

    return new Promise((resolve, reject) => {
      if (isSelect) {
        this.db.all(adaptedSql, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows: (rows || []) as T[], rowCount: rows?.length || 0 });
        });
      } else {
        this.db.run(adaptedSql, params, function (err) {
          if (err) return reject(err);
          // If returning clause was present, simulate or fetch row
          resolve({ rows: [{ id: this.lastID }] as any, rowCount: this.changes });
        });
      }
    });
  }

  async transaction<T>(callback: (client: IDatabaseClient) => Promise<T>): Promise<T> {
    await this.query('BEGIN TRANSACTION');
    try {
      const result = await callback(this);
      await this.query('COMMIT');
      return result;
    } catch (err) {
      await this.query('ROLLBACK');
      throw err;
    }
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

let dbInstance: IDatabaseClient | null = null;

export async function getDatabase(): Promise<IDatabaseClient> {
  if (dbInstance) return dbInstance;

  const pgUrl = process.env.DATABASE_URL;
  const allowFallback = process.env.USE_SQLITE_FALLBACK !== 'false';

  if (pgUrl && pgUrl.startsWith('postgres')) {
    try {
      const pgClient = new PostgresDatabaseClient(pgUrl);
      // Health probe
      await pgClient.query('SELECT 1 as alive');
      console.log('✓ Connected to PostgreSQL database.');
      dbInstance = pgClient;
      return dbInstance;
    } catch (err: any) {
      console.warn(`PostgreSQL connection failed (${err.message}).`);
      if (!allowFallback) {
        throw new Error(`PostgreSQL required but unavailable: ${err.message}`);
      }
      console.log('→ Falling back to resilient local database for Windows environment.');
    }
  }

  const sqlitePath = process.env.SQLITE_DB_PATH || path.join(__dirname, 'certishield.db');
  dbInstance = new SqliteDatabaseClient(sqlitePath);
  console.log(`✓ Connected to local database: ${sqlitePath}`);
  return dbInstance;
}
