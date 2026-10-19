export type KnowledgeBase = {
  id: number;
  title: string;
  created_at?: string;
  updated_at?: string;
};

export type KnowledgeBaseDocument = {
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

export type DocumentListResponse = {
  items: KnowledgeBaseDocument[];
};

export type DocumentPanel =
  | { type: 'empty' }
  | { type: 'detail'; documentId: number }
  | { type: 'create' }
  | { type: 'edit'; documentId: number };
