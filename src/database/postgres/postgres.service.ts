import { Injectable, BeforeApplicationShutdown } from '@nestjs/common';
import { Pool, DatabaseError } from 'pg';
import { DatabaseService } from '../database.service';
import { PostgresConnection } from './postgres-connection';

@Injectable()
export class PostgresService
  extends DatabaseService
  implements BeforeApplicationShutdown {
  protected retryDelay = 20;
  protected CONNECTION_LIMIT = process.env.DB_CONNECTION_LIMIT;

  private readonly pool = new Pool({
    application_name: 'triteia',

    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    max: this.CONNECTION_LIMIT ? Number(this.CONNECTION_LIMIT) : 10,
  });

  async beforeApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }

  async withConnection<T>(
    duringConnection: (conn: PostgresConnection) => Promise<T>,
  ): Promise<T> {
    const conn = await this.pool.connect();
    try {
      return await duringConnection(new PostgresConnection(conn));
    } finally {
      conn.release();
    }
  }

  async withTransaction<T>(
    duringTransaction: (conn: PostgresConnection) => Promise<T>,
  ): Promise<T> {
    const conn = await this.pool.connect();
    try {
      await conn.query('BEGIN');
      const result = await duringTransaction(
        new PostgresConnection(conn, true),
      );
      await conn.query('COMMIT');
      return result;
    } catch (err) {
      await conn.query('ROLLBACK');
      throw err;
    } finally {
      conn.release();
    }
  }

  protected shouldRetry(error): boolean {
    // TODO determine what errors should be retried
    if (error instanceof DatabaseError) {
      //if (error.code === '') {
      //  return true;
      //}
    }
    return false;
  }
}
