import { Injectable, BeforeApplicationShutdown } from '@nestjs/common';
import * as mariadb from 'mariadb';
import { DatabaseService } from '../database.service';
import { MariadbConnection } from './mariadb-connection';

@Injectable()
export class MariadbService
  extends DatabaseService
  implements BeforeApplicationShutdown {
  protected retryDelay = 20;
  protected CONNECTION_LIMIT = process.env.DB_CONNECTION_LIMIT;

  /** A pool of db connections */
  private readonly pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: this.CONNECTION_LIMIT ? Number(this.CONNECTION_LIMIT) : 10,
  });

  async beforeApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }

  async withConnection<T>(
    duringConnection: (conn: MariadbConnection) => Promise<T>,
  ): Promise<T> {
    let conn: mariadb.PoolConnection | null = null;
    try {
      conn = await this.pool.getConnection();
      return await duringConnection(new MariadbConnection(conn));
    } catch (err) {
      throw err;
    } finally {
      if (conn) await conn.release();
    }
  }

  async withTransaction<T>(
    duringTransaction: (conn: MariadbConnection) => Promise<T>,
  ): Promise<T> {
    let conn: mariadb.PoolConnection | null = null;
    try {
      conn = await this.pool.getConnection();
      await conn.beginTransaction();

      const results = await duringTransaction(
        new MariadbConnection(conn, true),
      );

      await conn.commit();
      return results;
    } catch (err) {
      if (conn) await conn.rollback();
      throw err;
    } finally {
      if (conn) await conn.release();
    }
  }

  protected shouldRetry(error): boolean {
    // TODO determine what other types errors should be retried
    if (error instanceof mariadb.SqlError) {
      if (error.errno === 1062) {
        // we should only get a duplicate if an event timestamp matches exactly
        return true;
      } else if (error.errno === 1213) {
        // Deadlock found when trying to get lock; try restarting transaction
        return true;
      }
    }
    return false;
  }
}
