import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MonitoringGateway } from '../monitoring.gateway';
import { SocketEvent } from '@secure-cbt/shared';

describe('MonitoringGateway', () => {
  let gateway: MonitoringGateway;
  let mockMonitoringService: any;
  let mockServer: any;

  beforeEach(() => {
    mockMonitoringService = {
      logEvent: vi.fn(),
      incrementWarning: vi.fn(),
    };

    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      sockets: {
        adapter: {
          rooms: new Map(),
        },
      },
    };

    gateway = new MonitoringGateway(mockMonitoringService);
    gateway.server = mockServer;
  });

  describe('handleConnection', () => {
    it('should register student and join student room and general exam room', () => {
      const mockClient: any = {
        id: 'socket-student-1',
        handshake: {
          query: {
            role: 'student',
            userId: 'student-user-1',
            examId: 'exam-1',
          },
        },
        join: vi.fn(),
        emit: vi.fn(),
      };

      gateway.handleConnection(mockClient);

      expect(gateway.isStudentConnected('student-user-1')).toBe(true);
      expect(mockClient.join).toHaveBeenCalledWith('exam:exam-1');
      expect(mockClient.join).toHaveBeenCalledWith('student:student-user-1');
    });

    it('should join proctor room when teacher connects with query', () => {
      const mockClient: any = {
        id: 'socket-teacher-1',
        handshake: {
          query: {
            role: 'teacher',
            userId: 'teacher-user-1',
            examId: 'exam-1',
          },
        },
        join: vi.fn(),
        emit: vi.fn(),
      };

      gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('exam:exam-1');
      expect(mockClient.join).toHaveBeenCalledWith('exam:exam-1:proctors');
      expect(mockClient.emit).toHaveBeenCalledWith(
        'connected.students',
        expect.objectContaining({ examId: 'exam-1' }),
      );
    });
  });

  describe('handleTeacherConnected', () => {
    it('should join proctor room and exam room upon receiving teacher.connected message', () => {
      const mockClient: any = {
        id: 'socket-teacher-1',
        join: vi.fn(),
        emit: vi.fn(),
      };

      gateway.handleTeacherConnected(mockClient, { examId: 'exam-1' });

      expect(mockClient.join).toHaveBeenCalledWith('exam:exam-1');
      expect(mockClient.join).toHaveBeenCalledWith('exam:exam-1:proctors');
      expect(mockClient.emit).toHaveBeenCalledWith(
        'connected.students',
        expect.objectContaining({ examId: 'exam-1' }),
      );
    });
  });

  describe('notifyStudentAction', () => {
    it('should emit to student socket/room and to proctor room ONLY (not general exam room)', () => {
      const mockStudentClient: any = {
        id: 'socket-student-123',
        handshake: {
          query: {
            role: 'student',
            userId: 'student-user-1',
            examId: 'exam-1',
          },
        },
        join: vi.fn(),
      };
      gateway.handleConnection(mockStudentClient);

      gateway.notifyStudentAction('student-user-1', 'exam-1', SocketEvent.SESSION_FORCE_SUBMIT, {
        sessionId: 'session-123',
        message: 'Ujian dikumpulkan oleh pengawas',
      });

      // Targeted student gets the event
      expect(mockServer.to).toHaveBeenCalledWith('socket-student-123');
      expect(mockServer.to).toHaveBeenCalledWith('student:student-user-1');

      // Proctors room gets the event
      expect(mockServer.to).toHaveBeenCalledWith('exam:exam-1:proctors');

      // Must NOT broadcast to all students via general exam room!
      expect(mockServer.to).not.toHaveBeenCalledWith('exam:exam-1');
    });
  });

  describe('broadcastToExam', () => {
    it('should broadcast to general exam room when studentUserId is not provided', () => {
      gateway.broadcastToExam('exam-1', {
        id: 'msg-1',
        message: 'Pengumuman umum',
        urgency: 'low',
        timestamp: '2026-10-16T10:00:00Z',
      });

      expect(mockServer.to).toHaveBeenCalledWith('exam:exam-1');
      expect(mockServer.emit).toHaveBeenCalledWith('exam.broadcast', expect.objectContaining({
        message: 'Pengumuman umum',
      }));
    });

    it('should broadcast ONLY to targeted student and proctor room when studentUserId is provided', () => {
      const mockStudentClient: any = {
        id: 'socket-student-456',
        handshake: {
          query: {
            role: 'student',
            userId: 'student-user-456',
            examId: 'exam-1',
          },
        },
        join: vi.fn(),
      };
      gateway.handleConnection(mockStudentClient);

      gateway.broadcastToExam('exam-1', {
        id: 'msg-2',
        message: 'Pesan khusus untuk Anda',
        urgency: 'high',
        studentUserId: 'student-user-456',
        timestamp: '2026-10-16T10:00:00Z',
      });

      // Targeted student socket and room
      expect(mockServer.to).toHaveBeenCalledWith('socket-student-456');
      expect(mockServer.to).toHaveBeenCalledWith('student:student-user-456');

      // Proctor room
      expect(mockServer.to).toHaveBeenCalledWith('exam:exam-1:proctors');

      // MUST NOT broadcast to all students!
      expect(mockServer.to).not.toHaveBeenCalledWith('exam:exam-1');
    });
  });
});
