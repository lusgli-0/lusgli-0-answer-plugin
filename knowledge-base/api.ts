import { LOGGED_TOKEN_STORAGE_KEY } from '@/common/constants';

import type {
  DocumentListResponse,
  KnowledgeBase,
  KnowledgeBaseDocument,
  KnowledgeBaseListResponse,
} from './types';

const KNOWLEDGE_BASE_API = '/answer/api/v1/knowledge-base';

async function requestJSON<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem(LOGGED_TOKEN_STORAGE_KEY) || '';
  const headers = new Headers(options.headers);
  headers.set('Authorization', token);

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function listKnowledgeBases(): Promise<KnowledgeBaseListResponse> {
  return requestJSON(KNOWLEDGE_BASE_API);
}

export function createKnowledgeBase(title: string): Promise<KnowledgeBase> {
  return requestJSON(KNOWLEDGE_BASE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
}

export function deleteKnowledgeBase(id: number): Promise<{ message: string }> {
  return requestJSON(`${KNOWLEDGE_BASE_API}/${id}`, {
    method: 'DELETE',
  });
}

export function listDocuments(
  knowledgeBaseId: number,
): Promise<DocumentListResponse> {
  return requestJSON(`${KNOWLEDGE_BASE_API}/${knowledgeBaseId}/documents`);
}

export function createDocument(
  knowledgeBaseId: number,
  title: string,
  content: string,
): Promise<KnowledgeBaseDocument> {
  return requestJSON(
    `${KNOWLEDGE_BASE_API}/${knowledgeBaseId}/documents`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    },
  );
}

export function updateDocument(
  knowledgeBaseId: number,
  documentId: number,
  title: string,
  content: string,
): Promise<KnowledgeBaseDocument> {
  return requestJSON(
    `${KNOWLEDGE_BASE_API}/${knowledgeBaseId}/documents/${documentId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    },
  );
}

export function deleteDocument(
  knowledgeBaseId: number,
  documentId: number,
): Promise<{ message: string }> {
  return requestJSON(
    `${KNOWLEDGE_BASE_API}/${knowledgeBaseId}/documents/${documentId}`,
    { method: 'DELETE' },
  );
}
