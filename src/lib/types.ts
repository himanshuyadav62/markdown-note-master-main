export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string;
  uploadedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  attachments?: Attachment[];
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  linkedNoteIds: string[];
  deletedAt?: number;
  groupIds: string[];
  tags?: string[];
}

export interface TodoGroup {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  isDefault?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  data: any; // The workflow state (nodes, edges, meta)
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}
