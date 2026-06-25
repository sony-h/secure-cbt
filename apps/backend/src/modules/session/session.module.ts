import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { ExamModule } from '../exam/exam.module';
import { GradingModule } from '../grading/grading.module';

@Module({
  imports: [ExamModule, GradingModule],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
