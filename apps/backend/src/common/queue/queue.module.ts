import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueNames } from '@secure-cbt/shared';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.BULLMQ_REDIS_HOST || 'localhost',
        port: parseInt(process.env.BULLMQ_REDIS_PORT || '6379', 10),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600 * 24 }, // Keep completed jobs for 24h
        removeOnFail: { age: 3600 * 24 * 7 }, // Keep failed jobs for 7 days
      },
    }),
    // Register all queues
    BullModule.registerQueue(
      { name: QueueNames.QUESTION_IMPORT },
      { name: QueueNames.EXCEL_PROCESSING },
      { name: QueueNames.PDF_GENERATION },
      { name: QueueNames.EMAIL_SENDING },
      { name: QueueNames.REPORT_GENERATION },
      { name: QueueNames.BACKGROUND_CLEANUP as string },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
