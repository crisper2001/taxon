import React from 'react';
import { marked } from 'marked';

interface MarkdownProps {
  content: string;
  className?: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content, className = '' }) => {
  const html = (marked.parse(content || '') as string).replace(/<a (?![^>]*\btarget=)/g, '<a target="_blank" rel="noopener noreferrer" ');

  return (
    <div
      className={`markdown-body text-text leading-relaxed [&>p]:mb-3 [&>p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:mb-3 [&_strong]:font-bold [&_em]:italic [&_a]:underline [&_a]:text-accent hover:[&_a]:text-accent-hover [&_h1]:font-bold [&_h1]:text-lg [&_h2]:font-bold [&_h3]:font-semibold wrap-break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
