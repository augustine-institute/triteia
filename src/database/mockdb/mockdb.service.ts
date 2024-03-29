import { Injectable } from '@nestjs/common';
import {
  Ref,
  ListOptions,
  DeleteOptions,
  HistoryOptions,
} from '../../interfaces';
import {
  ChangeOp,
  Collection,
  CollectionInput,
  DocumentInput,
} from '../../schema';
import { DbConnection, DbDocument, DbEvent } from '../interfaces';
import { DatabaseService } from '../database.service';

@Injectable()
export class MockdbService extends DatabaseService {
  async initialize({ id }: CollectionInput): Promise<Collection> {
    return { id };
  }

  async list(
    collection: string,
    globalId: string,
    options?: ListOptions,
  ): Promise<[DbDocument[], number?]> {
    let documents = [
      {
        system: 'mock-system',
        id: 'mock-1234',
        globalId,
        name: `mock ${collection}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(options?.withContent && {
          content: { id: 'mock-1234', name: `mock ${collection}` },
        }),
      },
    ];
    if (options?.system) {
      documents = documents.filter((doc) => doc.system === options.system);
    }
    return [documents, 2];
  }

  async load(
    { collection, system, id }: Ref,
    deleted?: boolean,
  ): Promise<DbDocument> {
    return {
      system,
      id,
      name: `mock ${collection}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      content: { id, name: `mock ${collection}` },
      ...(deleted && { deletedAt: new Date() }),
    };
  }

  async loadHistory(
    ref: Ref,
    options?: HistoryOptions,
  ): Promise<[DbEvent[], string?]> {
    const event: DbEvent = {
      at: new Date(),
      changes: [
        {
          op: ChangeOp.add,
          path: '/name',
          value: `mock ${ref.collection}`,
        },
      ],
    };
    return [[event], undefined];
  }

  async listRelated(
    ref: Ref,
    options?: ListOptions,
  ): Promise<[DbDocument[], number?]> {
    // TODO query for global record basics that have the same global id
    const document = {
      system: 'mock-system',
      id: 'mock-1234',
      globalId: '9697ab7e-94f0-452e-9f0a-8e83165f946c',
      name: `mock ${ref.collection}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(options?.withContent && {
        content: { id: 'mock-1234', name: `mock ${ref.collection}` },
      }),
    };
    return [[document], 2];
  }

  async create(
    collection: string,
    document: DocumentInput,
  ): Promise<DbDocument> {
    return {
      ...document,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async update(ref: Ref, document: DocumentInput): Promise<DbDocument> {
    return {
      ...document,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async delete(
    { collection, system, id }: Ref,
    options?: DeleteOptions,
  ): Promise<DbDocument> {
    return {
      system,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      content: { id, name: `mock ${collection}` },
      deletedAt: options?.deletedAt ? new Date(options?.deletedAt) : new Date(),
    };
  }

  async createEvent(ref: Ref, event: DbEvent): Promise<DbEvent> {
    return event;
  }

  async withTransaction<T>(
    duringTransaction: (conn: DbConnection) => Promise<T>,
  ): Promise<T> {
    return await duringTransaction(this);
  }
}
