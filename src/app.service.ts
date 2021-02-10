import { Injectable, Logger } from '@nestjs/common';
import { Ref } from './interfaces';
import {
  Document,
  HistoryResponse,
  ListResponse,
  DocumentInput,
  ValueOp,
} from './schema';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  //constructor(
  //  private readonly dbService: DbService,
  //  private readonly diffService: DiffService,
  //) {}

  getHello(): string {
    this.logger.debug('getHello()');
    return 'Hello World!';
  }

  async list(
    collection: string,
    globalId: string,
    options?: { system?: string; withContent?: boolean; deleted?: boolean },
  ): Promise<ListResponse> {
    // TODO query for global record basics that have the same global id
    let documents = [
      {
        uri: `/${collection}/mock-system/mock-1234`,
        collection,
        globalId,
        system: 'mock-system',
        id: 'mock-1234',
        name: `mock ${collection}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(options?.withContent && {
          content: {
            id: 'mock-1234',
            name: `mock ${collection}`,
          },
        }),
      },
    ];
    if (options?.system) {
      // TODO this can probably be handled more efficiently by the db
      documents = documents.filter((doc) => doc.system === options.system);
    }
    return { documents };
  }

  async load(
    { collection, system, id }: Ref,
    options?: { deleted?: boolean; at?: string },
  ): Promise<Document> {
    // TODO load record or throw 404
    // TODO if at, load history; then apply backwards to determine the state at that time
    return {
      uri: `/${collection}/${system}/${id}`,
      collection,
      system,
      id,
      name: `mock ${collection}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      content: { id, name: `mock ${collection}` },
    };
  }

  async save(
    collection: string,
    { event, ...document }: DocumentInput,
    options?: { merge?: boolean },
  ): Promise<Document> {
    // TODO load record or throw 404
    // TODO calculate diff
    // TODO save record with diff
    return {
      collection,
      ...document,
      uri: `/${collection}/${document.system}/${document.id}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      event: {
        at: new Date(),
        name: event?.name,
        changes: [
          {
            op: ValueOp.add,
            path: '/name',
            value: `mock ${collection}`,
          },
        ],
      },
    };
  }

  /** Set the deletedAt of a record. */
  async delete(
    { collection, system, id }: Ref,
    options?: { deletedAt?: string | Date },
  ): Promise<Document> {
    // TODO set deletedAt on record
    return {
      uri: `/${collection}/${system}/${id}`,
      collection,
      system,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      content: { id, name: `mock ${collection}` },
      deletedAt: new Date(),
    };
  }

  async loadHistory(
    { collection, system, id }: Ref,
    options?: { pageSize?: number; pageToken?: string },
  ): Promise<HistoryResponse> {
    // TODO load history of record
    return {
      events: [
        {
          at: new Date(),
          changes: [
            {
              op: ValueOp.add,
              path: '/name',
              value: `mock ${collection}`,
            },
          ],
        },
      ],
    };
  }

  /** List records which share this record's global id. */
  async listRelated(
    { collection, system, id }: Ref,
    options?: { system?: string; withContent?: boolean; deleted?: boolean },
  ): Promise<ListResponse> {
    // TODO query for global record basics that have the same global id
    return {
      documents: [
        {
          uri: `/${collection}/mock-system/mock-1234`,
          collection,
          system: 'mock-system',
          id: 'mock-1234',
          globalId: '9697ab7e-94f0-452e-9f0a-8e83165f946c',
          name: `mock ${collection}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
  }
}
