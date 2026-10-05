'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = '' }: MathRendererProps) {
  const renderedContent = useMemo(() => {
    if (!content) return null;

    // Split content by block math ($$...$$) first, then inline math ($...$)
    // Regex handles $$...$$ and $...$ safely
    const tokens: React.ReactNode[] = [];
    const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
    let lastIndex = 0;
    let blockMatch: RegExpExecArray | null;

    const parseInlineMathAndText = (textChunk: string, keyPrefix: string): React.ReactNode[] => {
      const inlineTokens: React.ReactNode[] = [];
      const inlineMathRegex = /\$([^\$\n]+?)\$/g;
      let inlineLastIndex = 0;
      let inlineMatch: RegExpExecArray | null;

      while ((inlineMatch = inlineMathRegex.exec(textChunk)) !== null) {
        if (inlineMatch.index > inlineLastIndex) {
          const plainText = textChunk.substring(inlineLastIndex, inlineMatch.index);
          inlineTokens.push(renderPlainText(plainText, `${keyPrefix}-t-${inlineLastIndex}`));
        }

        const math = inlineMatch[1] ?? '';
        try {
          const html = katex.renderToString(math, {
            displayMode: false,
            throwOnError: false,
          });
          inlineTokens.push(
            <span
              key={`${keyPrefix}-m-${inlineMatch.index}`}
              className="inline-math px-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          inlineTokens.push(<span key={`${keyPrefix}-err-${inlineMatch.index}`}>${math}$</span>);
        }

        inlineLastIndex = inlineMathRegex.lastIndex;
      }

      if (inlineLastIndex < textChunk.length) {
        inlineTokens.push(
          renderPlainText(textChunk.substring(inlineLastIndex), `${keyPrefix}-t-end`)
        );
      }

      return inlineTokens;
    };

    const renderPlainText = (text: string, key: string) => {
      // Split by newlines to preserve line breaks
      const lines = text.split('\n');
      return (
        <span key={key}>
          {lines.map((line, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <br />}
              {line}
            </React.Fragment>
          ))}
        </span>
      );
    };

    let blockIdx = 0;
    while ((blockMatch = blockMathRegex.exec(content)) !== null) {
      if (blockMatch.index > lastIndex) {
        const textBefore = content.substring(lastIndex, blockMatch.index);
        tokens.push(...parseInlineMathAndText(textBefore, `blk-${blockIdx}-pre`));
      }

      const math = blockMatch[1] ?? '';
      try {
        const html = katex.renderToString(math, {
          displayMode: true,
          throwOnError: false,
        });
        tokens.push(
          <div
            key={`blk-math-${blockMatch.index}`}
            className="my-3 py-1 overflow-x-auto text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        tokens.push(<div key={`blk-err-${blockMatch.index}`}>$${math}$$</div>);
      }

      lastIndex = blockMathRegex.lastIndex;
      blockIdx++;
    }

    if (lastIndex < content.length) {
      tokens.push(...parseInlineMathAndText(content.substring(lastIndex), `blk-end`));
    }

    return tokens;
  }, [content]);

  return <div className={`math-renderer leading-relaxed ${className}`}>{renderedContent}</div>;
}
