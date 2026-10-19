import { FC, FormEvent, useState } from 'react';

import type { KnowledgeBaseDocument } from '../types';

type Props = {
  mode: 'create' | 'edit';
  document?: KnowledgeBaseDocument;
  saving: boolean;
  error: string;
  onSubmit: (title: string, content: string) => Promise<void>;
  onCancel: () => void;
};

const DocumentForm: FC<Props> = ({
  mode,
  document,
  saving,
  error,
  onSubmit,
  onCancel,
}) => {
  const [title, setTitle] = useState(document?.title ?? '');
  const [content, setContent] = useState(document?.content ?? '');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    const normalizedContent = content.trim();
    if (!normalizedTitle || !normalizedContent) {
      return;
    }
    await onSubmit(normalizedTitle, normalizedContent);
  };

  return (
    <section className="kb-panel kb-document-editor">
      <div className="kb-panel-heading">
        <div>
          <p className="knowledge-base-eyebrow">
            {mode === 'create' ? '新建笔记' : '编辑笔记'}
          </p>
          <h2>{mode === 'create' ? '添加笔记' : '修改笔记'}</h2>
          <p>输入标题和正文，保存到当前知识库。</p>
        </div>
      </div>
      <form className="kb-document-form" onSubmit={handleSubmit}>
        <div className="kb-field">
          <label htmlFor="document-title">笔记标题</label>
          <input
            id="document-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={255}
            placeholder="为笔记起一个清晰的标题"
            required
          />
        </div>
        <div className="kb-field">
          <label htmlFor="document-content">笔记正文</label>
          <textarea
            id="document-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={12}
            placeholder="在这里粘贴或输入知识内容..."
            required
          />
        </div>
        <div className="kb-form-footer">
          {error && (
            <p className="kb-message kb-message-error" role="alert">
              {error}
            </p>
          )}
          <div className="kb-document-actions">
            <button
              className="kb-button kb-button-secondary"
              type="button"
              onClick={onCancel}
              disabled={saving}
            >
              取消
            </button>
            <button
              className="kb-button kb-button-primary"
              type="submit"
              disabled={saving || !title.trim() || !content.trim()}
            >
              {saving
                ? '保存中...'
                : mode === 'create'
                  ? '添加笔记'
                  : '保存修改'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};

export default DocumentForm;
