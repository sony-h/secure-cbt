import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RichQuestionEditor } from '../rich-question-editor';

describe('RichQuestionEditor', () => {
  it('inserts 4 spaces when Tab is pressed instead of losing focus', () => {
    const handleChange = vi.fn();
    render(<RichQuestionEditor value={'def func():\n'} onChange={handleChange} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.setSelectionRange(12, 12);

    fireEvent.keyDown(textarea, { key: 'Tab' });
    expect(handleChange).toHaveBeenCalledWith('def func():\n    ');
  });

  it('inserts bold markdown syntax when bold button is clicked', () => {
    const handleChange = vi.fn();
    render(<RichQuestionEditor value="halo" onChange={handleChange} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 4);

    const boldBtn = screen.getByTitle(/Tebal/i);
    fireEvent.click(boldBtn);
    expect(handleChange).toHaveBeenCalledWith('**halo**');
  });

  it('inserts Python code block when Python language is selected', () => {
    const handleChange = vi.fn();
    render(<RichQuestionEditor value="" onChange={handleChange} />);
    const pyBtn = screen.getByTitle(/Sisipkan Kode Python/i);

    fireEvent.click(pyBtn);
    expect(handleChange).toHaveBeenCalled();
    const calledValue = handleChange.mock.calls[0][0];
    expect(calledValue).toContain('```python');
    expect(calledValue).toContain('```');
  });

  it('defaults to Tulis (edit) mode without split button and toggles between Tulis and Pratinjau', () => {
    const handleChange = vi.fn();
    render(<RichQuestionEditor value="Soal nomor 1" onChange={handleChange} />);

    // Split button must not exist
    expect(screen.queryByTitle(/Mode Split/i)).toBeNull();

    // Editor textarea is present by default
    expect(screen.getByRole('textbox')).toBeTruthy();

    // Switch to Pratinjau mode
    const previewBtn = screen.getByTitle(/Mode Pratinjau Saja/i);
    fireEvent.click(previewBtn);

    // Textarea is hidden in preview mode
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText(/Live Preview/i)).toBeTruthy();

    // Switch back to Tulis
    const editBtn = screen.getByTitle(/Mode Tulis Saja/i);
    fireEvent.click(editBtn);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });
});
