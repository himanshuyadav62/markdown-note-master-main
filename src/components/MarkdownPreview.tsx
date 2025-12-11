import { marked } from 'marked';
import { useEffect, useState } from 'react';

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    const renderMarkdown = async () => {
      const rendered = await marked(content || '*Start typing to see preview...*');
      setHtml(rendered);
    };
    renderMarkdown();
  }, [content]);

  return (
    <div 
      className="markdown-preview prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
