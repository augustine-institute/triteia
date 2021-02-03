import { Rec } from './rec.interface';

export type SaveRequest = Omit<Rec, 'createdAt' | 'updatedAt'> &
  Partial<Pick<Rec, 'createdAt' | 'updatedAt'>> & {
    /** A name or description of what triggered the change. */
    event_name?: string;
  };
