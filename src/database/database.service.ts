import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Ref, ListOptions, DeleteOptions, HistoryOptions } from '../interfaces';
import { Collection, CollectionInput, DocumentInput } from '../schema';
import { DbConnection, DbDocument, DbEvent } from './interfaces';

@Injectable()
export abstract class DatabaseService implements DbConnection {
  private readonly logger = new Logger(DatabaseService.name);

  /** Milliseconds to wait between attempts. */
  protected retryDelay = 0;

  /** Maximum number of attempts for some db transaction. */
  protected retryLimit = 5;

  abstract withTransaction<T>(
    duringTransaction: (conn: DbConnection) => Promise<T>,
  ): Promise<T>;

  async initialize(input: CollectionInput): Promise<Collection> {
    return this.withTransaction((conn) => {
      return conn.initialize(input);
    });
  }

  async withTransactionAndRetry<T>(
    duringTransaction: (conn: DbConnection) => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    for (let attempts = 0; attempts < this.retryLimit; attempts++) {
      if (attempts && this.retryDelay) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      }
      try {
        return await this.withTransaction(duringTransaction);
      } catch (error) {
        if (!this.shouldRetry(error)) {
          throw error;
        }
        this.logger.debug(
          `Failed transaction attempt: ${error.message.replace(/\n/g, ' ')}`,
        );
        lastError = error;
      }
    }
    this.logger.warn(
      `Failed transaction after ${this.retryLimit} attempts and ${
        Date.now() - startTime
      } ms`,
    );
    throw (
      lastError ||
      new InternalServerErrorException('Unexpected Error during Transaction')
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected shouldRetry(error): boolean {
    return false;
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
  ): Promise<DbDocument> {
    return this.withTransaction((conn) => {
      return conn.create(collection, document);
    });
  }

  async update(ref: Ref, document: DocumentInput): Promise<DbDocument> {
    return this.withTransaction((conn) => {
      return conn.update(ref, document);
    });
  }

  async createEvent(ref: Ref, event: DbEvent): Promise<DbEvent> {
    return this.withTransaction((conn) => {
      return conn.createEvent(ref, event);
    });
  }

  async delete(ref: Ref, options?: DeleteOptions): Promise<DbDocument> {
    return this.withTransaction((conn) => {
      return conn.delete(ref, options);
    });
  }
}
