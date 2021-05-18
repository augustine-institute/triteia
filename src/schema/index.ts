
/*
 * ------------------------------------------------------
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
    globalId?: string;
    name?: string;
    date?: Date;
    content?: JSONObject;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    event?: EventInput;
}

export class EventInput {
    name?: string;
}

export class Collection {
    id: string;
}

export class Document {
    uri: string;
    collection: string;
    system: string;
    id: string;
    globalId?: string;
    name?: string;
    date?: Date;
    content?: JSONObject;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    event?: Event;
    events?: Event[];
    related?: Document[];
}

export class Event {
    at: Date;
    changes: Change[];
    name?: string;
}

export class Change {
    op: ChangeOp;
    from?: string;
    path: string;
    value?: JSON;
}

export abstract class IMutation {
    abstract initialize(input: CollectionInput): Collection | Promise<Collection>;

    abstract save(collection: string, input: DocumentInput, merge?: boolean): Document | Promise<Document>;

    abstract delete(uri: string, deletedAt?: Date): Document | Promise<Document>;
}

export abstract class IQuery {
    abstract list(collection: string, system?: string, globalId?: string, pageToken?: number, pageSize?: number, deleted?: boolean): ListResponse | Promise<ListResponse>;

    abstract load(uri: string, deleted?: boolean, at?: Date): Document | Promise<Document>;

    abstract history(uri: string, pageToken?: string, pageSize?: number, asc?: boolean): HistoryResponse | Promise<HistoryResponse>;
}

export class ListResponse {
    documents: Document[];
    nextPageToken?: number;
}

export class HistoryResponse {
    events: Event[];
    nextPageToken?: string;
}

export type JSON = any;
export type JSONObject = any;
