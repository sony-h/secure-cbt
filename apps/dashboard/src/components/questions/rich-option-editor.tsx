'use client';

import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Code, FileCode, Sigma } from 'lucide-react';

export interface RichOptionEditorProps {
  value: string;
  onChange: (val: string) => void;
  label: string;
  placeholder?: string;
  onOpenFormulaBuilder?: () => void;
  className?: string;
}

export function RichOptionEditor({
  value,
  onChange,
  label,
  placeholder,
  onOpenFormulaBuilder,
  className = '',
}: RichOptionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height based on scrollHeight
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      const scrollH = el.scrollHeight;
      el.style.height = `${Math.max(40, scrollH)}px`;
    }
  }, [value]);

  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value ? `${value} ${prefix}${defaultText}${suffix}` : `${prefix}${defaultText}${suffix}`);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;

    const nextValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(nextValue);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = textareaRef.current;
      if (!el) return;

      const start = el.selectionStart;
      const end = el.selectionEnd;

      if (!e.shiftKey) {
        const nextValue = value.substring(0, start) + '    ' + value.substring(end);
        onChange(nextValue);
        setTimeout(() => el.setSelectionRange(start + 4, start + 4), 0);
      }
    }
  };

  const hasCode = value.includes('```') || value.includes('`') || value.includes('def ') || value.includes('function ');

  return (
    <div
      className={`relative flex flex-col rounded-lg border border-input bg-background focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 transition-all ${className}`}
    >
      <div className="flex items-start gap-2 p-1.5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || `Pilihan ${label}`}
          rows={1}
          className={`flex-1 min-h-[38px] p-1.5 bg-transparent text-sm focus:outline-none resize-none leading-relaxed placeholder:text-muted-foreground/50 ${
            hasCode ? 'font-mono text-xs sm:text-sm' : 'font-medium'
          }`}
        />

        {/* Mini Formatting Toolbar on the Right */}
        <div className="flex items-center gap-0.5 bg-muted/40 rounded-md p-0.5 border border-border/40 shrink-0 self-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('**', '**', 'tebal')}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            title="Tebal"
          >
            <Bold className="h-3 w-3" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('*', '*', 'miring')}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            title="Miring"
          >
            <Italic className="h-3 w-3" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('`', '`', 'kode')}
            className="h-6 px-1.5 p-0 text-[10px] font-mono text-primary hover:bg-primary/10"
            title="Format Kode (Inline)"
          >
            <Code className="h-3 w-3" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('\n```python\n', '\n```\n', 'pass')}
            className="h-6 px-1.5 p-0 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            title="Blok Kode Multi-Baris"
          >
            <FileCode className="h-3 w-3" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('<sup>', '</sup>', '2')}
            className="h-6 px-1 p-0 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
            title="Pangkat"
          >
            x²
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (onOpenFormulaBuilder) {
                onOpenFormulaBuilder();
              } else {
                insertFormatting('$', '$', 'x');
              }
            }}
            className="h-6 w-6 p-0 text-primary hover:bg-primary/10"
            title="Sisipkan Rumus ke Opsi Ini"
          >
            <Sigma className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
