import { Rec } from './rec.interface';

/** The metadata of a record without it's content. */
export type Ref = Omit<Rec, 'content'> & {
  system: string;
};
