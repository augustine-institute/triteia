import { Document } from '../../schema';

export type DbDocument = Omit<
  Document,
  'uri' | 'collection' | 'event' | 'events' | 'related'
>;
