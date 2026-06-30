import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const SOFT_DELETE_MODELS = new Set([
  'User', 'Student', 'Teacher',
  'AcademicYear', 'Major', 'Class', 'Subject',
  'QuestionBank', 'Question', 'Exam',
]);

const READ_ACTIONS = new Set([
  'findMany', 'findFirst', 'findUnique',
  'findFirstOrThrow', 'findUniqueOrThrow', 'count',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });

    this.$use(async (params, next) => {
      if (SOFT_DELETE_MODELS.has(params.model ?? '') && READ_ACTIONS.has(params.action)) {
        if (!params.args) params.args = {};
        if (!params.args.where) params.args.where = {};
        if (params.args.where.deleted_at === undefined) {
          params.args.where.deleted_at = null;
        }
      }
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }
}
