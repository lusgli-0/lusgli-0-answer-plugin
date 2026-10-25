export type KnowledgeBase = {
  id: number;
  title: string;
  created_at?: string;
  updated_at?: string;
};

export type KnowledgeBaseNote = {
  id: number;
  knowledge_base_id: number;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
};

export type KnowledgeBaseListResponse = {
  status: number;
  data: {
    items: KnowledgeBase[];
  };
};

export type NoteListResponse = {
  items: KnowledgeBaseNote[];
};

export type NotePanel =
  | { type: 'empty' }
  | { type: 'detail'; noteId: number }
  | { type: 'create' }
  | { type: 'edit'; noteId: number };

export type RequestState = {
  loading: boolean;
  error: string;
};
