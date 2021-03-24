import { Injectable } from '@nestjs/common';
import { Ref, ListOptions, DeleteOptions, HistoryOptions } from '../interfaces';
import { Change, Collection, CollectionInput, DocumentInput } from '../schema';
import { DbConnection, DbDocument, DbEvent } from './interfaces';

@Injectable()
export abstract class DatabaseService implements DbConnection {
  abstract withTransaction<T>(
    duringTransaction: (conn: DbConnection) => Promise<T>,
  ): Promise<T>;

  async initialize(input: CollectionInput): Promise<Collection> {
    return this.withTransaction((conn) => {
      return conn.initialize(input);
    });
  }

  async list(
    collection: string,
    globalId: string,
    options?: ListOptions,
  ): Promise<[DbDocument[], number?]> {
    return this.withTransaction((conn) => {
      return conn.list(collection, globalId, options);
    });
  }

  async load(ref: Ref, deleted?: boolean): Promise<DbDocument> {
    return this.withTransaction((conn) => {
      return conn.load(ref, deleted);
    });
  }

  async loadHistory(
    ref: Ref,
    options?: HistoryOptions,
  ): Promise<[DbEvent[], string?]> {
    return this.withTransaction((conn) => {
      return conn.loadHistory(ref, options);
    });
  }

  async listRelated(
    ref: Ref,
    options?: ListOptions,
  ): Promise<[DbDocument[], number?]> {
    return this.withTransaction((conn) => {
      return conn.listRelated(ref, options);
    });
  }

  async create(
    collection: string,
    document: DocumentInput,
    changes: Change[],
  ): Promise<[DbDocument, DbEvent]> {
    return this.withTransaction((conn) => {
      return conn.create(collection, document, changes);
    });
  }

  async update(
    ref: Ref,
    document: DocumentInput,
    changes: Change[],
  ): Promise<[DbDocument, DbEvent]> {
    return this.withTransaction((conn) => {
      return conn.update(ref, document, changes);
    });
  }

  async delete(ref: Ref, options?: DeleteOptions): Promise<DbDocument> {
    return this.withTransaction((conn) => {
      return conn.delete(ref, options);
    });
  }
}
