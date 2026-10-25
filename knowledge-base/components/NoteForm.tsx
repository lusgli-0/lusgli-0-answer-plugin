import { FC, FormEvent, useState } from 'react';

import MarkdownEditor from '@/components/Editor/MarkdownEditor';

import MarkdownPreview from './MarkdownPreview';
import type { KnowledgeBaseNote } from '../types';

type Props = {
  mode: 'create' | 'edit';
  note?: KnowledgeBaseNote;
  saving: boolean;
  error: string;
  withCrossFade: (update: () => void) => void;
  onSubmit: (title: string, content: string) => Promise<void>;
  onCancel: () => void;
};

const NoteForm: FC<Props> = ({
  mode,
  note,
  saving,
  error,
  withCrossFade,
  onSubmit,
  onCancel,
}) => {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [contentMode, setContentMode] = useState<'markdown' | 'rendered'>(
    'markdown',
  );

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
    <section className="kb-panel kb-note-editor">
      <div className="kb-panel-heading">
        <p className="knowledge-base-eyebrow">
          {mode === 'create' ? '新建笔记' : '编辑笔记'}
        </p>
        <h2>{mode === 'create' ? '添加笔记' : '修改笔记'}</h2>
        <p>输入标题和正文，保存到当前知识库。</p>
      </div>
      <form className="kb-note-form" onSubmit={handleSubmit} noValidate>
        <div className="kb-field">
          <label htmlFor="note-title">笔记标题</label>
          <input
            id="note-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={255}
            placeholder="为笔记起一个清晰的标题"
          />
        </div>
        <div className="kb-field">
          <div
            role="group"
            aria-labelledby="note-content-label"
            className="kb-markdown-field"
          >
            <span id="note-content-label" className="kb-field-label">
              笔记正文
            </span>
            {mode === 'edit' && (
              <div className="kb-content-mode" role="group" aria-label="正文模式">
                <button
                  className={`kb-content-mode-button ${
                    contentMode === 'markdown' ? 'is-active' : ''
                  }`}
                  type="button"
                  aria-pressed={contentMode === 'markdown'}
                  onClick={() => {
                    withCrossFade(() => {
                      setContentMode('markdown');
                    });
                  }}
                >
                  Markdown 文本
                </button>
                <button
                  className={`kb-content-mode-button ${
                    contentMode === 'rendered' ? 'is-active' : ''
                  }`}
                  type="button"
                  aria-pressed={contentMode === 'rendered'}
                  onClick={() => {
                    withCrossFade(() => {
                      setContentMode('rendered');
                    });
                  }}
                >
                  渲染预览
                </button>
              </div>
            )}
            {mode === 'edit' && contentMode === 'rendered' ? (
              <MarkdownPreview content={content} />
            ) : (
              <MarkdownEditor
                value={content}
                onChange={setContent}
                placeholder="在这里输入 Markdown 笔记..."
              />
            )}
          </div>
        </div>
        <div className="kb-form-footer">
          {error && (
            <p className="kb-message kb-message-error" role="alert">
              {error}
            </p>
          )}
          <div className="kb-note-actions">
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

export default NoteForm;
