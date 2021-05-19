import { EventEmitter } from 'promise-events';
import { StrictEventEmitter } from 'nest-emitter';
import { Document } from '../schema';

export interface AppEventTypes {
  document: {
    op: 'created' | 'updated' | 'deleted';
    document: Document;
  };
}
export type AnyAppEvent = AppEventTypes[keyof AppEventTypes];

// typescript "value" and "type" which allows for dependency injection and strict event types
export class AppEvents extends EventEmitter {}
export interface AppEvents
  extends StrictEventEmitter<EventEmitter, AppEventTypes> {}
