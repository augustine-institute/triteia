import { Logger, NotFoundException } from '@nestjs/common';
import * as mariadb from 'mariadb';
import {
  Ref,
  ListOptions,
  DeleteOptions,
  HistoryOptions,
} from '../../interfaces';
import {
  Change,
  Collection,
  CollectionInput,
  DocumentInput,
} from '../../schema';
import { DbConnection, DbDocument, DbEvent } from '../interfaces';

export class MariadbConnection implements DbConnection {
  private readonly logger = new Logger(MariadbConnection.name);

  /**
   * Whether or not to partition tables
   *
   * Note: FKs are not supported on 10.5: https://jira.mariadb.org/browse/MDEV-12483
   */
  private readonly partitioned = process.env?.DB_PARTITIONED === 'true';

  constructor(private conn: mariadb.Connection) {}

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
    const conditions = ['globalId = ?'];
    const params = [globalId];
    const pageSize = Number(options?.pageSize || 100);
    const pageToken = Number(options?.pageToken || 0);

    if (options?.system) {
      conditions.push('system = ?');
      params.push(options.system);
    }
    if (!options?.deleted) {
      conditions.push('deletedAt IS NULL');
    }

    const results = await this.conn.query(
      `SELECT system, id, globalId, name, date, createdAt, updatedAt, deletedAt
         ${options?.withContent ? ', content' : ''}
       FROM ${this.conn.escapeId(collection)}
       WHERE ${conditions.join(' AND ')}
       ORDER BY createdAt ASC
       LIMIT ${pageToken},${pageSize}`,
      params,
    );
    return [
      results,
      results?.length === pageSize ? pageSize + pageToken : undefined,
    ];
  }

  async load(
    { collection, system, id }: Ref,
    deleted?: boolean,
  ): Promise<DbDocument> {
    const q = `SELECT *
      FROM ${this.conn.escapeId(collection)}
      WHERE system = ? AND id = ?
        ${deleted ? '' : 'AND deletedAt IS NULL'}
      LIMIT 1`;
    const results = await this.conn.query(q, [system, id]);
    if (!results?.[0]) {
      throw new NotFoundException();
    }
    return results[0];
  }

  async loadHistory(
    { collection, system, id }: Ref,
    options?: HistoryOptions,
  ): Promise<[DbEvent[], string?]> {
    const conditions = ['system = ?', 'id = ?'];
    const params = [system, id];
    const pageSize = Number(options?.pageSize || 100);

    if (options?.pageToken) {
      conditions.push('at < ?');
      params.push(options.pageToken);
    }

    const results = await this.conn.query(
      `SELECT *
       FROM ${this.conn.escapeId(`${collection}Events`)}
       WHERE ${conditions.join(' AND ')}
       ORDER BY at DESC
       LIMIT ${pageSize}`,
      params,
    );
    return [results, results?.[pageSize - 1]?.at];
  }

  async listRelated(
    { collection, system, id }: Ref,
    options?: ListOptions,
  ): Promise<[DbDocument[], number?]> {
    const conditions = ['d.system = ?', 'd.id = ?'];
    const params = [system, id];
    const pageSize = Number(options?.pageSize || 100);
    const pageToken = Number(options?.pageToken || 0);

    if (options?.system) {
      conditions.push('r.system = ?');
      params.push(options.system);
    }
    if (!options?.deleted) {
      conditions.push('r.deletedAt IS NULL');
    }

    const results = await this.conn.query(
      `SELECT r.system, r.id, r.globalId, r.name, r.date,
         r.createdAt, r.updatedAt, r.deletedAt
         ${options?.withContent ? ', r.content' : ''}
       FROM ${this.conn.escapeId(collection)} d
       INNER JOIN ${this.conn.escapeId(collection)} r
         ON r.globalId = d.globalId AND r.system != d.system
       WHERE ${conditions.join(' AND ')}
       ORDER BY createdAt ASC
       LIMIT ${pageToken},${pageSize}`,
      params,
    );
    return [
      results,
      results?.length === pageSize ? pageSize + pageToken : undefined,
    ];
  }

  async create(
    collection: string,
    input: DocumentInput,
    changes: Change[],
  ): Promise<[DbDocument, DbEvent]> {
    const { system, id } = input;
    const ref = { collection, system, id };
    const data = this.cleanDocumentInput(input);

    return await Promise.all([
      this.doInsert(collection, data).then(() => this.load(ref, true)),
      this.insertEvent(ref, changes, input)
        .then(() => this.loadHistory(ref, { pageSize: 1 }))
        .then((results) => results?.[0]?.[0]),
    ]);
  }

  async update(
    ref: Ref,
    input: DocumentInput,
    changes: Change[],
  ): Promise<[DbDocument, DbEvent]> {
    const { collection, system, id } = ref;
    const data = this.cleanDocumentInput(input);
    const columns = Object.keys(data).map((k) => this.conn.escapeId(k));

    const doUpdate = this.conn.query(
      `UPDATE ${this.conn.escapeId(collection)}
       SET ${columns.map((c) => `${c} = ?`).join(', ')}
       WHERE system = ? AND id = ?
       LIMIT 1`,
      [...Object.values(data), system, id],
    );
    const results = await Promise.all([
      doUpdate.then(() => this.load(ref, true)),
      this.insertEvent(ref, changes, input)
        .then(() => this.loadHistory(ref, { pageSize: 1 }))
        .then((results) => results?.[0]?.[0]),
    ]);
    return results;
  }

  async delete(ref: Ref, options?: DeleteOptions): Promise<DbDocument> {
    const existing = await this.load(ref, true);

    const params: Array<string | Date> = [];
    let deletedAtExpr = 'now()';
    if (options?.deletedAt) {
      deletedAtExpr = '?';
      params.push(this.formatDatetime(options.deletedAt));
    }

    await this.conn.query(
      `UPDATE ${this.conn.escapeId(ref.collection)}
       SET deletedAt = ${deletedAtExpr}
       WHERE system = ? AND id = ?
       LIMIT 1`,
      [...params, ref.system, ref.id],
    );

    return existing;
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

  protected async insertEvent(
    { collection, system, id }: Ref,
    changes: Change[],
    input?: DocumentInput,
  ) {
    const data = { system, id, changes: JSON.stringify(changes) };
    if (input?.event?.name) {
      data['name'] = input.event.name;
    }
    if (input?.updatedAt) {
      data['at'] = this.formatDatetime(input.updatedAt);
    }

    return this.doInsert(`${collection}Events`, data);
  }

  protected formatDatetime(date: string | Date) {
    return new Date(date).toISOString().replace('T', ' ').replace('Z', '');
  }

  protected async createDocumentTable(id: string) {
    await this.conn.query(
      `CREATE TABLE IF NOT EXISTS ${this.conn.escapeId(id)} (
         system VARCHAR(255) NOT NULL,
         id VARCHAR(255) NOT NULL,
         globalId VARCHAR(255),
         name VARCHAR(255),
         date DATETIME,
         content JSON,
         createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
         deletedAt TIMESTAMP NULL DEFAULT NULL,
         PRIMARY KEY (system, id),
         KEY (globalId),
         KEY (name),
         KEY (date),
         Key (createdAt),
         Key (updatedAt)
       )
       ENGINE=InnoDB DEFAULT CHARSET=utf8
       ${this.partitioned ? 'PARTITION BY KEY (system)' : ''}`,
    );
  }

  protected async createEventTable(id: string) {
    const table = `${id}Events`;
    await this.conn.query(
      `CREATE TABLE IF NOT EXISTS ${this.conn.escapeId(table)} (
         system VARCHAR(255) NOT NULL,
         id VARCHAR(255) NOT NULL,
         at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         name VARCHAR(255),
         changes JSON,
         PRIMARY KEY (system, id, at),
         CONSTRAINT fkSystemId FOREIGN KEY (system, id)
         REFERENCES ${this.conn.escapeId(id)} (system, id)
         ON DELETE CASCADE ON UPDATE CASCADE
       )
       ENGINE=InnoDB DEFAULT CHARSET=utf8
       ${this.partitioned ? 'PARTITION BY KEY (system)' : ''}`,
    );
  }

  private async doInsert(tableName: string, data: Record<string, unknown>) {
    const table = this.conn.escapeId(tableName);
    const columns = Object.keys(data).map((k) => this.conn.escapeId(k));
    return this.conn.query(
      `INSERT INTO ${table} (${columns.join(',')})
       VALUES (${Array(columns.length).fill('?').join(',')})`,
      Object.values(data),
    );
  }
}
