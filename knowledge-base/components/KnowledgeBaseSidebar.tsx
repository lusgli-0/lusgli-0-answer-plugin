import { FC, FormEvent } from 'react';

import type { KnowledgeBase, KnowledgeBaseDocument } from '../types';

type Props = {
  knowledgeBases: KnowledgeBase[];
  selectedKnowledgeBase: KnowledgeBase | undefined;
  documents: KnowledgeBaseDocument[];
  selectedDocumentId: number | null;
  loadingKnowledgeBases: boolean;
  knowledgeBasesError: string;
  loadingDocuments: boolean;
  documentsError: string;
  newKnowledgeBaseTitle: string;
  creatingKnowledgeBase: boolean;
  createKnowledgeBaseError: string;
  deletingKnowledgeBaseId: number | null;
  deleteKnowledgeBaseError: string;
  onKnowledgeBaseTitleChange: (title: string) => void;
  onCreateKnowledgeBase: (event: FormEvent<HTMLFormElement>) => void;
  onSelectKnowledgeBase: (id: number) => void;
  onBackToKnowledgeBases: () => void;
  onSelectDocument: (id: number) => void;
  onAddDocument: () => void;
  onDeleteKnowledgeBase: (knowledgeBase: KnowledgeBase) => void;
};

const KnowledgeBaseSidebar: FC<Props> = ({
  knowledgeBases,
  selectedKnowledgeBase,
  documents,
  selectedDocumentId,
  loadingKnowledgeBases,
  knowledgeBasesError,
  loadingDocuments,
  documentsError,
  newKnowledgeBaseTitle,
  creatingKnowledgeBase,
  createKnowledgeBaseError,
  deletingKnowledgeBaseId,
  deleteKnowledgeBaseError,
  onKnowledgeBaseTitleChange,
  onCreateKnowledgeBase,
  onSelectKnowledgeBase,
  onBackToKnowledgeBases,
  onSelectDocument,
  onAddDocument,
  onDeleteKnowledgeBase,
}) => (
  <aside className="knowledge-base-sidebar">
    <section className="kb-panel">
      {selectedKnowledgeBase ? (
        <>
          <button
            className="kb-button kb-button-secondary kb-back-button"
            type="button"
            onClick={onBackToKnowledgeBases}
          >
            ← 返回知识库列表
          </button>
          <div className="kb-selected-base-heading">
            <div className="kb-panel-heading">
              <div>
                <p className="knowledge-base-eyebrow">知识库</p>
                <h2>{selectedKnowledgeBase.title}</h2>
              </div>
            </div>
            <button
              className="kb-icon-button kb-delete-button"
              type="button"
              onClick={() => onDeleteKnowledgeBase(selectedKnowledgeBase)}
              disabled={deletingKnowledgeBaseId === selectedKnowledgeBase.id}
            >
              {deletingKnowledgeBaseId === selectedKnowledgeBase.id
                ? '删除中...'
                : '删除知识库'}
            </button>
          </div>
          {deleteKnowledgeBaseError && (
            <p className="kb-message kb-message-error" role="alert">
              {deleteKnowledgeBaseError}
            </p>
          )}
          <section className="kb-notes-sidebar">
            <div className="kb-list-heading">笔记</div>
            {loadingDocuments ? (
              <p className="kb-state">正在加载笔记...</p>
            ) : documentsError ? (
              <p className="kb-message kb-message-error" role="alert">
                {documentsError}
              </p>
            ) : documents.length === 0 ? (
              <p className="kb-state">这个知识库还没有笔记。</p>
            ) : (
              <ul className="kb-list kb-note-list">
                {documents.map((document) => (
                  <li
                    className={`kb-list-item${
                      selectedDocumentId === document.id ? ' is-selected' : ''
                    }`}
                    key={document.id}
                  >
                    <button
                      className="kb-select-button"
                      type="button"
                      aria-pressed={selectedDocumentId === document.id}
                      onClick={() => onSelectDocument(document.id)}
                    >
                      <span className="kb-list-title">{document.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!loadingDocuments && !documentsError && (
              <button
                className="kb-button kb-button-primary kb-add-note-button"
                type="button"
                onClick={onAddDocument}
              >
                添加笔记
              </button>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="kb-panel-heading">
            <div>
              <h2>知识库</h2>
              <p>创建并选择一个知识库</p>
            </div>
          </div>

          <form className="kb-create-form" onSubmit={onCreateKnowledgeBase}>
            <label htmlFor="knowledge-base-title">新建知识库</label>
            <input
              id="knowledge-base-title"
              name="title"
              type="text"
              value={newKnowledgeBaseTitle}
              onChange={(event) =>
                onKnowledgeBaseTitleChange(event.target.value)
              }
              placeholder="例如：产品文档"
              maxLength={255}
            />
            <button
              className="kb-button kb-button-primary"
              type="submit"
              disabled={creatingKnowledgeBase}
            >
              {creatingKnowledgeBase ? '创建中...' : '创建知识库'}
            </button>
            {createKnowledgeBaseError && (
              <p className="kb-message kb-message-error" role="alert">
                {createKnowledgeBaseError}
              </p>
            )}
          </form>

          <div className="kb-list-heading">知识库列表</div>
          {loadingKnowledgeBases ? (
            <p className="kb-state">正在加载知识库...</p>
          ) : knowledgeBasesError ? (
            <p className="kb-message kb-message-error" role="alert">
              {knowledgeBasesError}
            </p>
          ) : knowledgeBases.length === 0 ? (
            <p className="kb-state">还没有知识库，创建一个开始整理内容。</p>
          ) : (
            <ul className="kb-list">
              {knowledgeBases.map((knowledgeBase) => (
                <li className="kb-list-item" key={knowledgeBase.id}>
                  <button
                    className="kb-select-button"
                    type="button"
                    onClick={() => onSelectKnowledgeBase(knowledgeBase.id)}
                  >
                    <span className="kb-list-title">
                      {knowledgeBase.title}
                    </span>
                  </button>
                  <button
                    className="kb-icon-button kb-delete-button"
                    type="button"
                    aria-label={`删除知识库 ${knowledgeBase.title}`}
                    onClick={() => onDeleteKnowledgeBase(knowledgeBase)}
                    disabled={deletingKnowledgeBaseId === knowledgeBase.id}
                  >
                    {deletingKnowledgeBaseId === knowledgeBase.id
                      ? '…'
                      : '删除'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {deleteKnowledgeBaseError && (
            <p className="kb-message kb-message-error" role="alert">
              {deleteKnowledgeBaseError}
            </p>
          )}
        </>
      )}
    </section>
  </aside>
);

export default KnowledgeBaseSidebar;
