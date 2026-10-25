import { FC, useEffect, useState } from 'react';

import { renderMarkdown } from '../api';

type Props = {
  content: string;
};

const MarkdownPreview: FC<Props> = ({ content }) => {
  const [html, setHtml] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHtml('');
    setError(false);

    if (!content.trim()) {
      return () => {
        cancelled = true;
      };
    }

    renderMarkdown(content)
      .then((rendered) => {
        if (!cancelled) {
          setHtml(rendered);
        }
      })
      .catch((renderError: unknown) => {
        console.error('Failed to render note markdown:', renderError);
        if (!cancelled) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [content]);

  if (error) {
    return (
      <p className="kb-message kb-message-error" role="alert">
        Markdown 渲染失败，请检查连接后重试。
      </p>
    );
  }

  if (!content.trim()) {
    return <div className="kb-markdown-preview fmt" />;
  }

  if (!html) {
    return (
      <p className="kb-markdown-preview-state" role="status">
        正在渲染 Markdown...
      </p>
    );
  }

  return (
    <div
      className="kb-markdown-preview fmt text-break text-wrap"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownPreview;
