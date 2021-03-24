import { Event } from '../../schema';
import { JsonPatch } from '../../interfaces';

export interface DbEvent extends Event {
  changes: JsonPatch;
}
