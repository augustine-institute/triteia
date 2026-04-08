export interface ListOptions {
  system?: string;
  id?: string;
  globalId?: string;
  globalIdPrefix?: string;
  name?: string;
  namePrefix?: string;
  date?: string;
  dateBefore?: string;
  dateAfter?: string;
  createdAt?: string;
  createdBefore?: string;
  createdAfter?: string;
  updatedAt?: string;
  updatedBefore?: string;
  updatedAfter?: string;
  withContent?: boolean;
  pageSize?: number;
  pageToken?: number;
  deleted?: boolean;
}
