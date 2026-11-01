import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SocketEvent } from '@secure-cbt/shared';
import { MonitoringGateway } from './monitoring.gateway';
import { MonitoringService } from './monitoring.service';

@Injectable()
export class MonitoringListener {
  private readonly logger = new Logger(MonitoringListener.name);

  constructor(
    private readonly gateway: MonitoringGateway,
    private readonly monitoringService: MonitoringService,
  ) {}

  @OnEvent(SocketEvent.SESSION_STARTED)
  async handleSessionStarted(payload: { sessionId: string; examId: string; studentId: string }) {
    this.logger.log(`Session started: ${payload.sessionId}`);
    try {
      await this.monitoringService.logEvent(payload.sessionId, 'SESSION_STARTED', 'Siswa memulai ujian');
    } catch (e) {
      this.logger.error('Failed to log session start', e as any);
    }
  }

  @OnEvent(SocketEvent.SESSION_FINISHED)
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

  @OnEvent(SocketEvent.SESSION_EXPIRED)
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

  @OnEvent(SocketEvent.SESSION_FORCE_SUBMIT)
  async handleSessionForceSubmit(payload: {
    sessionId: string;
    examId: string;
    studentId: string;
    studentUserId: string;
    studentName?: string;
  }) {
    this.logger.log(`Session force submitted: ${payload.sessionId}`);
    this.gateway.notifyStudentAction(payload.studentUserId, payload.examId, SocketEvent.SESSION_FORCE_SUBMIT, {
      sessionId: payload.sessionId,
      examId: payload.examId,
      message: 'Ujian telah dikumpulkan oleh pengawas',
    });
    this.gateway.notifySessionFinished(payload.examId, {
      sessionId: payload.sessionId,
      studentId: payload.studentUserId,
      studentName: payload.studentName || '',
      status: 'SUBMITTED',
    });
  }

  @OnEvent(SocketEvent.SESSION_WARNINGS_RESET)
  async handleSessionWarningsReset(payload: {
    sessionId: string;
    examId: string;
    studentId: string;
    studentUserId: string;
    warningCount?: number;
  }) {
    this.logger.log(`Session warnings reset: ${payload.sessionId}`);
    this.gateway.notifyStudentAction(payload.studentUserId, payload.examId, SocketEvent.SESSION_WARNINGS_RESET, {
      sessionId: payload.sessionId,
      examId: payload.examId,
      warningCount: payload.warningCount ?? 0,
    });
  }

  @OnEvent(SocketEvent.SESSION_WARNINGS_ADJUSTED)
  async handleSessionWarningsAdjusted(payload: {
    sessionId: string;
    examId: string;
    studentId: string;
    studentUserId: string;
    studentName?: string;
    warningCount: number;
    delta: number;
  }) {
    this.logger.log(`Session warnings adjusted: ${payload.sessionId} (delta: ${payload.delta}, total: ${payload.warningCount})`);
    this.gateway.notifyStudentAction(payload.studentUserId, payload.examId, SocketEvent.SESSION_WARNINGS_ADJUSTED, {
      sessionId: payload.sessionId,
      examId: payload.examId,
      warningCount: payload.warningCount,
      delta: payload.delta,
    });
  }

  @OnEvent(SocketEvent.SESSION_TIME_EXTENDED)
  async handleSessionTimeExtended(payload: {
    sessionId: string;
    examId: string;
    studentId: string;
    studentUserId: string;
    additionalMinutes: number;
    additionalSeconds: number;
    remainingTimeSeconds: number;
  }) {
    this.logger.log(`Session time extended: ${payload.sessionId} (+${payload.additionalMinutes}m)`);
    this.gateway.notifyStudentAction(payload.studentUserId, payload.examId, SocketEvent.SESSION_TIME_EXTENDED, {
      sessionId: payload.sessionId,
      examId: payload.examId,
      additionalMinutes: payload.additionalMinutes,
      additionalSeconds: payload.additionalSeconds,
      remainingTimeSeconds: payload.remainingTimeSeconds,
    });
  }

  @OnEvent(SocketEvent.SESSION_UNLOCKED)
  async handleSessionUnlocked(payload: {
    sessionId: string;
    examId: string;
    studentId: string;
    studentUserId: string;
  }) {
    this.logger.log(`Session unlocked: ${payload.sessionId}`);
    this.gateway.notifyStudentAction(payload.studentUserId, payload.examId, SocketEvent.SESSION_UNLOCKED, {
      sessionId: payload.sessionId,
      examId: payload.examId,
    });
  }

  @OnEvent(SocketEvent.SESSION_REOPENED)
  async handleSessionReopened(payload: {
    sessionId: string;
    examId: string;
    studentId: string;
    studentUserId: string;
    studentName?: string;
    remainingTimeSeconds: number;
    warningCount: number;
    reopenedBy?: string;
  }) {
    this.logger.log(`Session reopened: ${payload.sessionId} by ${payload.reopenedBy}`);
    this.gateway.notifyStudentAction(payload.studentUserId, payload.examId, SocketEvent.SESSION_REOPENED, {
      sessionId: payload.sessionId,
      examId: payload.examId,
      remainingTimeSeconds: payload.remainingTimeSeconds,
      warningCount: payload.warningCount,
      reopenedBy: payload.reopenedBy,
      message: 'Sesi ujian Anda telah dibuka kembali oleh pengawas',
    });
  }

  @OnEvent(SocketEvent.SESSION_REMEDIAL_AUTHORIZED)
  async handleSessionRemedialAuthorized(payload: {
    sessionId: string;
    examId: string;
    studentId: string;
    studentUserId: string;
    studentName?: string;
    proctorName?: string;
  }) {
    this.logger.log(`Session remedial authorized: ${payload.sessionId} for student ${payload.studentUserId}`);
    this.gateway.notifyStudentAction(payload.studentUserId, payload.examId, SocketEvent.SESSION_REMEDIAL_AUTHORIZED, {
      sessionId: payload.sessionId,
      examId: payload.examId,
      message: 'Anda telah diizinkan untuk mengikuti ujian remedial',
      proctorName: payload.proctorName,
    });
  }
}
