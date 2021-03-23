import {
  Ref,
  ListOptions,
  DeleteOptions,
  HistoryOptions,
} from '../../interfaces';
import {
  Collection,
  CollectionInput,
  DocumentInput,
  Change,
} from '../../schema';
import { DbDocument } from './db-document.interface';
import { DbEvent } from './db-event.interface';

export interface DbConnection {
  initialize(collection: CollectionInput): Promise<Collection>;

  list(
    collection: string,
    globalId: string,
    options?: ListOptions,
  ): Promise<[DbDocument[], number?]>;

  load(ref: Ref, deleted?: boolean): Promise<DbDocument>;

  loadHistory(
    ref: Ref,
    options?: HistoryOptions,
  ): Promise<[DbEvent[], string?]>;

  listRelated(
    ref: Ref,
    options?: ListOptions,
  ): Promise<[DbDocument[], number?]>;

  create(
    collection: string,
    document: DocumentInput,
    changes: Change[],
  ): Promise<[DbDocument, DbEvent]>;

  update(
    ref: Ref,
    document: DocumentInput,
    changes: Change[],
  ): Promise<[DbDocument, DbEvent]>;

  delete(ref: Ref, options?: DeleteOptions): Promise<DbDocument>;
}
