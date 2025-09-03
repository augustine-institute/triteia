export interface ListOptions {
  system?: string;
  id?: string;
  globalId?: string;
  name?: string;
  date?: string;
  withContent?: boolean;
  pageSize?: number;
  pageToken?: number;
  deleted?: boolean;
}
