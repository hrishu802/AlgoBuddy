import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

// Strictly allow safe link protocols
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('#') || (trimmed.startsWith('/') && !trimmed.startsWith('//'))) {
    return true;
  }
  try {
    const parsed = new URL(url, 'https://algobuddy.local');
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
}

// Parses inline tokens: bold, italic, code, links, and plain text
function renderInlineContent(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  // Regex matches: inline code `...`, bold **...**, italic *...*, link [text](url)
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `inline-${match.index}`;

    if (token.startsWith('`') && token.endsWith('`')) {
      const codeText = token.slice(1, -1);
      elements.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 font-mono text-[11px] text-indigo-300"
        >
          {codeText}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      const boldText = token.slice(2, -2);
      elements.push(
        <strong key={key} className="font-semibold text-slate-100">
          {renderInlineContent(boldText)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const italicText = token.slice(1, -1);
      elements.push(
        <em key={key} className="italic text-slate-300">
          {renderInlineContent(italicText)}
        </em>
      );
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        const linkUrl = linkMatch[2];
        if (isSafeUrl(linkUrl)) {
          elements.push(
            <a
              key={key}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 underline hover:text-indigo-300 transition-colors"
            >
              {linkText}
            </a>
          );
        } else {
          // Reject dangerous schemes like javascript:
          elements.push(
            <span key={key} className="text-slate-400 underline">
              {linkText}
            </span>
          );
        }
      } else {
        elements.push(token);
      }
    } else {
      elements.push(token);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements;
}

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="my-2.5 rounded-lg bg-[#060910] border border-slate-800 overflow-hidden text-left">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] font-mono text-slate-400">
        <span>{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 text-[11px] font-mono text-slate-200 overflow-x-auto whitespace-pre leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ content, className = '' }) => {
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Pre-split content by fenced code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`space-y-2 leading-relaxed break-words ${className}`}>
      {parts.map((part, partIdx) => {
        if (!part) return null;

        // Fenced code block
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineBreak = part.indexOf('\n');
          let language = '';
          let code = '';

          if (firstLineBreak !== -1) {
            language = part.slice(3, firstLineBreak).trim();
            code = part.slice(firstLineBreak + 1, -3);
          } else {
            code = part.slice(3, -3);
          }

          // Trim trailing newline only
          if (code.endsWith('\n')) {
            code = code.slice(0, -1);
          }

          return <CodeBlock key={`block-${partIdx}`} language={language} code={code} />;
        }

        // Regular Markdown text blocks
        const lines = part.split(/\r?\n/);
        const renderedNodes: React.ReactNode[] = [];
        let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
        let currentParagraph: string[] = [];

        const flushList = () => {
          if (currentList) {
            const listKey = `list-${partIdx}-${renderedNodes.length}`;
            if (currentList.type === 'ul') {
              renderedNodes.push(
                <ul key={listKey} className="space-y-1 my-1.5 pl-4 list-disc text-slate-200">
                  {currentList.items.map((item, i) => (
                    <li key={`li-${i}`}>{renderInlineContent(item)}</li>
                  ))}
                </ul>
              );
            } else {
              renderedNodes.push(
                <ol key={listKey} className="space-y-1 my-1.5 pl-4 list-decimal text-slate-200">
                  {currentList.items.map((item, i) => (
                    <li key={`oli-${i}`}>{renderInlineContent(item)}</li>
                  ))}
                </ol>
              );
            }
            currentList = null;
          }
        };

        const flushParagraph = () => {
          if (currentParagraph.length > 0) {
            const pKey = `p-${partIdx}-${renderedNodes.length}`;
            const fullText = currentParagraph.join(' ');
            renderedNodes.push(
              <p key={pKey} className="my-1 text-slate-200">
                {renderInlineContent(fullText)}
              </p>
            );
            currentParagraph = [];
          }
        };

        for (let i = 0; i < lines.length; i++) {
          const rawLine = lines[i];
          const line = rawLine.trim();

          if (!line) {
            flushParagraph();
            flushList();
            continue;
          }

          // Headings
          if (line.startsWith('#')) {
            flushParagraph();
            flushList();

            const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
            if (headingMatch) {
              const level = headingMatch[1].length;
              const title = headingMatch[2];
              const hKey = `h-${partIdx}-${i}`;

              if (level === 1) {
                renderedNodes.push(
                  <h1 key={hKey} className="text-sm sm:text-base font-bold text-white mt-3 mb-1.5">
                    {renderInlineContent(title)}
                  </h1>
                );
              } else if (level === 2) {
                renderedNodes.push(
                  <h2 key={hKey} className="text-xs sm:text-sm font-bold text-white mt-2.5 mb-1">
                    {renderInlineContent(title)}
                  </h2>
                );
              } else if (level === 3) {
                renderedNodes.push(
                  <h3 key={hKey} className="text-xs font-bold text-slate-100 mt-2 mb-1">
                    {renderInlineContent(title)}
                  </h3>
                );
              } else {
                renderedNodes.push(
                  <h4 key={hKey} className="text-xs font-semibold text-slate-200 mt-1.5 mb-0.5">
                    {renderInlineContent(title)}
                  </h4>
                );
              }
              continue;
            }
          }

          // Blockquotes
          if (line.startsWith('>')) {
            flushParagraph();
            flushList();
            const quoteText = line.replace(/^>\s?/, '');
            renderedNodes.push(
              <blockquote
                key={`quote-${partIdx}-${i}`}
                className="border-l-2 border-indigo-500/50 pl-2.5 py-0.5 my-1.5 text-slate-400 italic text-[11px]"
              >
                {renderInlineContent(quoteText)}
              </blockquote>
            );
            continue;
          }

          // Unordered list items: '-', '*', or '•'
          const ulMatch = line.match(/^[-*•]\s+(.+)$/);
          if (ulMatch) {
            flushParagraph();
            if (!currentList || currentList.type !== 'ul') {
              flushList();
              currentList = { type: 'ul', items: [] };
            }
            currentList.items.push(ulMatch[1]);
            continue;
          }

          // Ordered list items: '1. '
          const olMatch = line.match(/^\d+\.\s+(.+)$/);
          if (olMatch) {
            flushParagraph();
            if (!currentList || currentList.type !== 'ol') {
              flushList();
              currentList = { type: 'ol', items: [] };
            }
            currentList.items.push(olMatch[1]);
            continue;
          }

          // Standard paragraph lines
          flushList();
          currentParagraph.push(line);
        }

        flushParagraph();
        flushList();

        return <React.Fragment key={`part-${partIdx}`}>{renderedNodes}</React.Fragment>;
      })}
    </div>
  );
};
