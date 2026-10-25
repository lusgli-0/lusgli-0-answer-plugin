import { FC, FormEvent } from 'react';

import type {
  KnowledgeBase,
  KnowledgeBaseNote,
  RequestState,
} from '../types';

type Props = {
  // Knowledge base list
  knowledgeBases: KnowledgeBase[];
  selectedKnowledgeBase: KnowledgeBase | undefined;
  knowledgeBasesRequest: RequestState;

  // Note list
  notes: KnowledgeBaseNote[];
  selectedNoteId: number | null;
  notesRequest: RequestState;

  // Search
  knowledgeBaseSearchText: string;
  noteSearchText: string;
  knowledgeBaseSearchActive: boolean;

  // Knowledge base creation
  newKnowledgeBaseTitle: string;
  createKnowledgeBaseRequest: RequestState;

  // Knowledge base deletion
  deleteKnowledgeBaseRequest: RequestState & { id: number | null };

  // Actions
  onKnowledgeBaseTitleChange: (title: string) => void;
  onCreateKnowledgeBase: (event: FormEvent<HTMLFormElement>) => void;
  onSelectKnowledgeBase: (id: number) => void;
  onBackToKnowledgeBases: () => void;
  onSelectNote: (id: number) => void;
  onAddNote: () => void;
  onDeleteKnowledgeBase: (knowledgeBase: KnowledgeBase) => void;
  onKnowledgeBaseSearchTextChange: (text: string) => void;
  onNoteSearchTextChange: (text: string) => void;
  onKnowledgeBaseSearch: (event: FormEvent<HTMLFormElement>) => void;
  onNoteSearch: (event: FormEvent<HTMLFormElement>) => void;
};

const KnowledgeBaseSidebar: FC<Props> = ({
  knowledgeBases,
  selectedKnowledgeBase,
  notes,
  selectedNoteId,
  knowledgeBasesRequest,
  notesRequest,
  knowledgeBaseSearchText,
  noteSearchText,
  knowledgeBaseSearchActive,
  newKnowledgeBaseTitle,
  createKnowledgeBaseRequest,
  deleteKnowledgeBaseRequest,
  onKnowledgeBaseTitleChange,
  onCreateKnowledgeBase,
  onSelectKnowledgeBase,
  onBackToKnowledgeBases,
  onSelectNote,
  onAddNote,
  onDeleteKnowledgeBase,
  onKnowledgeBaseSearchTextChange,
  onNoteSearchTextChange,
  onKnowledgeBaseSearch,
  onNoteSearch,
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
              disabled={
                deleteKnowledgeBaseRequest.id === selectedKnowledgeBase.id
              }
            >
              {deleteKnowledgeBaseRequest.id === selectedKnowledgeBase.id
                ? '删除中...'
                : '删除知识库'}
            </button>
          </div>
          {deleteKnowledgeBaseRequest.error && (
            <p className="kb-message kb-message-error" role="alert">
              {deleteKnowledgeBaseRequest.error}
            </p>
          )}
          <form
            className="kb-search-form kb-notes-search-form"
            onSubmit={onNoteSearch}
          >
            <input
              id="knowledge-base-search"
              type="search"
              aria-label="搜索当前知识库的笔记"
              value={noteSearchText}
              onChange={(event) =>
                onNoteSearchTextChange(event.target.value)
              }
              placeholder="搜索当前知识库的笔记"
            />
          </form>
          <section className="kb-notes-sidebar">
            <div className="kb-list-heading">笔记</div>
            {notesRequest.loading ? (
              <p className="kb-state">正在加载笔记...</p>
            ) : notesRequest.error ? (
              <p className="kb-message kb-message-error" role="alert">
                {notesRequest.error}
              </p>
            ) : notes.length === 0 ? (
              <p className="kb-state">这个知识库还没有笔记。</p>
            ) : (
              <ul className="kb-list kb-note-list">
                {notes.map((note) => (
                  <li
                    className={`kb-list-item${
                      selectedNoteId === note.id ? ' is-selected' : ''
                    }`}
                    key={note.id}
                  >
                    <button
                      className="kb-select-button"
                      type="button"
                      aria-pressed={selectedNoteId === note.id}
                      onClick={() => onSelectNote(note.id)}
                    >
                      <span className="kb-list-title">{note.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!notesRequest.loading && !notesRequest.error && (
              <button
                className="kb-button kb-button-primary kb-add-note-button"
                type="button"
                onClick={onAddNote}
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

          <form className="kb-search-form" onSubmit={onKnowledgeBaseSearch}>
            <input
              id="knowledge-base-search"
              type="search"
              aria-label="搜索知识库"
              value={knowledgeBaseSearchText}
              onChange={(event) =>
                onKnowledgeBaseSearchTextChange(event.target.value)
              }
              placeholder="搜索知识库"
            />
          </form>

          <div className="kb-list-heading">知识库列表</div>
          {knowledgeBasesRequest.loading ? (
            <p className="kb-state">正在加载知识库...</p>
          ) : knowledgeBasesRequest.error ? (
            <p className="kb-message kb-message-error" role="alert">
              {knowledgeBasesRequest.error}
            </p>
          ) : knowledgeBases.length === 0 ? (
            <p className="kb-state">
              {knowledgeBaseSearchActive
                ? '没有找到匹配的知识库。'
                : '还没有知识库。'}
            </p>
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
                    disabled={
                      deleteKnowledgeBaseRequest.id === knowledgeBase.id
                    }
                  >
                    {deleteKnowledgeBaseRequest.id === knowledgeBase.id
                      ? '…'
                      : '删除'}
                  </button>
                </li>
              ))}
            </ul>
          )}

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
              disabled={createKnowledgeBaseRequest.loading}
            >
              {createKnowledgeBaseRequest.loading ? '创建中...' : '创建知识库'}
            </button>
            {createKnowledgeBaseRequest.error && (
              <p className="kb-message kb-message-error" role="alert">
                {createKnowledgeBaseRequest.error}
              </p>
            )}
          </form>

          {deleteKnowledgeBaseRequest.error && (
            <p className="kb-message kb-message-error" role="alert">
              {deleteKnowledgeBaseRequest.error}
            </p>
          )}
        </>
      )}
    </section>
  </aside>
);

export default KnowledgeBaseSidebar;
