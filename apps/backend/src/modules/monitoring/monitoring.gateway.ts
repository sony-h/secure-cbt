import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SocketEvent } from '@secure-cbt/shared';
import { MonitoringService } from './monitoring.service';

const getSocketOrigins = () => {
  const envOrigin = process.env.SOCKET_IO_CORS_ORIGIN || process.env.CORS_ORIGIN;
  if (!envOrigin || envOrigin === '*') return true;
  return envOrigin.includes(',') ? envOrigin.split(',').map((o) => o.trim()) : envOrigin;
};

@WebSocketGateway({
  namespace: '/monitoring',
  cors: {
    origin: getSocketOrigins(),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class MonitoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MonitoringGateway.name);

  // Track connected clients
  private readonly studentSockets = new Map<string, string>(); // studentId → socketId

  constructor(private readonly monitoringService: MonitoringService) {}

  handleConnection(client: Socket): void {
    const { role, userId, examId } = client.handshake.query;
    this.logger.log(`Client connected: ${client.id} (role: ${role}, userId: ${userId})`);

    if (role === 'student' && typeof userId === 'string') {
      this.studentSockets.set(userId, client.id);
    }

    if (typeof examId === 'string' && examId.length > 0) {
      client.join(`exam:${examId}`);

      if (role === 'teacher') {
        // Send currently connected student user IDs to this teacher
        const connectedStudentIds = Array.from(this.studentSockets.keys());
        client.emit('connected.students', { examId, studentIds: connectedStudentIds });
      }
    }
  }

  handleDisconnect(client: Socket): void {
    const { role, userId, examId } = client.handshake.query;
    this.logger.log(`Client disconnected: ${client.id} (role: ${role}, userId: ${userId})`);

    if (role === 'student' && typeof userId === 'string') {
      // Only delete if the disconnected socket is the active one (prevent race on rapid reconnect)
      if (this.studentSockets.get(userId) === client.id) {
        this.studentSockets.delete(userId);
      }

      if (typeof examId === 'string') {
        this.server.to(`exam:${examId}`).emit(SocketEvent.STUDENT_DISCONNECTED, {
          studentId: userId,
          examId,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // ── Student Events ────────────────────────────────────────

  @SubscribeMessage(SocketEvent.ANSWER_SAVED)
  handleAnswerSaved(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; questionId: string; examId: string },
  ): void {
    if (data.examId) {
      this.server.to(`exam:${data.examId}`).emit(SocketEvent.PROGRESS_UPDATED, {
        sessionId: data.sessionId,
        questionId: data.questionId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage(SocketEvent.EXAM_SUBMITTED)
  handleExamSubmitted(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; examId: string; studentId: string; studentName?: string },
  ): void {
    if (data.examId) {
      this.server.to(`exam:${data.examId}`).emit(SocketEvent.EXAM_SUBMITTED, {
        sessionId: data.sessionId,
        studentId: data.studentId,
        studentName: data.studentName || '',
        timestamp: new Date().toISOString(),
      });
    }
    this.logger.log(`Exam submitted: session=${data.sessionId}, student=${data.studentId}`);
  }

  @SubscribeMessage(SocketEvent.STUDENT_CONNECTED)
  handleStudentConnected(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { studentId: string; examId: string; studentName?: string; deviceId?: string },
  ): void {
    const { examId, studentId, studentName, deviceId } = data;
    if (studentId) {
      this.studentSockets.set(studentId, client.id);
    }
    if (examId) {
      this.server.to(`exam:${examId}`).emit(SocketEvent.STUDENT_CONNECTED, {
        studentId,
        studentName: studentName || '',
        examId,
        deviceId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage(SocketEvent.WARNING_TRIGGERED)
  async handleWarningTriggered(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; examId: string; studentId: string; studentName?: string; warningCount: number; event: string; timestamp: string },
  ): Promise<void> {
    if (data.examId) {
      this.server.to(`exam:${data.examId}`).emit(SocketEvent.WARNING_TRIGGERED, {
        sessionId: data.sessionId,
        studentId: data.studentId || client.handshake.query.userId,
        studentName: data.studentName || '',
        examId: data.examId,
        count: data.warningCount,
        event: data.event,
        timestamp: data.timestamp,
      });
    }
    // Persist warning and increment counter
    try {
      await this.monitoringService.logEvent(
        data.sessionId,
        `WARNING_TRIGGERED:${data.event}`,
        `Peringatan #${data.warningCount}: ${data.studentName || data.studentId || client.handshake.query.userId} - ${data.event}`,
      );
      await this.monitoringService.incrementWarning(data.sessionId);
    } catch (e) {
      this.logger.error('Failed to persist warning', e as any);
    }
  }

  // ── Teacher/Monitoring Methods ────────────────────────────

  sendWarningToStudent(studentId: string, examId: string, data: {
    warningCount: number;
    event: string;
    description?: string;
  }): void {
    const socketId = this.studentSockets.get(studentId);
    if (socketId) {
      this.server.to(socketId).emit(SocketEvent.WARNING_TRIGGERED, data);
    }

    this.server.to(`exam:${examId}`).emit(SocketEvent.WARNING_TRIGGERED, {
      studentId,
      examId,
      ...data,
    });
  }

  notifySessionFinished(examId: string, data: {
    sessionId: string;
    studentId: string;
    studentName: string;
    status: string;
  }): void {
    this.server.to(`exam:${examId}`).emit(SocketEvent.EXAM_SUBMITTED, {
      sessionId: data.sessionId,
      studentId: data.studentId,
      studentName: data.studentName,
      status: data.status,
      timestamp: new Date().toISOString(),
    });
  }

  notifyAnswerSaved(examId: string, sessionId: string, questionId: string): void {
    this.server.to(`exam:${examId}`).emit(SocketEvent.PROGRESS_UPDATED, {
      sessionId,
      questionId,
      timestamp: new Date().toISOString(),
    });
  }

  isStudentConnected(studentId: string): boolean {
    return this.studentSockets.has(studentId);
  }

  getConnectedCount(examId: string): number {
    const room = this.server.sockets.adapter.rooms.get(`exam:${examId}`);
    return room ? room.size : 0;
  }
}
