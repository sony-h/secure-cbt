import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventNames } from '@secure-cbt/shared';
import { MonitoringGateway } from './monitoring.gateway';

@Injectable()
export class MonitoringListener {
  private readonly logger = new Logger(MonitoringListener.name);

  constructor(private readonly gateway: MonitoringGateway) {}

  @OnEvent(EventNames.SESSION_FINISHED)
  handleSessionFinished(payload: { sessionId: string; examId: string; studentId: string }) {
    this.logger.log(`Session finished: ${payload.sessionId}`);
    this.gateway.notifySessionFinished(payload.examId, {
      sessionId: payload.sessionId,
      studentId: payload.studentId,
      status: 'SUBMITTED',
    });
  }

  @OnEvent(EventNames.SESSION_EXPIRED)
  handleSessionExpired(payload: { sessionId: string; examId: string; studentId: string }) {
    this.logger.log(`Session expired: ${payload.sessionId}`);
    this.gateway.notifySessionFinished(payload.examId, {
      sessionId: payload.sessionId,
      studentId: payload.studentId,
      status: 'EXPIRED',
    });
  }

  @OnEvent(EventNames.SESSION_STARTED)
  handleSessionStarted(payload: { sessionId: string; examId: string; studentId: string }) {
    this.logger.log(`Session started: ${payload.sessionId}`);
  }
}
