import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Sanitize and fix malformed LaTeX content
 */
const sanitizeLaTeXContent = (content) => {
  if (!content || !content.trim()) return content;

  let sanitized = content.trim();

  // Fix 1: If text ends with $$ but doesn't start with $$, add $$ at beginning
  if (sanitized.endsWith('$$') && !sanitized.startsWith('$$')) {
    sanitized = `$$ ${sanitized.replace(/\s*\$\$\s*$/, '').trim()} $$`;
  }

  // Fix 2: If text has $$ only at start but not at end, add $$ at end
  if (sanitized.startsWith('$$') && !sanitized.endsWith('$$')) {
    sanitized = `${sanitized.replace(/^\$\$\s*/, '').trim()} $$`;
  }

  // Fix 3: Remove double $$
  sanitized = sanitized.replace(/\$\$\s*\$\$/g, '$$');

  // Fix 4: If has LaTeX commands but no $$ wrappers, add them
  const hasLatexCommands = /\\(lim|frac|sqrt|sin|cos|tan|ln|log|to|infty|pi|times|int|sum|prod|div|pm)/.test(sanitized);
  if (hasLatexCommands && !sanitized.includes('$$')) {
    sanitized = `$$ ${sanitized} $$`;
  }

  // Fix 5: Fix unbalanced parentheses
  const openParenCount = (sanitized.match(/\(/g) || []).length;
  const closeParenCount = (sanitized.match(/\)/g) || []).length;
  if (openParenCount > closeParenCount) {
    sanitized += ')'.repeat(openParenCount - closeParenCount);
  }

  return sanitized;
};

/**
 * Safe Math Renderer - Renders LaTeX with error fallback
 */
const SafeMathRenderer = ({ content }) => {
  const renderedHTML = useMemo(() => {
    try {
      return katex.renderToString(content, {
        throwOnError: false,
        displayMode: true,
        errorColor: '#cc0000'
      });
    } catch (error) {
      console.warn('[RichTextRenderer] LaTeX rendering failed:', error.message);
      return `<span class="text-gray-700">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
    }
  }, [content]);

  return <div dangerouslySetInnerHTML={{ __html: renderedHTML }} />;
};

/**
 * RichTextRenderer safely renders markdown with LaTeX math.
 * Auto-sanitizes malformed LaTeX and handles rendering errors gracefully.
 */
const RichTextRenderer = ({ content, className = '' }) => {
  if (!content) return null;

  // Auto-sanitize content
  const sanitizedContent = sanitizeLaTeXContent(content);

  // Check if content contains LaTeX math
  const hasMath = /\$\$/.test(sanitizedContent) || /\$[^\$]/.test(sanitizedContent);

  if (!hasMath) {
    // No math, render as plain markdown
    return (
      <div className={`prose prose-sm max-w-none ${className} math-renderer`}>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p: ({ node, ...props }) => <div className="mb-2 last:mb-0" {...props} />
          }}
        >
          {sanitizedContent}
        </ReactMarkdown>
      </div>
    );
  }

  // Has math - split content and render math blocks safely
  const parts = sanitizedContent.split(/(\$\$[\s\S]*?\$\$|\$[^\$]*?\$)/g);

  return (
    <div className={`prose prose-sm max-w-none ${className} math-renderer`}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // Display math block
          const mathContent = part.replace(/^\$\$\s*/, '').replace(/\s*\$\$$/, '');
          return (
            <div key={index} className="my-2 overflow-x-auto">
              <SafeMathRenderer content={mathContent} />
            </div>
          );
        } else if (part.startsWith('$') && part.endsWith('$') && !part.startsWith('$$')) {
          // Inline math block
          const mathContent = part.replace(/^\$/, '').replace(/\$$/, '');
          return (
            <span key={index}>
              <SafeMathRenderer content={mathContent} />
            </span>
          );
        } else {
          // Plain text/markdown
          return (
            <ReactMarkdown
              key={index}
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ node, ...props }) => <span {...props} />
              }}
            >
              {part}
            </ReactMarkdown>
          );
        }
      })}
    </div>
  );
};

export default RichTextRenderer;
