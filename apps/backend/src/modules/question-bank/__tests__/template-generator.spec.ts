import { describe, it, expect } from 'vitest';
import { generateWordTemplate, generateExcelTemplate } from '../templates/template-generator';

describe('TemplateGenerator', () => {
  it('should generate a valid Word .docx buffer', async () => {
    const buffer = await generateWordTemplate();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('should generate a valid Excel .xlsx buffer with 3 sheets', async () => {
    const buffer = await generateExcelTemplate();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
