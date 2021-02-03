import { Rec } from './rec.interface';
import { Patch } from './patch.interface';

export interface SaveResponse {
  record: Rec;
  changes: Patch;
}
