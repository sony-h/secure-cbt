'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RichMarkdownRenderer } from '@/components/ui/rich-markdown-renderer';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  FileCode,
  Sigma,
  List,
  ListOrdered,
  Indent,
  Eye,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface RichQuestionEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
  onOpenFormulaBuilder?: () => void;
  showLanguageSelector?: boolean;
  className?: string;
}

const PROGRAMMING_LANGUAGES = [
  { label: 'Python', key: 'python', snippet: 'def main():\n    print("Hello, World!")' },
  { label: 'SQL', key: 'sql', snippet: 'SELECT * FROM users WHERE active = 1;' },
  { label: 'JavaScript', key: 'javascript', snippet: 'function hitung(a, b) {\n  return a + b;\n}' },
  { label: 'C / C++', key: 'cpp', snippet: '#include <iostream>\n\nint main() {\n    return 0;\n}' },
  { label: 'Java', key: 'java', snippet: 'public class Main {\n    public static void main(String[] args) {\n    }\n}' },
  { label: 'HTML / CSS', key: 'html', snippet: '<div class="container">\n  <h1>Judul</h1>\n</div>' },
  { label: 'PHP', key: 'php', snippet: '<?php\n$nama = "Siswa";\necho $nama;\n?>' },
  { label: 'Pseudocode / Algoritma', key: 'plain', snippet: 'ALGORITMA HitungLuas\nINPUT panjang, lebar\nluas = panjang * lebar\nOUTPUT luas' },
];

export function RichQuestionEditor({
  value,
  onChange,
  placeholder = 'Ketik isi pertanyaan, stimulus, atau kode program di sini...',
  minHeight = '180px',
  onOpenFormulaBuilder,
  showLanguageSelector = true,
  className = '',
}: RichQuestionEditorProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to wrap or insert text around current selection
  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value ? `${value}\n${prefix}${defaultText}${suffix}` : `${prefix}${defaultText}${suffix}`);
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

  const insertCodeBlock = (lang: string, snippet: string) => {
    const el = textareaRef.current;
    const prefix = `\n\`\`\`${lang}\n`;
    const suffix = `\n\`\`\`\n`;
    insertFormatting(prefix, suffix, snippet);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = textareaRef.current;
      if (!el) return;

      const start = el.selectionStart;
      const end = el.selectionEnd;

      if (e.shiftKey) {
        // Dedent (Shift + Tab)
        const before = value.substring(0, start);
        const after = value.substring(end);
        const selected = value.substring(start, end);

        if (start === end) {
          // If no selection, remove up to 4 spaces before cursor
          const lineStart = before.lastIndexOf('\n') + 1;
          const lineBeforeCursor = before.substring(lineStart);
          const spacesToRemove = lineBeforeCursor.match(/ {1,4}$/);
          if (spacesToRemove) {
            const cutLen = spacesToRemove[0].length;
            const nextValue = before.substring(0, before.length - cutLen) + after;
            onChange(nextValue);
            setTimeout(() => el.setSelectionRange(start - cutLen, start - cutLen), 0);
          }
        } else {
          // Multiline dedent
          const lines = selected.split('\n');
          const dedented = lines.map((l) => l.replace(/^ {1,4}/, '')).join('\n');
          onChange(before + dedented + after);
          setTimeout(() => el.setSelectionRange(start, start + dedented.length), 0);
        }
      } else {
        // Indent (Tab -> 4 spaces)
        if (start === end) {
          const nextValue = value.substring(0, start) + '    ' + value.substring(end);
          onChange(nextValue);
          setTimeout(() => el.setSelectionRange(start + 4, start + 4), 0);
        } else {
          // Multiline indent
          const before = value.substring(0, start);
          const after = value.substring(end);
          const selected = value.substring(start, end);
          const lines = selected.split('\n');
          const indented = lines.map((l) => `    ${l}`).join('\n');
          onChange(before + indented + after);
          setTimeout(() => el.setSelectionRange(start, start + indented.length), 0);
        }
      }
    }
  };

  return (
    <div className={`rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col ${className}`}>
      {/* Editor Main Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-1.5 bg-muted/40 border-b border-border text-xs">
        {/* Left Toolbar: Styling Buttons */}
        <div className="flex flex-wrap items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('**', '**', 'tebal')}
            className="h-8 w-8 p-0"
            title="Tebal (Bold)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('*', '*', 'miring')}
            className="h-8 w-8 p-0"
            title="Miring (Italic)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('<u>', '</u>', 'garis bawah')}
            className="h-8 w-8 p-0"
            title="Garis Bawah (Underline)"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('~~', '~~', 'coret')}
            className="h-8 w-8 p-0"
            title="Coret (Strikethrough)"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Subscript & Superscript */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('<sup>', '</sup>', '2')}
            className="h-8 px-2 py-0 text-xs font-semibold"
            title="Pangkat (Superscript)"
          >
            x²
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('<sub>', '</sub>', '2')}
            className="h-8 px-2 py-0 text-xs font-semibold"
            title="Indeks Bawah (Subscript)"
          >
            x₂
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Lists */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('- ', '', 'Poin daftar')}
            className="h-8 w-8 p-0"
            title="Daftar Poin (Bullet List)"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('1. ', '', 'Poin berurutan')}
            className="h-8 w-8 p-0"
            title="Daftar Angka (Ordered List)"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Code Formatting */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('`', '`', 'kode_singkat')}
            className="h-8 px-2 py-0 text-xs font-mono text-primary gap-1"
            title="Kode Satu Baris (Inline Code)"
          >
            <Code className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Inline</span>
          </Button>

          {/* Code Block Dropdown */}
          {showLanguageSelector && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 py-0 text-xs font-mono gap-1 border-primary/20 hover:border-primary/50 text-primary"
                  title="Sisipkan Blok Kode Program"
                >
                  <FileCode className="h-3.5 w-3.5" />
                  <span>Blok Kode</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {PROGRAMMING_LANGUAGES.map((lang) => (
                  <DropdownMenuItem
                    key={lang.key}
                    onClick={() => insertCodeBlock(lang.key, lang.snippet)}
                    className="cursor-pointer text-xs flex items-center justify-between font-mono"
                    title={`Sisipkan Kode ${lang.label}`}
                  >
                    <span>{lang.label}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{lang.key}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Quick Python Button for KKA */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertCodeBlock('python', 'def main():\n    print("Hello KKA!")')}
            className="h-8 px-2 py-0 text-xs font-mono text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hidden md:inline-flex gap-1"
            title="Sisipkan Kode Python Cepat"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Python</span>
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* LaTeX Formula Dialog or inline insertion */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (onOpenFormulaBuilder) {
                onOpenFormulaBuilder();
              } else {
                insertFormatting('$', '$', 'x^2 + y^2 = r^2');
              }
            }}
            className="h-8 px-2 py-0 text-xs text-primary gap-1"
            title="Sisipkan Rumus Matematika (LaTeX)"
          >
            <Sigma className="h-4 w-4" />
            <span className="hidden sm:inline">Rumus</span>
          </Button>

          {/* Tab Indentation Quick Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('    ', '', '')}
            className="h-8 px-2 py-0 text-xs font-mono text-muted-foreground hover:text-foreground gap-1"
            title="Sisipkan Tab Indentasi (4 Spasi)"
          >
            <Indent className="h-3.5 w-3.5" />
            <span>Tab</span>
          </Button>
        </div>

        {/* Right Toolbar: View Mode Toggle */}
        <div className="flex items-center gap-1 border-l border-border pl-1.5 ml-auto">
          <Button
            type="button"
            variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('edit')}
            className="h-7 px-2 text-[11px]"
            title="Mode Tulis Saja"
          >
            Tulis
          </Button>
          <Button
            type="button"
            variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('preview')}
            className="h-7 px-2 text-[11px] gap-1"
            title="Mode Pratinjau Saja"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Pratinjau</span>
          </Button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex flex-col">
        {/* Editor Textarea */}
        {viewMode === 'edit' && (
          <div className="flex-1 relative flex flex-col">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              style={{ minHeight }}
              className="w-full flex-1 p-3 bg-transparent text-sm font-sans focus:outline-none resize-y leading-relaxed placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        {/* Live Preview Panel */}
        {viewMode === 'preview' && (
          <div
            className="flex-1 p-3 bg-muted/15 overflow-y-auto"
            style={{ minHeight }}
          >
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/60 mb-1.5 flex items-center gap-1 select-none">
              <Eye className="w-3 h-3" /> Live Preview
            </div>
            {value.trim() ? (
              <RichMarkdownRenderer content={value} />
            ) : (
              <div className="text-xs text-muted-foreground/40 italic py-2">
                Pratinjau tulisan dan format kode akan tampil di sini...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
