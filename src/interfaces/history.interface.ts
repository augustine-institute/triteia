import { Patch } from './patch.interface';

export interface Event {
  /** When did the update happen? */
  at: Date;

  /** The JSON patch of changes. */
  changes: Patch;

  /** A name or description of what triggered the change. */
  name?: string;

  // author,...?
}

export type History = Event[];
