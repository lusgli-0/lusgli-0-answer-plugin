import { LOGGED_TOKEN_STORAGE_KEY } from '@/common/constants';

import type {
  KnowledgeBase,
  KnowledgeBaseListResponse,
  KnowledgeBaseNote,
  NoteListResponse,
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

export function listKnowledgeBases(
  q = '',
): Promise<KnowledgeBaseListResponse> {
  const params = new URLSearchParams();
  if (q.trim()) {
    params.set('q', q.trim());
  }

  const query = params.toString();
  return requestJSON(`${KNOWLEDGE_BASE_API}${query ? `?${query}` : ''}`);
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

export function listNotes(
  knowledgeBaseId: number,
  q = '',
): Promise<NoteListResponse> {
  const params = new URLSearchParams();
  if (q.trim()) {
    params.set('q', q.trim());
  }

  const query = params.toString();
  const url = `${KNOWLEDGE_BASE_API}/${knowledgeBaseId}/notes${
    query ? `?${query}` : ''
  }`;
  return requestJSON(url);
}

export function createNote(
  knowledgeBaseId: number,
  title: string,
  content: string,
): Promise<KnowledgeBaseNote> {
  return requestJSON(
    `${KNOWLEDGE_BASE_API}/${knowledgeBaseId}/notes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    },
  );
}

export function updateNote(
  knowledgeBaseId: number,
  noteId: number,
  title: string,
  content: string,
): Promise<KnowledgeBaseNote> {
  return requestJSON(
    `${KNOWLEDGE_BASE_API}/${knowledgeBaseId}/notes/${noteId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    },
  );
}

export function deleteNote(
  knowledgeBaseId: number,
  noteId: number,
): Promise<{ message: string }> {
  return requestJSON(
    `${KNOWLEDGE_BASE_API}/${knowledgeBaseId}/notes/${noteId}`,
    { method: 'DELETE' },
  );
}

export async function renderMarkdown(content: string): Promise<string> {
  const response = await requestJSON<{ data: string }>(
    '/answer/api/v1/post/render',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    },
  );

  if (typeof response.data !== 'string') {
    throw new Error('Invalid markdown render response');
  }

  return response.data;
}
