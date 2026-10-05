import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import * as path from 'path';
import { SecurityDefaults } from '@secure-cbt/shared';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './common/queue/queue.module';
import { StorageModule } from './modules/storage/storage.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AcademicModule } from './modules/academic/academic.module';
import { StudentModule } from './modules/student/student.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { QuestionBankModule } from './modules/question-bank/question-bank.module';
import { ExamModule } from './modules/exam/exam.module';
import { SessionModule } from './modules/session/session.module';
import { AnswerModule } from './modules/answer/answer.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { GradingModule } from './modules/grading/grading.module';
import { ReportModule } from './modules/report/report.module';
import { SettingsModule } from './modules/settings/settings.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Static Media Files ─────────────────────────────────────
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'storage', 'uploads'),
      serveRoot: '/uploads',
    }),

    // ── Rate Limiting ──────────────────────────────────────────
    ThrottlerModule.forRoot([{
      ttl: (Number(process.env.THROTTLE_TTL) || SecurityDefaults.RATE_LIMIT_TTL) * 1000,
      limit: Number(process.env.THROTTLE_LIMIT) || SecurityDefaults.RATE_LIMIT_PER_MINUTE,
    }]),

    // ── Event System ───────────────────────────────────────────
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),

    // ── Infrastructure ─────────────────────────────────────────
    PrismaModule,
    QueueModule,
    StorageModule,

    // ── Business Modules ───────────────────────────────────────
    HealthModule,
    UploadsModule,
    AuthModule,
    UserModule,
    AcademicModule,
    StudentModule,
    TeacherModule,
    QuestionBankModule,
    ExamModule,
    SessionModule,
    AnswerModule,
    MonitoringModule,
    GradingModule,
    ReportModule,
    SettingsModule,
  ],
  providers: [
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
