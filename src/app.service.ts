import { Injectable, Logger } from '@nestjs/common';
import { Rec, Ref, History, SaveResponse, SaveRequest } from './interfaces';

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

  async lookup(
    collection: string,
    globalId: string,
    options?: { deleted?: boolean },
  ): Promise<Ref[]> {
    // TODO query for global record basics that have the same global id
    return [
      {
        globalId,
        system: 'mock-system',
        id: 'mock-1234',
        name: `mock ${collection}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  async loadByGlobalId(
    collection: string,
    globalId: string,
    system: string,
    options?: { deleted?: boolean; at?: string },
  ): Promise<Rec[]> {
    // TODO this can probably be handled more efficiently by the db
    return Promise.all(
      (await this.lookup(collection, globalId, options))
        .filter((ref) => ref.system === system)
        .map(async (ref) => this.load(collection, system, ref.id, options)),
    );
  }

  async load(
    collection: string,
    system: string,
    id: string,
    options?: { deleted?: boolean; at?: string },
  ): Promise<Rec> {
    // TODO load record or throw 404
    // TODO if at, load history; then apply backwards to determine the state at that time
    return {
      id,
      name: `mock ${collection}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      content: { id, name: `mock ${collection}` },
    };
  }

  async save(
    collection: string,
    system: string,
    data: SaveRequest,
    options?: { merge?: boolean },
  ): Promise<SaveResponse> {
    // TODO load record or throw 404
    // TODO calculate diff
    // TODO save record with diff
    return {
      record: {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      changes: [{ op: 'add', path: '/name', value: `mock ${collection}` }],
    };
  }

  /** Set the deletedAt of a record. */
  async delete(
    collection: string,
    system: string,
    id: string,
    options?: { deletedAt?: string },
  ): Promise<Rec> {
    // TODO set deletedAt on record
    return {
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      content: { id, name: `mock ${collection}` },
      deletedAt: new Date(),
    };
  }

  async loadHistory(
    collection: string,
    system: string,
    id: string,
  ): Promise<History> {
    // TODO load history of record
    return [
      {
        at: new Date(),
        changes: [{ op: 'add', path: '/name', value: `mock ${collection}` }],
      },
    ];
  }

  /** List records which share this record's global id. */
  async listRelated(
    collection: string,
    system: string,
    id: string,
    options?: { deleted?: boolean; at?: string },
  ): Promise<Ref[]> {
    // TODO query for global record basics that have the same global id
    return [
      {
        globalId: '9697ab7e-94f0-452e-9f0a-8e83165f946c',
        system: 'mock-system',
        id: 'mock-1234',
        name: `mock ${collection}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }
}
