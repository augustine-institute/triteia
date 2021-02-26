import { Injectable } from '@nestjs/common';
import { Ref, ListOptions, DeleteOptions, HistoryOptions } from '../interfaces';
import {
  Collection,
  CollectionInput,
  ListResponse,
  Document,
  DocumentInput,
  Change,
  Event,
} from '../schema';
import { DbDocument, DbEvent } from './interfaces';

@Injectable()
export abstract class DatabaseService {
  abstract initialize(collection: CollectionInput): Promise<Collection>;

  abstract list(
    collection: string,
    globalId: string,
    options?: ListOptions,
  ): Promise<[DbDocument[], number?]>;

  abstract load(ref: Ref, deleted?: boolean): Promise<DbDocument>;

  abstract loadHistory(
    ref: Ref,
    options?: HistoryOptions,
  ): Promise<[DbEvent[], string?]>;

  abstract listRelated(
    ref: Ref,
    options?: ListOptions,
  ): Promise<[DbDocument[], number?]>;

  abstract save(
    document: DocumentInput,
    changes: Change[],
  ): Promise<[DbDocument, DbEvent]>;

  abstract delete(ref: Ref, options?: DeleteOptions): Promise<DbDocument>;
}
