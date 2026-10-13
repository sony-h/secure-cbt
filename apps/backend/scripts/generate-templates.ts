import * as fs from 'fs';
import * as path from 'path';
import {
  generateWordTemplate,
  generateExcelTemplate,
} from '../src/modules/question-bank/templates/template-generator';

async function main() {
  const templatesDir = path.join(
    __dirname,
    '../src/modules/question-bank/templates',
  );

  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  console.log('Generating Word template (.docx)...');
  const wordBuffer = await generateWordTemplate();
  const wordPath = path.join(templatesDir, 'default-template-soal.docx');
  fs.writeFileSync(wordPath, wordBuffer);
  console.log(`Saved Word template (${wordBuffer.length} bytes) to ${wordPath}`);

  console.log('Generating Excel template (.xlsx)...');
  const excelBuffer = await generateExcelTemplate();
  const excelPath = path.join(templatesDir, 'default-template-soal.xlsx');
  fs.writeFileSync(excelPath, excelBuffer);
  console.log(`Saved Excel template (${excelBuffer.length} bytes) to ${excelPath}`);

  console.log('Master templates successfully generated!');
}

main().catch((err) => {
  console.error('Failed to generate templates:', err);
  process.exit(1);
});
