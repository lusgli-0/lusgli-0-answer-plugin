import { FC } from 'react';

import MarkdownPreview from './MarkdownPreview';
import type { KnowledgeBase, KnowledgeBaseNote } from '../types';

type Props = {
  knowledgeBase: KnowledgeBase;
  note: KnowledgeBaseNote;
  deleting: boolean;
  deleteError: string;
  onEdit: () => void;
  onDelete: () => void;
};

const formatDate = (value?: string) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const NoteDetail: FC<Props> = ({
  knowledgeBase,
  note,
  deleting,
  deleteError,
  onEdit,
  onDelete,
}) => (
  <article className="kb-panel kb-note-detail">
    <header className="kb-detail-header">
      <div>
        <p className="knowledge-base-eyebrow">笔记详情</p>
        <h2>{note.title}</h2>
      </div>
      <div className="kb-note-actions">
        <button
          className="kb-button kb-button-secondary"
          type="button"
          onClick={onEdit}
        >
          编辑
        </button>
        <button
          className="kb-button kb-button-danger"
          type="button"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? '删除中...' : '删除'}
        </button>
      </div>
    </header>

    {deleteError && (
      <p className="kb-message kb-message-error" role="alert">
        {deleteError}
      </p>
    )}

    <dl className="kb-note-properties">
      <div>
        <dt>所属知识库</dt>
        <dd>{knowledgeBase.title}</dd>
      </div>
      <div>
        <dt>笔记 ID</dt>
        <dd>{note.id}</dd>
      </div>
      <div>
        <dt>创建时间</dt>
        <dd>{formatDate(note.created_at)}</dd>
      </div>
      <div>
        <dt>更新时间</dt>
        <dd>{formatDate(note.updated_at)}</dd>
      </div>
    </dl>

    <div className="kb-detail-content">
      <h3>全文</h3>
      <MarkdownPreview content={note.content} />
    </div>
  </article>
);

export default NoteDetail;
