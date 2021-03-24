import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ListOptions,
  DeleteOptions,
  LoadOptions,
  HistoryOptions,
  Ref,
} from './interfaces';
import {
  Change,
  ChangeOp,
  Collection,
  CollectionInput,
  Document,
  DocumentInput,
  HistoryResponse,
  ListResponse,
} from './schema';
import { DatabaseService } from './database/database.service';
import { DbDocument } from './database/interfaces';

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
    ref: Ref,
    input: DocumentInput,
    options?: { merge?: boolean },
  ): Promise<Document> {
    const [document, event] = await this.database.withTransaction(
      async (conn) => {
        let existing: DbDocument | null;
        try {
          existing = await conn.load(ref, true);
          this.checkDates(existing, input);

          if (options?.merge) {
            input = { ...existing, ...input };
          }
        } catch (error) {
          if (error instanceof NotFoundException) {
            existing = null;
          } else {
            throw error;
          }
        }

        // TODO calculate diff
        const changes: Change[] = [
          {
            op: ChangeOp.add,
            path: '/name',
            value: `mock ${ref.collection}`,
          },
        ];

        if (existing) {
          return await conn.update(ref, input, changes);
        } else {
          return await conn.create(ref.collection, input, changes);
        }
      },
    );

    // TODO fire event

    return {
      ...this.fromDbDocument(ref.collection, document),
      event,
    };
  }

  /** Set the deletedAt of a record. */
  async delete(ref: Ref, options?: DeleteOptions): Promise<Document> {
    const document = await this.fromDbDocument(
      ref.collection,
      await this.database.delete(ref, options),
    );
    // TODO fire event
    return document;
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

  private checkDates(existing: DbDocument, input: DocumentInput) {
    if (input.createdAt) {
      throw new BadRequestException(
        'Cannot change createdAt on an existing record',
      );
    }
    if (input.updatedAt && new Date(input.updatedAt) <= existing.updatedAt) {
      throw new BadRequestException(
        `Document was already updated at ${existing.updatedAt.toISOString()}`,
      );
    }
  }
}
