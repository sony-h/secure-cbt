import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventNames } from '@secure-cbt/shared';
import { MonitoringGateway } from './monitoring.gateway';
import { MonitoringService } from './monitoring.service';

@Injectable()
export class MonitoringListener {
  private readonly logger = new Logger(MonitoringListener.name);

  constructor(
    private readonly gateway: MonitoringGateway,
    private readonly monitoringService: MonitoringService,
  ) {}

  @OnEvent(EventNames.SESSION_STARTED)
  async handleSessionStarted(payload: { sessionId: string; examId: string; studentId: string }) {
    this.logger.log(`Session started: ${payload.sessionId}`);
    try {
      await this.monitoringService.logEvent(payload.sessionId, 'SESSION_STARTED', 'Siswa memulai ujian');
    } catch (e) {
      this.logger.error('Failed to log session start', e as any);
    }
  }

  @OnEvent(EventNames.SESSION_FINISHED)
  async handleSessionFinished(payload: { sessionId: string; examId: string; studentId: string; studentName: string }) {
    this.logger.log(`Session finished: ${payload.sessionId}`);
    this.gateway.notifySessionFinished(payload.examId, {
      sessionId: payload.sessionId,
      studentId: payload.studentId,
      studentName: payload.studentName,
      status: 'SUBMITTED',
    });
    try {
      await this.monitoringService.logEvent(payload.sessionId, 'SESSION_SUBMITTED', 'Ujian selesai dikerjakan');
    } catch (e) {
      this.logger.error('Failed to log session finish', e as any);
    }
  }

  @OnEvent(EventNames.SESSION_EXPIRED)
  async handleSessionExpired(payload: { sessionId: string; examId: string; studentId: string; studentName: string }) {
    this.logger.log(`Session expired: ${payload.sessionId}`);
    this.gateway.notifySessionFinished(payload.examId, {
      sessionId: payload.sessionId,
      studentId: payload.studentId,
      studentName: payload.studentName,
      status: 'EXPIRED',
    });
    try {
      await this.monitoringService.logEvent(payload.sessionId, 'SESSION_EXPIRED', 'Waktu ujian habis');
    } catch (e) {
      this.logger.error('Failed to log session expiry', e as any);
    }
  }
}
