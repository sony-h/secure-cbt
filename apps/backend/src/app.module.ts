import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { QueueModule } from './common/queue/queue.module';
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

    // ── Rate Limiting ──────────────────────────────────────────
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
      limit: parseInt(process.env.THROTTLE_LIMIT || '60', 10),
    }]),

    // ── Event System ───────────────────────────────────────────
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),

    // ── Infrastructure ─────────────────────────────────────────
    PrismaModule,
    RedisModule,
    QueueModule,

    // ── Business Modules ───────────────────────────────────────
    HealthModule,
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
