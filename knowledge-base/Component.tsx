/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FC, FormEvent, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';

import {
  createKnowledgeBase,
  createNote,
  deleteKnowledgeBase,
  deleteNote,
  listKnowledgeBases,
  listNotes,
  updateNote,
} from './api';
import NoteDetail from './components/NoteDetail';
import NoteForm from './components/NoteForm';
import KnowledgeBaseSidebar from './components/KnowledgeBaseSidebar';
import type {
  KnowledgeBase,
  KnowledgeBaseNote,
  NotePanel,
  RequestState,
} from './types';
import './Component.css';

type ViewTransitionHandle = { finished?: Promise<void> };
type ViewTransitionTarget = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionHandle;
};

/**
 * 用浏览器原生的 View Transitions 做真正的"淡入淡出"：旧内容淡出的同时新内容淡入。
 * 浏览器不支持该 API、或用户开启了"减少动态效果"时直接更新，
 * 此时由 CSS 里的 kb-panel-in / kb-fade-in 兜底。
 */
const withCrossFade = (update: () => void) => {
  const viewTransitionTarget = document as ViewTransitionTarget;
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  if (
    typeof viewTransitionTarget.startViewTransition !== 'function' ||
    prefersReducedMotion
  ) {
    update();
    return;
  }

  viewTransitionTarget.startViewTransition(() => {
    flushSync(update);
  });
};

const Component: FC = () => {
  useTranslation('plugin', {
    keyPrefix: 'knowledge_base.frontend',
  });

  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [knowledgeBasesRequest, setKnowledgeBasesRequest] =
    useState<RequestState>({
      loading: true,
      error: '',
    });
  const [newKnowledgeBaseTitle, setNewKnowledgeBaseTitle] = useState('');
  const [createKnowledgeBaseRequest, setCreateKnowledgeBaseRequest] =
    useState<RequestState>({ loading: false, error: '' });
  const [deleteKnowledgeBaseRequest, setDeleteKnowledgeBaseRequest] = useState<
    RequestState & { id: number | null }
  >({ loading: false, error: '', id: null });

  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<
    number | null
  >(null);
  const [notes, setNotes] = useState<KnowledgeBaseNote[]>([]);
  const [notesRequest, setNotesRequest] = useState<RequestState>({
    loading: false,
    error: '',
  });
  const [panel, setPanel] = useState<NotePanel>({ type: 'empty' });

  const [saveNoteRequest, setSaveNoteRequest] = useState<RequestState>(
    { loading: false, error: '' },
  );
  const [deleteNoteRequest, setDeleteNoteRequest] = useState<
    RequestState & { id: number | null }
  >({ loading: false, error: '', id: null });

  const [knowledgeBaseSearchText, setKnowledgeBaseSearchText] = useState('');
  const [submittedKnowledgeBaseSearchText, setSubmittedKnowledgeBaseSearchText] =
    useState('');
  const [noteSearchText, setNoteSearchText] = useState('');
  const [submittedNoteSearchText, setSubmittedNoteSearchText] =
    useState('');

  const handleKnowledgeBaseSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedKnowledgeBaseSearchText(knowledgeBaseSearchText.trim());
  };

  const handleNoteSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedNoteSearchText(noteSearchText.trim());
  };

  useEffect(() => {
    let cancelled = false;
    setKnowledgeBasesRequest({ loading: true, error: '' });
    listKnowledgeBases(submittedKnowledgeBaseSearchText)
      .then((result) => {
        if (!cancelled) {
          setKnowledgeBases(result.data.items);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load knowledge bases:', error);
        if (!cancelled) {
          setKnowledgeBasesRequest((previous) => ({
            ...previous,
            error: '加载知识库失败，请检查网络或稍后重试。',
          }));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setKnowledgeBasesRequest((previous) => ({
            ...previous,
            loading: false,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [submittedKnowledgeBaseSearchText]);

  useEffect(() => {
    if (selectedKnowledgeBaseId === null) {
      setNotes([]);
      setNotesRequest({ loading: false, error: '' });
      return;
    }

    let cancelled = false;
    setNotesRequest({ loading: true, error: '' });
    setPanel({ type: 'empty' });
    listNotes(selectedKnowledgeBaseId, submittedNoteSearchText)
      .then((result) => {
        if (!cancelled) {
          setNotes(result.items);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load notes:', error);
        if (!cancelled) {
          setNotesRequest((previous) => ({
            ...previous,
            error: '加载笔记失败，请稍后重试。',
          }));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setNotesRequest((previous) => ({
            ...previous,
            loading: false,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedKnowledgeBaseId, submittedNoteSearchText]);

  const handleCreateKnowledgeBase = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const title = newKnowledgeBaseTitle.trim();
    if (!title) {
      setCreateKnowledgeBaseRequest((previous) => ({
        ...previous,
        error: '知识库名称不能为空。',
      }));
      return;
    }

    setCreateKnowledgeBaseRequest({ loading: true, error: '' });
    try {
      const created = await createKnowledgeBase(title);
      withCrossFade(() => {
        setKnowledgeBases((previous) => [...previous, created]);
        setNewKnowledgeBaseTitle('');
        setSelectedKnowledgeBaseId(created.id);
      });
    } catch (error: unknown) {
      console.error('Failed to create knowledge base:', error);
      setCreateKnowledgeBaseRequest((previous) => ({
        ...previous,
        error: '创建知识库失败，请检查网络后重试。',
      }));
    } finally {
      setCreateKnowledgeBaseRequest((previous) => ({
        ...previous,
        loading: false,
      }));
    }
  };

  const handleSelectKnowledgeBase = (id: number) => {
    if (selectedKnowledgeBaseId === id) return;
    withCrossFade(() => {
      setPanel({ type: 'empty' });
      setNotes([]);
      setNotesRequest({ loading: true, error: '' });
      setSelectedKnowledgeBaseId(id);
    });
  };

  const handleBackToKnowledgeBases = () => {
    withCrossFade(() => {
      setSelectedKnowledgeBaseId(null);
      setNotes([]);
      setPanel({ type: 'empty' });
      setDeleteKnowledgeBaseRequest((previous) => ({
        ...previous,
        error: '',
      }));
    });
  };

  const handleSelectNote = (noteId: number) => {
    withCrossFade(() => {
      setPanel({ type: 'detail', noteId });
      setDeleteNoteRequest((previous) => ({
        ...previous,
        error: '',
      }));
    });
  };

  const handleCreateNote = async (title: string, content: string) => {
    if (selectedKnowledgeBaseId === null) {
      setSaveNoteRequest((previous) => ({
        ...previous,
        error: '请先选择一个知识库。',
      }));
      return;
    }

    setSaveNoteRequest({ loading: true, error: '' });
    try {
      const created = await createNote(
        selectedKnowledgeBaseId,
        title,
        content,
      );
      withCrossFade(() => {
        setNotes((previous) => [created, ...previous]);
        setPanel({ type: 'detail', noteId: created.id });
      });
    } catch (error: unknown) {
      console.error('Failed to create note:', error);
      setSaveNoteRequest((previous) => ({
        ...previous,
        error: '保存笔记失败，请检查连接后重试。',
      }));
    } finally {
      setSaveNoteRequest((previous) => ({
        ...previous,
        loading: false,
      }));
    }
  };

  const handleUpdateNote = async (
    noteId: number,
    title: string,
    content: string,
  ) => {
    if (selectedKnowledgeBaseId === null) {
      return;
    }

    setSaveNoteRequest({ loading: true, error: '' });
    try {
      const updated = await updateNote(
        selectedKnowledgeBaseId,
        noteId,
        title,
        content,
      );
      withCrossFade(() => {
        setNotes((previous) =>
          previous.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  ...updated,
                  id: note.id,
                  knowledge_base_id: note.knowledge_base_id,
                  created_at: note.created_at,
                  updated_at: updated.updated_at || note.updated_at,
                }
              : note,
          ),
        );
        setPanel({ type: 'detail', noteId });
      });
    } catch (error: unknown) {
      console.error('Failed to update note:', error);
      setSaveNoteRequest((previous) => ({
        ...previous,
        error: '保存修改失败，请稍后重试。',
      }));
    } finally {
      setSaveNoteRequest((previous) => ({
        ...previous,
        loading: false,
      }));
    }
  };

  const handleDeleteNote = async (note: KnowledgeBaseNote) => {
    if (selectedKnowledgeBaseId === null) {
      return;
    }
    if (!window.confirm(`确定删除笔记“${note.title}”吗？`)) {
      return;
    }

    setDeleteNoteRequest({
      loading: true,
      error: '',
      id: note.id,
    });
    try {
      await deleteNote(selectedKnowledgeBaseId, note.id);
      withCrossFade(() => {
        setNotes((previous) =>
          previous.filter((item) => item.id !== note.id),
        );
        if (panel.type === 'detail' && panel.noteId === note.id) {
          setPanel({ type: 'empty' });
        }
      });
    } catch (error: unknown) {
      console.error('Failed to delete note:', error);
      setDeleteNoteRequest((previous) => ({
        ...previous,
        error: '删除笔记失败，请稍后重试。',
      }));
    } finally {
      setDeleteNoteRequest((previous) => ({
        ...previous,
        loading: false,
        id: null,
      }));
    }
  };

  const handleDeleteKnowledgeBase = async (
    knowledgeBase: KnowledgeBase,
  ) => {
    const confirmed = window.confirm(
      `确定删除知识库“${knowledgeBase.title}”及其中的所有笔记吗？此操作无法撤销。`,
    );
    if (!confirmed) {
      return;
    }

    setDeleteKnowledgeBaseRequest({
      loading: true,
      error: '',
      id: knowledgeBase.id,
    });
    try {
      await deleteKnowledgeBase(knowledgeBase.id);
      withCrossFade(() => {
        setKnowledgeBases((previous) =>
          previous.filter((item) => item.id !== knowledgeBase.id),
        );
        if (selectedKnowledgeBaseId === knowledgeBase.id) {
          setSelectedKnowledgeBaseId(null);
          setNotes([]);
          setPanel({ type: 'empty' });
        }
      });
    } catch (error: unknown) {
      console.error('Failed to delete knowledge base:', error);
      setDeleteKnowledgeBaseRequest((previous) => ({
        ...previous,
        error: '删除知识库失败，请稍后重试。',
      }));
    } finally {
      setDeleteKnowledgeBaseRequest((previous) => ({
        ...previous,
        loading: false,
        id: null,
      }));
    }
  };

  const selectedKnowledgeBase = knowledgeBases.find(
    (knowledgeBase) => knowledgeBase.id === selectedKnowledgeBaseId,
  );
  const selectedNote =
    panel.type === 'detail' || panel.type === 'edit'
      ? notes.find((note) => note.id === panel.noteId)
      : undefined;

  return (
    <main className="knowledge-base-page">
      <header className="knowledge-base-header">
        <div>
          <p className="knowledge-base-eyebrow">WORKSPACE</p>
          <h1>知识库管理</h1>
          <p className="knowledge-base-subtitle">
            整理知识内容，并管理每个知识库中的笔记。
          </p>
        </div>
      </header>

      <div className="knowledge-base-layout">
        <KnowledgeBaseSidebar
          knowledgeBases={knowledgeBases}
          selectedKnowledgeBase={selectedKnowledgeBase}
          notes={notes}
          selectedNoteId={
            panel.type === 'detail' || panel.type === 'edit'
              ? panel.noteId
              : null
          }
          knowledgeBasesRequest={knowledgeBasesRequest}
          notesRequest={notesRequest}
          newKnowledgeBaseTitle={newKnowledgeBaseTitle}
          createKnowledgeBaseRequest={createKnowledgeBaseRequest}
          deleteKnowledgeBaseRequest={deleteKnowledgeBaseRequest}
          knowledgeBaseSearchText={knowledgeBaseSearchText}
          noteSearchText={noteSearchText}
          knowledgeBaseSearchActive={submittedKnowledgeBaseSearchText !== ''}
          onKnowledgeBaseTitleChange={setNewKnowledgeBaseTitle}
          onCreateKnowledgeBase={handleCreateKnowledgeBase}
          onSelectKnowledgeBase={handleSelectKnowledgeBase}
          onBackToKnowledgeBases={handleBackToKnowledgeBases}
          onSelectNote={handleSelectNote}
          onAddNote={() => {
            withCrossFade(() => {
              setSaveNoteRequest((previous) => ({
                ...previous,
                error: '',
              }));
              setPanel({ type: 'create' });
            });
          }}
          onDeleteKnowledgeBase={handleDeleteKnowledgeBase}
          onKnowledgeBaseSearchTextChange={setKnowledgeBaseSearchText}
          onNoteSearchTextChange={setNoteSearchText}
          onKnowledgeBaseSearch={handleKnowledgeBaseSearch}
          onNoteSearch={handleNoteSearch}
        />

        <section className="knowledge-base-workspace">
          {notesRequest.loading ? (
            <div className="kb-empty-state">正在加载笔记...</div>
          ) : notesRequest.error ? (
            <div className="kb-empty-state kb-message-error" role="alert">
              {notesRequest.error}
            </div>
          ) : !selectedKnowledgeBase ? (
            <div className="kb-workspace-empty is-base">
              <h2>选择一个知识库</h2>
              <p>从左侧选择知识库，再选择一篇笔记查看全文。</p>
            </div>
          ) : panel.type === 'create' ? (
            <NoteForm
              key={`create-${selectedKnowledgeBase.id}`}
              mode="create"
              saving={saveNoteRequest.loading}
              error={saveNoteRequest.error}
              withCrossFade={withCrossFade}
              onSubmit={handleCreateNote}
              onCancel={() => {
                withCrossFade(() => {
                  setSaveNoteRequest((previous) => ({
                    ...previous,
                    error: '',
                  }));
                  setPanel({ type: 'empty' });
                });
              }}
            />
          ) : panel.type === 'edit' && selectedNote ? (
            <NoteForm
              key={`edit-${selectedNote.id}`}
              mode="edit"
              note={selectedNote}
              saving={saveNoteRequest.loading}
              error={saveNoteRequest.error}
              withCrossFade={withCrossFade}
              onSubmit={(title, content) =>
                handleUpdateNote(selectedNote.id, title, content)
              }
              onCancel={() => {
                withCrossFade(() => {
                  setSaveNoteRequest((previous) => ({
                    ...previous,
                    error: '',
                  }));
                  setPanel({ type: 'detail', noteId: selectedNote.id });
                });
              }}
            />
          ) : panel.type === 'detail' && selectedNote ? (
            <NoteDetail
              key={selectedNote.id}
              knowledgeBase={selectedKnowledgeBase}
              note={selectedNote}
              deleting={deleteNoteRequest.id === selectedNote.id}
              deleteError={deleteNoteRequest.error}
              onEdit={() => {
                withCrossFade(() => {
                  setSaveNoteRequest((previous) => ({
                    ...previous,
                    error: '',
                  }));
                  setPanel({
                    type: 'edit',
                    noteId: selectedNote.id,
                  });
                });
              }}
              onDelete={() => handleDeleteNote(selectedNote)}
            />
          ) : (
            <div className="kb-workspace-empty">
              <h2>选择一篇笔记</h2>
              <p>从左侧笔记列表选择标题，右侧会显示笔记属性和全文。</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default Component;
