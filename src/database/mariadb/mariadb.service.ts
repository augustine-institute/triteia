import { Injectable, BeforeApplicationShutdown } from '@nestjs/common';
import * as mariadb from 'mariadb';
import { DatabaseService } from '../database.service';
import { MariadbConnection } from './mariadb-connection';

@Injectable()
export class MariadbService
  extends DatabaseService
  implements BeforeApplicationShutdown {
  /** A pool of db connections */
  private readonly pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: 3,
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

      const results = await duringTransaction(new MariadbConnection(conn));

      await conn.commit();
      return results;
    } catch (err) {
      if (conn) await conn.rollback();
      throw err;
    } finally {
      if (conn) await conn.release();
    }
  }
}
