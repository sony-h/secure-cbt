'use client';

import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { Check, Copy } from 'lucide-react';

export interface RichMarkdownRendererProps {
  content: string;
  className?: string;
  showLineNumbers?: boolean;
}

interface CodeBlockProps {
  language: string;
  code: string;
  showLineNumbers?: boolean;
}

function CodeBlock({ language, code, showLineNumbers = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // fallback silent
      }
    }
  };

  const normalizedCode = code.replace(/\r\n/g, '\n').replace(/\n$/, '');
  const lines = normalizedCode.split('\n');
  const langDisplay = (language || 'code').toUpperCase();

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-700/60 bg-[#1e1e2e] text-slate-100 shadow-md">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#181825] border-b border-slate-700/60 text-xs text-slate-400 font-mono select-none">
        <span className="flex items-center gap-1.5 font-semibold text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          {langDisplay}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-700/60 transition-colors text-slate-400 hover:text-slate-200"
          title="Salin Kode"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[11px]">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Salin</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body with Horizontal Scroll & Optional Line Numbers */}
      <div className="overflow-x-auto p-3 text-xs sm:text-sm font-mono leading-relaxed">
        <pre className="flex">
          {showLineNumbers && (
            <div className="select-none pr-3 mr-3 text-right text-slate-500 border-r border-slate-700/50 flex flex-col">
              {lines.map((_, i) => (
                <span key={i} className="leading-relaxed">
                  {i + 1}
                </span>
              ))}
            </div>
          )}
          <code className="text-slate-100 flex-1 whitespace-pre">{code}</code>
        </pre>
      </div>
    </div>
  );
}

export function RichMarkdownRenderer({
  content,
  className = '',
  showLineNumbers = true,
}: RichMarkdownRendererProps) {
  const renderedContent = useMemo(() => {
    if (!content) return null;

    // First, split content into major blocks:
    // 1. Block math: $$ ... $$
    // 2. Fenced code block: ```[lang] ... ```
    const majorBlockRegex = /(```(?:[a-zA-Z0-9_\-#+]+)?\r?\n[\s\S]*?```|\$\$[\s\S]*?\$\$)/g;
    const pieces: { type: 'code' | 'math-block' | 'text'; raw: string }[] = [];

    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = majorBlockRegex.exec(content)) !== null) {
      if (match.index > lastIdx) {
        pieces.push({
          type: 'text',
          raw: content.substring(lastIdx, match.index),
        });
      }

      const matchedString = match[0];
      if (matchedString.startsWith('```')) {
        pieces.push({ type: 'code', raw: matchedString });
      } else {
        pieces.push({ type: 'math-block', raw: matchedString });
      }

      lastIdx = majorBlockRegex.lastIndex;
    }

    if (lastIdx < content.length) {
      pieces.push({
        type: 'text',
        raw: content.substring(lastIdx),
      });
    }

    return pieces.map((piece, pieceIdx) => {
      if (piece.type === 'code') {
        const codeBlockMatch = piece.raw.match(/^```([a-zA-Z0-9_\-#+]*)\r?\n([\s\S]*?)```$/);
        const language = codeBlockMatch ? codeBlockMatch[1] || 'code' : 'code';
        const code = codeBlockMatch && codeBlockMatch[2] ? codeBlockMatch[2] : '';
        return (
          <CodeBlock
            key={`cb-${pieceIdx}`}
            language={language}
            code={code}
            showLineNumbers={showLineNumbers}
          />
        );
      }

      if (piece.type === 'math-block') {
        const math = piece.raw.replace(/^\$\$|\$\$$/g, '').trim();
        try {
          const html = katex.renderToString(math, {
            displayMode: true,
            throwOnError: false,
          });
          return (
            <div
              key={`mb-${pieceIdx}`}
              className="my-2 overflow-x-auto py-1 text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <pre key={`mb-err-${pieceIdx}`} className="p-2 bg-destructive/10 text-destructive text-xs">
              {piece.raw}
            </pre>
          );
        }
      }

      // piece.type === 'text'
      return (
        <span key={`txt-blk-${pieceIdx}`}>
          {renderRichTextChunk(piece.raw, `txt-blk-${pieceIdx}`)}
        </span>
      );
    });
  }, [content, showLineNumbers]);

  return <div className={`rich-markdown-container leading-relaxed ${className}`}>{renderedContent}</div>;
}

/**
 * Parses inline math ($...$) first, then formats typography (bold, italic, code, sub/sup, etc.)
 */
function renderRichTextChunk(textChunk: string, keyPrefix: string): React.ReactNode[] {
  const inlineTokens: React.ReactNode[] = [];
  const inlineMathRegex = /\$([^\$\n]+?)\$/g;
  let inlineLastIndex = 0;
  let inlineMatch: RegExpExecArray | null;

  while ((inlineMatch = inlineMathRegex.exec(textChunk)) !== null) {
    if (inlineMatch.index > inlineLastIndex) {
      const plainText = textChunk.substring(inlineLastIndex, inlineMatch.index);
      inlineTokens.push(
        ...parseTypographyAndLinebreaks(plainText, `${keyPrefix}-p-${inlineLastIndex}`)
      );
    }

    const math = inlineMatch[1] ?? '';
    try {
      const html = katex.renderToString(math, {
        displayMode: false,
        throwOnError: false,
      });
      inlineTokens.push(
        <span
          key={`${keyPrefix}-im-${inlineMatch.index}`}
          className="inline-math px-0.5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      inlineTokens.push(<span key={`${keyPrefix}-im-err-${inlineMatch.index}`}>${math}$</span>);
    }

    inlineLastIndex = inlineMathRegex.lastIndex;
  }

  if (inlineLastIndex < textChunk.length) {
    inlineTokens.push(
      ...parseTypographyAndLinebreaks(
        textChunk.substring(inlineLastIndex),
        `${keyPrefix}-p-end`
      )
    );
  }

  return inlineTokens;
}

/**
 * Formats Markdown typography:
 * - `inline code`
 * - **bold**
 * - *italic* or _italic_
 * - ~~strikethrough~~
 * - <u>underline</u>
 * - <sub>sub</sub>
 * - <sup>sup</sup>
 * - Line breaks (\n)
 */
function parseTypographyAndLinebreaks(text: string, keyPrefix: string): React.ReactNode[] {
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
    const isOrdered = /^\s*\d+\.\s+/.test(line);

    let displayLine = line;
    if (isBullet) {
      displayLine = line.replace(/^\s*[-*]\s+/, '');
    } else if (isOrdered) {
      displayLine = line.replace(/^\s*\d+\.\s+/, '');
    }

    const formattedInline = parseInlineSpans(displayLine, `${keyPrefix}-l-${lineIdx}`);

    if (isBullet) {
      return (
        <span key={`${keyPrefix}-line-${lineIdx}`} className="flex items-start gap-2 my-0.5 ml-4">
          <span className="text-primary select-none mt-1 leading-none text-xs">•</span>
          <span className="flex-1">{formattedInline}</span>
        </span>
      );
    }

    if (isOrdered) {
      const numMatch = line.match(/^\s*(\d+)\.\s+/);
      const num = numMatch ? numMatch[1] : '1';
      return (
        <span key={`${keyPrefix}-line-${lineIdx}`} className="flex items-start gap-2 my-0.5 ml-4">
          <span className="text-primary font-semibold select-none text-xs min-w-[1.2rem]">{num}.</span>
          <span className="flex-1">{formattedInline}</span>
        </span>
      );
    }

    return (
      <React.Fragment key={`${keyPrefix}-line-${lineIdx}`}>
        {lineIdx > 0 && <br />}
        {formattedInline}
      </React.Fragment>
    );
  });
}

function parseInlineSpans(text: string, keyPrefix: string): React.ReactNode[] {
  // Regex to match inline tags:
  // `code` | **bold** | *italic* | ~~strike~~ | <u>underline</u> | <sub>sub</sub> | <sup>sup</sup>
  // Non-space lookaheads prevent arithmetic like `5 * 4 * 3` from falsely matching as italic
  const tokenRegex = /(`[^`]+`|\*\*(?!\s)[^*\n]+?(?<!\s)\*\*|\*(?!\s)[^*\n]+?(?<!\s)\*|~~(?!\s)[^~\n]+?(?<!\s)~~|<u>[\s\S]*?<\/u>|<sub>[\s\S]*?<\/sub>|<sup>[\s\S]*?<\/sup>)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    const tokenKey = `${keyPrefix}-tok-${match.index}`;

    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={tokenKey}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-muted text-primary font-mono text-[0.85em] font-semibold border border-border/60"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={tokenKey} className="font-bold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={tokenKey} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      nodes.push(
        <del key={tokenKey} className="line-through text-muted-foreground">
          {token.slice(2, -2)}
        </del>
      );
    } else if (token.startsWith('<u>') && token.endsWith('</u>')) {
      nodes.push(
        <u key={tokenKey} className="underline underline-offset-2">
          {token.slice(3, -4)}
        </u>
      );
    } else if (token.startsWith('<sub>') && token.endsWith('</sub>')) {
      nodes.push(
        <sub key={tokenKey} className="text-[0.75em] bottom-[-0.2em] relative">
          {token.slice(5, -6)}
        </sub>
      );
    } else if (token.startsWith('<sup>') && token.endsWith('</sup>')) {
      nodes.push(
        <sup key={tokenKey} className="text-[0.75em] top-[-0.3em] relative font-medium">
          {token.slice(5, -6)}
        </sup>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
}
