import { Module } from '@nestjs/common';
import { QuestionBankService } from './question-bank.service';
import { QuestionBankController } from './question-bank.controller';
import { WordParserService } from './parsers/word-parser.service';
import { ExcelParserService } from './parsers/excel-parser.service';
import { QuestionImportService } from './question-import.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [QuestionBankController],
  providers: [
    QuestionBankService,
    WordParserService,
    ExcelParserService,
    QuestionImportService,
  ],
  exports: [QuestionBankService, QuestionImportService],
})
export class QuestionBankModule {}
