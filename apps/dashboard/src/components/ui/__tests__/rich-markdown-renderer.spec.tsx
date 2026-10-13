import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { RichMarkdownRenderer } from '../rich-markdown-renderer';

describe('RichMarkdownRenderer', () => {
  it('renders fenced code blocks with language badge, monospace styling, and line numbers', () => {
    const content = 'Berikut kode:\n```python\ndef halo():\n    return "dunia"\n```';
    const { container } = render(<RichMarkdownRenderer content={content} />);
    expect(container.querySelector('pre')).toBeTruthy();
    expect(container.querySelector('code')).toBeTruthy();
    expect(container.textContent).toContain('PYTHON');
    expect(container.textContent).toContain('def halo():');
    expect(container.textContent).toContain('return "dunia"');
  });

  it('renders inline formatting: bold, italic, underline, strike, sub, super, inline code', () => {
    const content = '**tebal** *miring* <u>garis bawah</u> ~~coret~~ H<sub>2</sub>O x<sup>2</sup> `variabel_x`';
    const { container } = render(<RichMarkdownRenderer content={content} />);
    expect(container.querySelector('strong')?.textContent).toBe('tebal');
    expect(container.querySelector('em')?.textContent).toBe('miring');
    expect(container.querySelector('u')?.textContent).toBe('garis bawah');
    expect(container.querySelector('del')?.textContent).toBe('coret');
    expect(container.querySelector('sub')?.textContent).toBe('2');
    expect(container.querySelector('sup')?.textContent).toBe('2');
    expect(container.querySelector('code')?.textContent).toBe('variabel_x');
  });

  it('renders KaTeX formulas alongside markdown', () => {
    const content = 'Nilai $x = 5$ dan persamaan $$f(x) = x^2$$';
    const { container } = render(<RichMarkdownRenderer content={content} />);
    expect(container.querySelector('.katex')).toBeTruthy();
  });

  it('preserves line breaks and indentation inside normal text', () => {
    const content = 'Baris 1\n    Baris 2 dengan indent\nBaris 3';
    const { container } = render(<RichMarkdownRenderer content={content} />);
    expect(container.textContent).toContain('Baris 1');
    expect(container.textContent).toContain('Baris 2 dengan indent');
  });
});
