
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export enum ChangeOp {
    add = "add",
    replace = "replace",
    test = "test",
    move = "move",
    copy = "copy",
    remove = "remove"
}

export class CollectionInput {
    id: string;
}

export class DocumentInput {
    system: string;
    id: string;
    globalId?: Nullable<string>;
    name?: Nullable<string>;
    date?: Nullable<Date>;
    content?: Nullable<JSONObject>;
    createdAt?: Nullable<Date>;
    updatedAt?: Nullable<Date>;
    deletedAt?: Nullable<Date>;
    event?: Nullable<EventInput>;
}

export class EventInput {
    name?: Nullable<string>;
}

export class Collection {
    id: string;
}

export class Document {
    uri: string;
    collection: string;
    system: string;
    id: string;
    globalId?: Nullable<string>;
    name?: Nullable<string>;
    date?: Nullable<Date>;
    content?: Nullable<JSONObject>;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Nullable<Date>;
    event?: Nullable<Event>;
    events?: Nullable<Event[]>;
    related?: Nullable<Document[]>;
}

export class Event {
    at: Date;
    changes: Change[];
    name?: Nullable<string>;
}

export class Change {
    op: ChangeOp;
    from?: Nullable<string>;
    path: string;
    value?: Nullable<JSON>;
}

export abstract class IMutation {
    abstract initialize(input: CollectionInput): Collection | Promise<Collection>;

    abstract save(collection: string, input: DocumentInput, merge?: Nullable<boolean>): Document | Promise<Document>;

    abstract delete(uri: string, deletedAt?: Nullable<Date>): Document | Promise<Document>;
}

export abstract class IQuery {
    abstract list(collection: string, system?: Nullable<string>, globalId?: Nullable<string>, pageToken?: Nullable<number>, pageSize?: Nullable<number>, deleted?: Nullable<boolean>): ListResponse | Promise<ListResponse>;

    abstract load(uri: string, deleted?: Nullable<boolean>, at?: Nullable<Date>): Document | Promise<Document>;

    abstract history(uri: string, pageToken?: Nullable<string>, pageSize?: Nullable<number>, asc?: Nullable<boolean>): HistoryResponse | Promise<HistoryResponse>;
}

export class ListResponse {
    documents: Document[];
    nextPageToken?: Nullable<number>;
}

export class HistoryResponse {
    events: Event[];
    nextPageToken?: Nullable<string>;
}

export type JSON = any;
export type JSONObject = any;
type Nullable<T> = T | null;
