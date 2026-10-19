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
  createDocument,
  createKnowledgeBase,
  deleteDocument,
  deleteKnowledgeBase,
  listDocuments,
  listKnowledgeBases,
  updateDocument,
} from './api';
import DocumentDetail from './components/DocumentDetail';
import DocumentForm from './components/DocumentForm';
import KnowledgeBaseSidebar from './components/KnowledgeBaseSidebar';
import type {
  DocumentPanel,
  KnowledgeBase,
  KnowledgeBaseDocument,
} from './types';
import './Component.css';

type ViewTransitionHandle = { finished?: Promise<void> };
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionHandle;
};

/**
 * 用浏览器原生的 View Transitions 做真正的"淡入淡出"：旧内容淡出的同时新内容淡入。
 * 浏览器不支持该 API、或用户开启了"减少动态效果"时直接更新，
 * 此时由 CSS 里的 kb-panel-in / kb-fade-in 兜底。
 */
const withCrossFade = (update: () => void) => {
  const viewTransitionDocument = document as ViewTransitionDocument;
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  if (
    typeof viewTransitionDocument.startViewTransition !== 'function' ||
    prefersReducedMotion
  ) {
    update();
    return;
  }

  viewTransitionDocument.startViewTransition(() => {
    flushSync(update);
  });
};

const Component: FC = () => {
  useTranslation('plugin', {
    keyPrefix: 'knowledge_base.frontend',
  });

  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loadingKnowledgeBases, setLoadingKnowledgeBases] = useState(true);
  const [knowledgeBasesError, setKnowledgeBasesError] = useState('');
  const [newKnowledgeBaseTitle, setNewKnowledgeBaseTitle] = useState('');
  const [creatingKnowledgeBase, setCreatingKnowledgeBase] = useState(false);
  const [createKnowledgeBaseError, setCreateKnowledgeBaseError] = useState('');
  const [deletingKnowledgeBaseId, setDeletingKnowledgeBaseId] = useState<
    number | null
  >(null);
  const [deleteKnowledgeBaseError, setDeleteKnowledgeBaseError] = useState('');

  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<
    number | null
  >(null);
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState('');
  const [panel, setPanel] = useState<DocumentPanel>({ type: 'empty' });

  const [savingDocument, setSavingDocument] = useState(false);
  const [saveDocumentError, setSaveDocumentError] = useState('');
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(
    null,
  );
  const [deleteDocumentError, setDeleteDocumentError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listKnowledgeBases()
      .then((result) => {
        if (!cancelled) {
          setKnowledgeBases(result.data.items);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load knowledge bases:', error);
        if (!cancelled) {
          setKnowledgeBasesError('加载知识库失败，请检查网络或稍后重试。');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingKnowledgeBases(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedKnowledgeBaseId === null) {
      setDocuments([]);
      setLoadingDocuments(false);
      setDocumentsError('');
      return;
    }

    let cancelled = false;
    setLoadingDocuments(true);
    setDocumentsError('');
    setPanel({ type: 'empty' });
    listDocuments(selectedKnowledgeBaseId)
      .then((result) => {
        if (!cancelled) {
          setDocuments(result.items);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load documents:', error);
        if (!cancelled) {
          setDocumentsError('加载笔记失败，请稍后重试。');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDocuments(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedKnowledgeBaseId]);

  const handleCreateKnowledgeBase = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const title = newKnowledgeBaseTitle.trim();
    if (!title) {
      setCreateKnowledgeBaseError('知识库名称不能为空。');
      return;
    }

    setCreatingKnowledgeBase(true);
    setCreateKnowledgeBaseError('');
    try {
      const created = await createKnowledgeBase(title);
      withCrossFade(() => {
        setKnowledgeBases((previous) => [...previous, created]);
        setNewKnowledgeBaseTitle('');
        setSelectedKnowledgeBaseId(created.id);
      });
    } catch (error: unknown) {
      console.error('Failed to create knowledge base:', error);
      setCreateKnowledgeBaseError('创建知识库失败，请检查网络后重试。');
    } finally {
      setCreatingKnowledgeBase(false);
    }
  };

  const handleSelectKnowledgeBase = (id: number) => {
    if (selectedKnowledgeBaseId === id) return;
    withCrossFade(() => {
      setPanel({ type: 'empty' });
      setDocuments([]);
      setDocumentsError('');
      setLoadingDocuments(true);
      setSelectedKnowledgeBaseId(id);
    });
  };

  const handleBackToKnowledgeBases = () => {
    withCrossFade(() => {
      setSelectedKnowledgeBaseId(null);
      setDocuments([]);
      setPanel({ type: 'empty' });
      setDeleteKnowledgeBaseError('');
    });
  };

  const handleSelectDocument = (documentId: number) => {
    withCrossFade(() => {
      setPanel({ type: 'detail', documentId });
      setDeleteDocumentError('');
    });
  };

  const handleCreateDocument = async (title: string, content: string) => {
    if (selectedKnowledgeBaseId === null) {
      setSaveDocumentError('请先选择一个知识库。');
      return;
    }

    setSavingDocument(true);
    setSaveDocumentError('');
    try {
      const created = await createDocument(
        selectedKnowledgeBaseId,
        title,
        content,
      );
      withCrossFade(() => {
        setDocuments((previous) => [created, ...previous]);
        setPanel({ type: 'detail', documentId: created.id });
      });
    } catch (error: unknown) {
      console.error('Failed to create document:', error);
      setSaveDocumentError('保存笔记失败，请检查连接后重试。');
    } finally {
      setSavingDocument(false);
    }
  };

  const handleUpdateDocument = async (
    documentId: number,
    title: string,
    content: string,
  ) => {
    if (selectedKnowledgeBaseId === null) {
      return;
    }

    setSavingDocument(true);
    setSaveDocumentError('');
    try {
      const updated = await updateDocument(
        selectedKnowledgeBaseId,
        documentId,
        title,
        content,
      );
      withCrossFade(() => {
        setDocuments((previous) =>
          previous.map((document) =>
            document.id === documentId
              ? {
                  ...document,
                  ...updated,
                  id: document.id,
                  knowledge_base_id: document.knowledge_base_id,
                  created_at: document.created_at,
                  updated_at: updated.updated_at || document.updated_at,
                }
              : document,
          ),
        );
        setPanel({ type: 'detail', documentId });
      });
    } catch (error: unknown) {
      console.error('Failed to update document:', error);
      setSaveDocumentError('保存修改失败，请稍后重试。');
    } finally {
      setSavingDocument(false);
    }
  };

  const handleDeleteDocument = async (document: KnowledgeBaseDocument) => {
    if (selectedKnowledgeBaseId === null) {
      return;
    }
    if (!window.confirm(`确定删除笔记“${document.title}”吗？`)) {
      return;
    }

    setDeletingDocumentId(document.id);
    setDeleteDocumentError('');
    try {
      await deleteDocument(selectedKnowledgeBaseId, document.id);
      withCrossFade(() => {
        setDocuments((previous) =>
          previous.filter((item) => item.id !== document.id),
        );
        if (panel.type === 'detail' && panel.documentId === document.id) {
          setPanel({ type: 'empty' });
        }
      });
    } catch (error: unknown) {
      console.error('Failed to delete document:', error);
      setDeleteDocumentError('删除笔记失败，请稍后重试。');
    } finally {
      setDeletingDocumentId(null);
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

    setDeletingKnowledgeBaseId(knowledgeBase.id);
    setDeleteKnowledgeBaseError('');
    try {
      await deleteKnowledgeBase(knowledgeBase.id);
      withCrossFade(() => {
        setKnowledgeBases((previous) =>
          previous.filter((item) => item.id !== knowledgeBase.id),
        );
        if (selectedKnowledgeBaseId === knowledgeBase.id) {
          setSelectedKnowledgeBaseId(null);
          setDocuments([]);
          setPanel({ type: 'empty' });
        }
      });
    } catch (error: unknown) {
      console.error('Failed to delete knowledge base:', error);
      setDeleteKnowledgeBaseError('删除知识库失败，请稍后重试。');
    } finally {
      setDeletingKnowledgeBaseId(null);
    }
  };

  const selectedKnowledgeBase = knowledgeBases.find(
    (knowledgeBase) => knowledgeBase.id === selectedKnowledgeBaseId,
  );
  const selectedDocument =
    panel.type === 'detail' || panel.type === 'edit'
      ? documents.find((document) => document.id === panel.documentId)
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
          documents={documents}
          selectedDocumentId={
            panel.type === 'detail' || panel.type === 'edit'
              ? panel.documentId
              : null
          }
          loadingKnowledgeBases={loadingKnowledgeBases}
          knowledgeBasesError={knowledgeBasesError}
          loadingDocuments={loadingDocuments}
          documentsError={documentsError}
          newKnowledgeBaseTitle={newKnowledgeBaseTitle}
          creatingKnowledgeBase={creatingKnowledgeBase}
          createKnowledgeBaseError={createKnowledgeBaseError}
          deletingKnowledgeBaseId={deletingKnowledgeBaseId}
          deleteKnowledgeBaseError={deleteKnowledgeBaseError}
          onKnowledgeBaseTitleChange={setNewKnowledgeBaseTitle}
          onCreateKnowledgeBase={handleCreateKnowledgeBase}
          onSelectKnowledgeBase={handleSelectKnowledgeBase}
          onBackToKnowledgeBases={handleBackToKnowledgeBases}
          onSelectDocument={handleSelectDocument}
          onAddDocument={() => {
            withCrossFade(() => {
              setSaveDocumentError('');
              setPanel({ type: 'create' });
            });
          }}
          onDeleteKnowledgeBase={handleDeleteKnowledgeBase}
        />

        <section className="knowledge-base-workspace">
          {loadingDocuments ? (
            <div className="kb-empty-state">正在加载笔记...</div>
          ) : documentsError ? (
            <div className="kb-empty-state kb-message-error" role="alert">
              {documentsError}
            </div>
          ) : !selectedKnowledgeBase ? (
            <div className="kb-workspace-empty is-base">
              <h2>选择一个知识库</h2>
              <p>从左侧选择知识库，再选择一篇笔记查看全文。</p>
            </div>
          ) : panel.type === 'create' ? (
            <DocumentForm
              key={`create-${selectedKnowledgeBase.id}`}
              mode="create"
              saving={savingDocument}
              error={saveDocumentError}
              onSubmit={handleCreateDocument}
              onCancel={() => {
                withCrossFade(() => {
                  setSaveDocumentError('');
                  setPanel({ type: 'empty' });
                });
              }}
            />
          ) : panel.type === 'edit' && selectedDocument ? (
            <DocumentForm
              key={`edit-${selectedDocument.id}`}
              mode="edit"
              document={selectedDocument}
              saving={savingDocument}
              error={saveDocumentError}
              onSubmit={(title, content) =>
                handleUpdateDocument(selectedDocument.id, title, content)
              }
              onCancel={() => {
                withCrossFade(() => {
                  setSaveDocumentError('');
                  setPanel({ type: 'detail', documentId: selectedDocument.id });
                });
              }}
            />
          ) : panel.type === 'detail' && selectedDocument ? (
            <DocumentDetail
              key={selectedDocument.id}
              knowledgeBase={selectedKnowledgeBase}
              document={selectedDocument}
              deleting={deletingDocumentId === selectedDocument.id}
              deleteError={deleteDocumentError}
              onEdit={() => {
                withCrossFade(() => {
                  setSaveDocumentError('');
                  setPanel({
                    type: 'edit',
                    documentId: selectedDocument.id,
                  });
                });
              }}
              onDelete={() => handleDeleteDocument(selectedDocument)}
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
