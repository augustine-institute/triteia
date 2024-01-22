import { Logger, NotFoundException } from '@nestjs/common';
import { Client, PoolClient } from 'pg';
import {
  Ref,
  ListOptions,
  DeleteOptions,
  HistoryOptions,
} from '../../interfaces';
import { Collection, CollectionInput, DocumentInput } from '../../schema';
import { DbConnection, DbDocument, DbEvent } from '../interfaces';

export class PostgresConnection implements DbConnection {
  private readonly logger = new Logger(PostgresConnection.name);
  private readonly partitioned = process.env?.DB_PARTITIONED === 'true';

  constructor(
    private readonly conn: Client | PoolClient,
    public readonly inTransaction = false,
  ) {}

  async initialize({ id }: CollectionInput): Promise<Collection> {
    await this.createDocumentTable(id);
    await this.createEventTable(id);
    return { id };
  }

  async list(
    collection: string,
    globalId: string,
    options?: ListOptions,
  ): Promise<[DbDocument[], number?]> {
    const conditions = ['"globalId" = $1'];
    const params = [globalId];

    if (options?.system) {
      params.push(options.system);
      conditions.push(`system = $${params.length}`);
    }
    if (!options?.deleted) {
      conditions.push('"deletedAt" IS NULL');
    }

    const pageSize = Number(options?.pageSize || 100);
    const pageToken = Number(options?.pageToken || 0);

    const { rows } = await this.conn.query(
      `SELECT system, id, "globalId", name, date, "createdAt", "updatedAt", "deletedAt"
         ${options?.withContent ? ', content' : ''}
       FROM ${this.conn.escapeIdentifier(collection)}
       WHERE ${conditions.join(' AND ')}
       ORDER BY "createdAt" ASC
       OFFSET ${pageToken}
       LIMIT ${pageSize}`,
      params,
    );
    return [rows, rows.length === pageSize ? pageSize + pageToken : undefined];
  }

  async load(
    { collection, system, id }: Ref,
    deleted?: boolean,
    forUpdate?: boolean,
  ): Promise<DbDocument> {
    const q = `SELECT *
      FROM ${this.conn.escapeIdentifier(collection)}
      WHERE system = $1 AND id = $2
        ${deleted ? '' : 'AND "deletedAt" IS NULL'}
      LIMIT 1 ${forUpdate ? 'FOR UPDATE' : ''}`;
    const { rows } = await this.conn.query(q, [system, id]);
    if (!rows[0]) {
      //if (forUpdate && this.inTransaction) {
      //  // release the lock, so that we don't run into a deadlock with inserts
      //  // mariadb/mysql locks a block of ids, instead of a single row when it doesn't exist, postgres may do the same
      //  await this.conn.query('COMMIT');
      //  await this.conn.query('BEGIN');
      //}
      throw new NotFoundException();
    }
    return rows[0];
  }

  async loadHistory(
    { collection, system, id }: Ref,
    options?: HistoryOptions,
  ): Promise<[DbEvent[], string?]> {
    const conditions = ['system = $1', 'id = $2'];
    const params = [system, id];
    const pageSize = Number(options?.pageSize || 100);

    if (options?.pageToken) {
      params.push(options.pageToken);
      conditions.push(`at ${options?.asc ? '>' : '<'} $${params.length}`);
    }

    const { rows } = await this.conn.query(
      `SELECT *
       FROM ${this.conn.escapeIdentifier(`${collection}Events`)}
       WHERE ${conditions.join(' AND ')}
       ORDER BY at ${options?.asc ? 'ASC' : 'DESC'}
       LIMIT ${pageSize}`,
      params,
    );
    return [rows, rows[pageSize - 1]?.at];
  }

  async listRelated(
    { collection, system, id }: Ref,
    options?: ListOptions,
  ): Promise<[DbDocument[], number?]> {
    const conditions = ['d.system = $1', 'd.id = $2'];
    const params = [system, id];
    const pageSize = Number(options?.pageSize || 100);
    const pageToken = Number(options?.pageToken || 0);

    if (options?.system) {
      params.push(options.system);
      conditions.push('r.system = $3');
    }
    if (!options?.deleted) {
      conditions.push('r."deletedAt" IS NULL');
    }

    const { rows } = await this.conn.query(
      `SELECT r.system, r.id, r."globalId", r.name, r.date,
         r."createdAt", r."updatedAt", r."deletedAt"
         ${options?.withContent ? ', r.content' : ''}
       FROM ${this.conn.escapeIdentifier(collection)} d
       INNER JOIN ${this.conn.escapeIdentifier(collection)} r
         ON r."globalId" = d."globalId" AND r.system != d.system
       WHERE ${conditions.join(' AND ')}
       ORDER BY "createdAt" ASC
       OFFSET ${pageToken}
       LIMIT ${pageSize}`,
      params,
    );
    return [rows, rows.length === pageSize ? pageSize + pageToken : undefined];
  }

  async create(collection: string, input: DocumentInput): Promise<DbDocument> {
    const data = this.cleanDocumentInput(input);
    return await this.doInsert(collection, data);
  }

  async update(ref: Ref, input: DocumentInput): Promise<DbDocument> {
    const { collection, system, id } = ref;

    const data = this.cleanDocumentInput(input);
    if (data.system === ref.system) delete data.system;
    if (data.id === ref.id) delete data.id;
    if (!data.updatedAt) data.updatedAt = new Date();

    const columns = Object.keys(data).map((k) => this.conn.escapeIdentifier(k));

    const { rows } = await this.conn.query(
      `UPDATE ${this.conn.escapeIdentifier(collection)}
       SET ${columns.map((c, i) => `${c} = $${i + 3}`).join(', ')}
       WHERE system = $1 AND id = $2
       RETURNING *`,
      [system, id, ...Object.values(data)],
    );
    return rows[0];
  }

  async delete(ref: Ref, options?: DeleteOptions): Promise<DbDocument> {
    const params: Array<string | Date> = [ref.system, ref.id];

    let deletedAtExpr = 'now()';
    if (options?.deletedAt) {
      deletedAtExpr = '$3';
      params.push(this.formatDatetime(options.deletedAt));
    }

    const { rows } = await this.conn.query(
      `UPDATE ${this.conn.escapeIdentifier(ref.collection)}
       SET "deletedAt" = ${deletedAtExpr}
       WHERE system = $1 AND id = $2
         AND "deletedAt" IS NULL
       RETURNING *`,
      params,
    );

    if (!rows[0]) {
      throw new NotFoundException();
    }
    return rows[0];
  }

  protected cleanDocumentInput(input: DocumentInput) {
    const data: Record<string, unknown> = {
      ...input,
      ...(input.createdAt && {
        createdAt: this.formatDatetime(input.createdAt),
      }),
      ...(input.updatedAt && {
        updatedAt: this.formatDatetime(input.updatedAt),
      }),
      ...(input.deletedAt && {
        deletedAt: this.formatDatetime(input.deletedAt),
      }),
    };
    return data;
  }

  async createEvent(ref: Ref, event: DbEvent): Promise<DbEvent> {
    const { collection, system, id } = ref;
    const data = {
      system,
      id,
      changes: JSON.stringify(event.changes),
      at: this.formatDatetime(event.at),
      ...(event.name && { name: event.name }),
    };

    return await this.doInsert(`${collection}Events`, data);
  }

  protected formatDatetime(date: string | Date) {
    return date instanceof Date ? date : new Date(date);
  }

  protected async createDocumentTable(id: string) {
    const table = this.conn.escapeIdentifier(id);
    await this.conn.query(
      `CREATE TABLE IF NOT EXISTS ${table} (
         "system" VARCHAR(255) NOT NULL,
         "id" VARCHAR(255) NOT NULL,
         "globalId" VARCHAR(255),
         "name" VARCHAR(255),
         "date" TIMESTAMP,
         "content" JSON,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         "deletedAt" TIMESTAMP(3) NULL DEFAULT NULL,
         PRIMARY KEY ("system", "id")
       )
       ${this.partitioned ? 'PARTITION BY LIST ("system")' : ''}`,
    );
    for (const name of ['globalId', 'name', 'date', 'createdAt', 'updatedAt']) {
      await this.conn.query(
        `CREATE INDEX IF NOT EXISTS "${name}_idx" ON ${table} ("${name}")`,
      );
    }
  }

  protected async createEventTable(id: string) {
    const table = `${id}Events`;
    const constraint = `${id}_fkSystemId`;
    await this.conn.query(
      `CREATE TABLE IF NOT EXISTS ${this.conn.escapeIdentifier(table)} (
         "system" VARCHAR(255) NOT NULL,
         "id" VARCHAR(255) NOT NULL,
         "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         "name" VARCHAR(255),
         "changes" JSON,
         PRIMARY KEY ("system", "id", "at"),
         CONSTRAINT ${this.conn.escapeIdentifier(constraint)}
           FOREIGN KEY ("system", "id")
           REFERENCES ${this.conn.escapeIdentifier(id)} ("system", "id")
           ON DELETE CASCADE
           ON UPDATE CASCADE
       )
       ${this.partitioned ? 'PARTITION BY LIST ("system")' : ''}`,
    );
  }

  private async doInsert(tableName: string, data: Record<string, unknown>) {
    const table = this.conn.escapeIdentifier(tableName);
    const columns = Object.keys(data).map((k) => this.conn.escapeIdentifier(k));
    const values = columns.map((_, i) => `$${i + 1}`);
    const { rows } = await this.conn.query(
      `INSERT INTO ${table} (${columns.join(',')})
       VALUES (${values.join(',')})
       RETURNING *
      `,
      Object.values(data),
    );
    return rows[0];
  }
}
