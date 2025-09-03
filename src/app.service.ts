import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as jsonpatch from 'fast-json-patch';
import {
  ListOptions,
  DeleteOptions,
  LoadOptions,
  HistoryOptions,
  Ref,
} from './interfaces';
import {
  Change,
  Collection,
  CollectionInput,
  Event,
  EventInput,
  Document,
  DocumentInput,
  HistoryResponse,
  ListResponse,
} from './schema';
import { DatabaseService } from './database/database.service';
import { AppEvents } from './events/app.events';
import { DbDocument, DbEvent } from './database/interfaces';

type AnyRecord = Record<string | number | symbol, unknown>;

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly appEvents: AppEvents,
  ) {}

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
    if (options?.at) {
      // note: this does not get metadata at that time (id, globalId, etc)
      document.content = await this.loadContentAt(ref, options.at);
    }
    return this.fromDbDocument(ref.collection, document);
  }

  async save(
    ref: Ref,
    input: DocumentInput,
    options?: { merge?: boolean },
  ): Promise<Document> {
    let existing: DbDocument | null = null;
    let significant: number | string | undefined | null = null;

    const document = await this.database.withTransactionAndRetry(
      async (conn) => {
        try {
          existing = await conn.load(ref, true, true);
          this.checkDates(existing, input);

          if (options?.merge && input.content) {
            input.content = {
              ...existing.content,
              ...input.content,
            };
          }
        } catch (error) {
          if (error instanceof NotFoundException) {
            existing = null;
          } else {
            throw error;
          }
        }

        const { event: eventInput, ...docInput } = input;
        const dbDocument = existing
          ? await conn.update(ref, docInput)
          : await conn.create(ref.collection, docInput);

        // calculate diff and save the event if something happened
        let event = this.generateEvent(existing, dbDocument, eventInput || undefined);
        significant = event.changes.length || event.name;
        if (significant) {
          event = await conn.createEvent(ref, event);
        }

        const document = {
          ...this.fromDbDocument(ref.collection, dbDocument),
          event,
        };

        return document;
      },
    );

    if (significant) {
      // FIXME this might need to go in the transaction, so events can't be missed and then ignored on retries as insignificant
      await this.appEvents.emit('document', {
        op: existing ? 'updated' : 'created',
        document,
      });
    } else {
      this.logger.debug(`Insignificant event on ${document.uri}`);
    }

    return document;
  }

  /** Set the deletedAt of a record. */
  async delete(ref: Ref, options?: DeleteOptions): Promise<Document> {
    const document = await this.database.withTransactionAndRetry(
      async (conn) => {
        const document = this.fromDbDocument(
          ref.collection,
          await conn.delete(ref, options),
        );

        return document;
      },
    );

    await this.appEvents.emit('document', {
      op: 'deleted',
      document,
    });

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

  /** Load history; then apply in order to determine the state at that time. */
  private async loadContentAt(ref: Ref, at: string): Promise<AnyRecord> {
    const content: AnyRecord = {};
    let events: Event[] | undefined;
    let nextPageToken: string | undefined;
    while (events === undefined || nextPageToken) {
      [events, nextPageToken] = await this.database.loadHistory(ref, {
        pageToken: nextPageToken,
        asc: true,
      });
      for (const event of events) {
        if (event.at.toISOString() > at) {
          return content;
        }
        jsonpatch.applyPatch(content, event.changes as jsonpatch.Operation[]);
      }
    }
    return content;
  }

  /** Compare two documents and generate an event object. */
  private generateEvent(
    before: DbDocument | null,
    after: DbDocument,
    input?: EventInput,
  ): DbEvent {
    const changes = jsonpatch.compare(
      before?.content || {},
      after.content || {},
      true,
    );

    return {
      name: input?.name,
      at:
        before && before.updatedAt === after.updatedAt
          ? // no changes including updatedAt; use the current time for a unique `at`
            new Date()
          : after.updatedAt,
      changes: changes as Change[],
    };
  }
}
