import { Injectable, Logger } from '@nestjs/common';
import {
  ListOptions,
  DeleteOptions,
  LoadOptions,
  HistoryOptions,
  Ref,
} from './interfaces';
import {
  Collection,
  CollectionInput,
  Document,
  DocumentInput,
  HistoryResponse,
  ListResponse,
  ValueOp,
} from './schema';
import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  // private readonly diffService: DiffService,
  constructor(private readonly database: DatabaseService) {}

  getHello(): string {
    this.logger.debug('getHello()');
    return 'Hello World!';
  }

  async initialize(collection: CollectionInput): Promise<Collection> {
    // TODO create partitioned db tables
    return this.database.initialize(collection);
  }

  async list(
    collection: string,
    globalId: string,
    options?: ListOptions,
  ): Promise<ListResponse> {
    const [documents, nextPageToken] = await this.database.list(
      collection,
      globalId,
      options,
    );
    return {
      documents: documents.map((doc) => this.fromDbDocument(collection, doc)),
      nextPageToken,
    };
  }

  async load(ref: Ref, options?: LoadOptions): Promise<Document> {
    const document = await this.database.load(ref, options?.deleted);
    // TODO if at, load history; then apply backwards to determine the state at that time
    return this.fromDbDocument(ref.collection, document);
  }

  async save(
    collection: string,
    input: DocumentInput,
    options?: { merge?: boolean },
  ): Promise<Document> {
    let changes;
    try {
      const { system, id } = input;
      const ref = { collection, system, id };
      const document = await this.database.load(ref, true);

      if (options?.merge) {
        input = { ...document, ...input };
      }

      // TODO calculate diff
      changes = [
        {
          op: ValueOp.add,
          path: '/name',
          value: `mock ${collection}`,
        },
      ];
    } catch (error) {}

    const [document, event] = await this.database.save(input, changes);
    // TODO fire event

    return {
      ...this.fromDbDocument(collection, document),
      event,
    };
  }

  /** Set the deletedAt of a record. */
  async delete(ref: Ref, options?: DeleteOptions): Promise<Document> {
    return this.fromDbDocument(
      ref.collection,
      await this.database.delete(ref, options),
    );
  }

  async loadHistory(
    ref: Ref,
    options?: HistoryOptions,
  ): Promise<HistoryResponse> {
    const [events, nextPageToken] = await this.database.loadHistory(
      ref,
      options,
    );
    return { events, nextPageToken };
  }

  /** List records which share this record's global id. */
  async listRelated(ref: Ref, options?: ListOptions): Promise<ListResponse> {
    const { collection } = ref;
    const [documents, nextPageToken] = await this.database.listRelated(
      ref,
      options,
    );
    return {
      documents: documents.map((doc) => this.fromDbDocument(collection, doc)),
      nextPageToken,
    };
  }

  private fromDbDocument(collection: string, document): Document {
    const { system, id } = document;
    return {
      uri: `/${collection}/${system}/${id}`,
      collection,
      ...document,
    };
  }
}
