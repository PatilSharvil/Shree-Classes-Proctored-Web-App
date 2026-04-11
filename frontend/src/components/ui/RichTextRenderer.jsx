import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/**
 * RichTextRenderer safely renders markdown with LaTeX math.
 * Math syntax supported: $x$ or $$x$$
 */
const RichTextRenderer = ({ content, className = '' }) => {
  if (!content) return null;

  return (
    <div className={`prose prose-sm max-w-none ${className} math-renderer`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Ensure embedded paragraphs don't break flex layouts awkwardly
          p: ({ node, ...props }) => <div className="mb-2 last:mb-0" {...props} />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default RichTextRenderer;
