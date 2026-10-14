import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { WordParserService } from '../parsers/word-parser.service';
import { QuestionType } from '@secure-cbt/shared';

describe('WordParserService (Real file)', () => {
  const service = new WordParserService();

  it('should parse the bundled default-template-soal.docx successfully with all 6 question types', async () => {
    const templatePath = path.join(__dirname, '../templates/default-template-soal.docx');
    const buffer = fs.readFileSync(templatePath);

    const result = await service.parse(buffer);
    expect(result.length).toBe(6);
    expect(result.every((q) => q.valid)).toBe(true);

    // Q1: Pilihan Ganda (Nusantara)
    const q1 = result[0];
    expect(q1.content).toContain('Ibu kota negara Indonesia');
    expect(q1.type).toBe(QuestionType.MULTIPLE_CHOICE);
    expect(q1.options).toHaveLength(5);
    expect(q1.options[2].content).toBe('Nusantara');
    expect(q1.options[2].is_correct).toBe(true);
    expect(q1.valid).toBe(true);

    // Q2: PG Kompleks (interpreted)
    const q2 = result[1];
    expect(q2.type).toBe(QuestionType.MULTI_SELECT);
    expect(q2.options).toHaveLength(4);
    expect(q2.options[0].is_correct).toBe(true); // Python
    expect(q2.options[1].is_correct).toBe(true); // JS
    expect(q2.options[2].is_correct).toBe(false); // C++
    expect(q2.options[3].is_correct).toBe(true); // Ruby
    expect(q2.valid).toBe(true);

    // Q3: Benar / Salah (Fotosintesis)
    const q3 = result[2];
    expect(q3.type).toBe(QuestionType.TRUE_FALSE);
    expect(q3.options).toHaveLength(2);
    expect(q3.options[0].content).toBe('Benar');
    expect(q3.options[0].is_correct).toBe(true);
    expect(q3.valid).toBe(true);

    // Q4: Isian Singkat (Brazil)
    const q4 = result[3];
    expect(q4.type).toBe(QuestionType.SHORT_ANSWER);
    expect(q4.options[0].content).toBe('Portugis');
    expect(q4.options[0].is_correct).toBe(true);
    expect(q4.valid).toBe(true);

    // Q5: Menjodohkan (Pahlawan)
    const q5 = result[4];
    expect(q5.type).toBe(QuestionType.MATCHING);
    expect(q5.options).toHaveLength(3);
    const pair1 = JSON.parse(q5.options[0].content);
    expect(pair1.left).toBe('R.A. Kartini');
    expect(pair1.right).toBe('Jepara');
    expect(q5.valid).toBe(true);

    // Q6: Esai (Virus)
    const q6 = result[5];
    expect(q6.type).toBe(QuestionType.ESSAY);
    expect(q6.options).toHaveLength(0);
    expect(q6.explanation).toContain('Siklus litik');
    expect(q6.valid).toBe(true);
  });
});
