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
import { Logger, UseGuards } from '@nestjs/common';
import { SocketEvent } from '@secure-cbt/shared';

/**
 * Real-time monitoring gateway for exam sessions.
 * Used by:
 * - Student app: reports connectivity, answers, warnings
 * - Teacher dashboard: monitors student activity in real-time
 */
@WebSocketGateway({
  namespace: '/monitoring',
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class MonitoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MonitoringGateway.name);

  // Track connected clients
  private readonly studentSockets = new Map<string, string>(); // studentId → socketId
  private readonly teacherSockets = new Map<string, string>(); // teacherId → socketId

  handleConnection(client: Socket): void {
    const { role, userId, examId } = client.handshake.query;
    this.logger.log(`Client connected: ${client.id} (role: ${role}, userId: ${userId})`);

    if (role === 'student' && typeof userId === 'string') {
      this.studentSockets.set(userId, client.id);

      // Join exam room for broadcasting
      if (typeof examId === 'string') {
        client.join(`exam:${examId}`);
      }
    }

    if (role === 'teacher' && typeof userId === 'string') {
      this.teacherSockets.set(userId, client.id);

      // Join exam room
      if (typeof examId === 'string') {
        client.join(`exam:${examId}`);
      }
    }
  }

  handleDisconnect(client: Socket): void {
    const { role, userId, examId } = client.handshake.query;
    this.logger.log(`Client disconnected: ${client.id} (role: ${role}, userId: ${userId})`);

    if (role === 'student' && typeof userId === 'string') {
      this.studentSockets.delete(userId);

      // Notify teachers that student disconnected
      if (typeof examId === 'string') {
        this.server.to(`exam:${examId}`).emit(SocketEvent.STUDENT_DISCONNECTED, {
          studentId: userId,
          examId,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (role === 'teacher' && typeof userId === 'string') {
      this.teacherSockets.delete(userId);
    }
  }

  // ── Student Events ────────────────────────────────────────

  @SubscribeMessage(SocketEvent.ANSWER_SAVED)
  handleAnswerSaved(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; questionId: string; examId: string },
  ): void {
    // Broadcast progress update to teachers monitoring this exam
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
    @MessageBody() data: { sessionId: string; examId: string; studentId: string },
  ): void {
    if (data.examId) {
      this.server.to(`exam:${data.examId}`).emit(SocketEvent.EXAM_SUBMITTED, {
        sessionId: data.sessionId,
        studentId: data.studentId,
        timestamp: new Date().toISOString(),
      });
    }
    this.logger.log(`Exam submitted: session=${data.sessionId}, student=${data.studentId}`);
  }

  @SubscribeMessage(SocketEvent.STUDENT_CONNECTED)
  handleStudentConnected(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { studentId: string; examId: string; deviceId?: string },
  ): void {
    if (data.examId) {
      this.server.to(`exam:${data.examId}`).emit(SocketEvent.STUDENT_CONNECTED, {
        studentId: data.studentId,
        examId: data.examId,
        deviceId: data.deviceId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ── Teacher/Monitoring Methods ────────────────────────────

  /**
   * Send a warning to a specific student session.
   * Called from MonitoringService when a violation is detected.
   */
  sendWarningToStudent(studentId: string, examId: string, data: {
    warningCount: number;
    event: string;
    description?: string;
  }): void {
    // Notify the student
    const socketId = this.studentSockets.get(studentId);
    if (socketId) {
      this.server.to(socketId).emit(SocketEvent.WARNING_TRIGGERED, data);
    }

    // Notify teachers
    this.server.to(`exam:${examId}`).emit(SocketEvent.WARNING_TRIGGERED, {
      studentId,
      examId,
      ...data,
    });
  }

  /**
   * Notify teachers about a session finishing.
   */
  notifySessionFinished(examId: string, data: {
    sessionId: string;
    studentId: string;
    status: string;
  }): void {
    this.server.to(`exam:${examId}`).emit(SocketEvent.SESSION_FINISHED, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if a student is currently connected via socket.
   */
  isStudentConnected(studentId: string): boolean {
    return this.studentSockets.has(studentId);
  }

  /**
   * Get the count of connected students for an exam.
   */
  getConnectedCount(examId: string): number {
    const room = this.server.sockets.adapter.rooms.get(`exam:${examId}`);
    return room ? room.size : 0;
  }
}
