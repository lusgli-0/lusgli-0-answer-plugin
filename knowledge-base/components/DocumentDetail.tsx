import { FC } from 'react';

import type { KnowledgeBase, KnowledgeBaseDocument } from '../types';

type Props = {
  knowledgeBase: KnowledgeBase;
  document: KnowledgeBaseDocument;
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

const DocumentDetail: FC<Props> = ({
  knowledgeBase,
  document,
  deleting,
  deleteError,
  onEdit,
  onDelete,
}) => (
  <article className="kb-panel kb-note-detail">
    <header className="kb-detail-header">
      <div>
        <p className="knowledge-base-eyebrow">笔记详情</p>
        <h2>{document.title}</h2>
      </div>
      <div className="kb-document-actions">
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

    <dl className="kb-document-properties">
      <div>
        <dt>所属知识库</dt>
        <dd>{knowledgeBase.title}</dd>
      </div>
      <div>
        <dt>笔记 ID</dt>
        <dd>{document.id}</dd>
      </div>
      <div>
        <dt>创建时间</dt>
        <dd>{formatDate(document.created_at)}</dd>
      </div>
      <div>
        <dt>更新时间</dt>
        <dd>{formatDate(document.updated_at)}</dd>
      </div>
    </dl>

    <div className="kb-detail-content">
      <h3>全文</h3>
      <p>{document.content}</p>
    </div>
  </article>
);

export default DocumentDetail;
