export interface Rec {
  id: string;
  globalId?: string;
  name?: string;
  date?: Date;
  content: Record<string, unknown>;

  // parentId?
  // type or subtype??

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
