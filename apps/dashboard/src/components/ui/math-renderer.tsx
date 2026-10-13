'use client';

import React from 'react';
import { RichMarkdownRenderer, RichMarkdownRendererProps } from './rich-markdown-renderer';

export { RichMarkdownRenderer };
export type { RichMarkdownRendererProps };

interface MathRendererProps {
  content: string;
  className?: string;
  showLineNumbers?: boolean;
}

/**
 * MathRenderer enhanced with Markdown, Code Blocks, and LaTeX math.
 * Backward-compatible drop-in replacement.
 */
export function MathRenderer({ content, className = '', showLineNumbers = false }: MathRendererProps) {
  return <RichMarkdownRenderer content={content} className={className} showLineNumbers={showLineNumbers} />;
}
