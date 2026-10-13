import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { WordParserService } from '../parsers/word-parser.service';
import { QuestionType } from '@secure-cbt/shared';

describe('WordParserService (Real file)', () => {
  const service = new WordParserService();

  it('should parse the bundled default-template-soal.docx successfully', async () => {
    const templatePath = path.join(__dirname, '../templates/default-template-soal.docx');
    const buffer = fs.readFileSync(templatePath);

    const result = await service.parse(buffer);
    expect(result.length).toBe(3);

    const q1 = result[0];
    expect(q1.content).toContain('sistem operasi pada komputer');
    expect(q1.type).toBe(QuestionType.MULTIPLE_CHOICE);
    expect(q1.options).toHaveLength(5);
    expect(q1.options[1].content).toBe('Microsoft Windows');
    expect(q1.options[1].is_correct).toBe(true);
    expect(q1.explanation).toContain('Microsoft Windows merupakan sistem operasi');
    expect(q1.valid).toBe(true);
    expect(q1.error).toBeNull();

    const q2 = result[1];
    expect(q2.content).toContain('nilai diskriminan');
    expect(q2.options).toHaveLength(5);
    expect(q2.options[1].content).toBe('49');
    expect(q2.options[1].is_correct).toBe(true);
    expect(q2.valid).toBe(true);

    const q3 = result[2];
    expect(q3.content).toContain('respirasi seluler');
    expect(q3.options).toHaveLength(5);
    expect(q3.options[1].content).toBe('Mitokondria');
    expect(q3.options[1].is_correct).toBe(true);
    expect(q3.valid).toBe(true);
  });
});
