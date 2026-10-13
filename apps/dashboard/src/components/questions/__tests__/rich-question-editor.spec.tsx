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
});
