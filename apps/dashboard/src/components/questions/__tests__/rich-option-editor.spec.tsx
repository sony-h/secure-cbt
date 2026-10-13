import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RichOptionEditor } from '../rich-option-editor';

describe('RichOptionEditor', () => {
  it('supports multi-line code option input and renders textarea', () => {
    const handleChange = vi.fn();
    render(<RichOptionEditor value={'line 1\nline 2'} onChange={handleChange} label="A" />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('line 1\nline 2');
  });

  it('inserts inline code backticks from mini-toolbar', () => {
    const handleChange = vi.fn();
    render(<RichOptionEditor value="return x" onChange={handleChange} label="A" />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 8);

    const codeBtn = screen.getByTitle(/Format Kode/i);
    fireEvent.click(codeBtn);
    expect(handleChange).toHaveBeenCalledWith('`return x`');
  });

  it('inserts block code snippet into option for coding questions', () => {
    const handleChange = vi.fn();
    render(<RichOptionEditor value="" onChange={handleChange} label="B" />);
    const blockCodeBtn = screen.getByTitle(/Blok Kode/i);

    fireEvent.click(blockCodeBtn);
    expect(handleChange).toHaveBeenCalled();
    const calledVal = handleChange.mock.calls[0][0];
    expect(calledVal).toContain('```');
  });

  it('indents multiline selected code with Tab instead of replacing text', () => {
    const handleChange = vi.fn();
    render(<RichOptionEditor value={'a = 1\nb = 2'} onChange={handleChange} label="A" />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 11);

    fireEvent.keyDown(textarea, { key: 'Tab' });
    expect(handleChange).toHaveBeenCalledWith('    a = 1\n    b = 2');
  });

  it('allows natural focus shift on Shift+Tab without trapped selection', () => {
    const handleChange = vi.fn();
    render(<RichOptionEditor value="Option text" onChange={handleChange} label="A" />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 0);

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
    textarea.dispatchEvent(event);
    // default should NOT be prevented
    expect(event.defaultPrevented).toBe(false);
  });
});
