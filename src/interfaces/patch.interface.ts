/**
 * @see http://jsonpatch.com/
 */

export interface ValueOp {
  op: 'add' | 'replace' | 'test';
  path: string;
  value: any;
}

export interface CopyOp {
  op: 'copy';
  from: string;
  path: string;
}

export interface MoveOp {
  op: 'move';
  from: string;
  path: string;
}

export interface RemoveOp {
  op: 'remove';
  path: string;
}

export type Op = ValueOp | CopyOp | MoveOp | RemoveOp;
export type Patch = Op[];
