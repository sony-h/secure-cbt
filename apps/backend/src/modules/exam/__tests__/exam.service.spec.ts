import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ExamService } from '../exam.service';
import { ExamStatus } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() { return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001'; }

function createMockPrisma() {
  const mock: Record<string, any> = {
    exam: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    examClass: { createMany: vi.fn(), deleteMany: vi.fn() },
    examPackage: { create: vi.fn(), deleteMany: vi.fn() },
    examQuestion: { createMany: vi.fn(), deleteMany: vi.fn() },
    examToken: { deleteMany: vi.fn(), create: vi.fn() },
    examSession: { findMany: vi.fn() },
    teacher: { findUnique: vi.fn() },
    student: { findUnique: vi.fn() },
    $transaction: vi.fn((fn: any) => fn(mock)),
  };
  return mock;
}

function createMockEventEmitter() {
  return { emit: vi.fn() };
}

describe('ExamService', () => {
  let service: ExamService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockEventEmitter: ReturnType<typeof createMockEventEmitter>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockEventEmitter = createMockEventEmitter();
    service = new ExamService(mockPrisma as any, mockEventEmitter as any);
  });

  describe('findAll()', () => {
    it('should return paginated exams with computed status', async () => {
      const futureStart = new Date(Date.now() + 86400000);
      const futureEnd = new Date(Date.now() + 172800000);
      mockPrisma.exam.findMany.mockResolvedValue([
        { id: UUID(), title: 'Test Exam', status: ExamStatus.PUBLISHED, start_at: futureStart, end_at: futureEnd, subject: { name: 'Math' }, _count: { exam_questions: 5, exam_sessions: 10 } },
      ]);
      mockPrisma.exam.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, per_page: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0]?.status).toBe(ExamStatus.PUBLISHED);
    });

    it('should filter by status', async () => {
      mockPrisma.exam.findMany.mockResolvedValue([]);
      mockPrisma.exam.count.mockResolvedValue(0);
      await service.findAll({ status: ExamStatus.ONGOING });
      expect(mockPrisma.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: ExamStatus.ONGOING }) }),
      );
    });
  });

  describe('findById()', () => {
    it('should throw NotFoundException for missing exam', async () => {
      mockPrisma.exam.findFirst.mockResolvedValue(null);
      await expect(service.findById(UUID())).rejects.toThrow(NotFoundException);
    });
  });

  function makeCreateInput(overrides: Partial<{
    title: string; subject_id: string; duration_minutes: number;
    start_at: string; end_at: string; class_ids: string[]; question_ids: string[];
  }> = {}) {
    return {
      title: 'Test Exam', subject_id: UUID(), duration_minutes: 60,
      start_at: new Date(Date.now() + 3600000).toISOString(),
      end_at: new Date(Date.now() + 7200000).toISOString(),
      class_ids: [UUID()], question_ids: [UUID()],
      randomize_questions: true, randomize_answers: true,
      warning_limit: 3, auto_submit_enabled: true,
      fullscreen_required: true, package_count: 1,
      ...overrides,
    };
  }

  describe('create()', () => {
    it('should throw BadRequestException when end_at <= start_at', async () => {
      await expect(service.create(makeCreateInput({
        start_at: new Date(Date.now() + 3600000).toISOString(),
        end_at: new Date(Date.now() - 3600000).toISOString(),
      }), UUID())).rejects.toThrow(BadRequestException);
    });

    it('should create exam without teacher_id for admin users', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = { ...mockPrisma };
        tx.exam = { create: vi.fn().mockResolvedValue({ id: UUID(), title: 'Admin Exam' }) };
        tx.examClass = { createMany: vi.fn() };
        tx.examPackage = { create: vi.fn().mockResolvedValue({ id: UUID() }) };
        tx.examQuestion = { createMany: vi.fn() };
        tx.exam.findUnique = vi.fn().mockResolvedValue({ id: UUID() });
        return fn(tx);
      });

      const result = await service.create(makeCreateInput({
        title: 'Admin Exam',
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 7200000).toISOString(),
      }), UUID());
      expect(result).toBeDefined();
    });
  });

  describe('getExamsForStudent()', () => {
    it('should return available exams excluding completed', async () => {
      const studentId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId, class_id: UUID() });
      mockPrisma.examSession.findMany.mockResolvedValue([]);
      mockPrisma.exam.findMany.mockResolvedValue([
        { id: UUID(), title: 'Available Exam', status: ExamStatus.PUBLISHED, start_at: new Date(), end_at: new Date(Date.now() + 3600000), subject: { name: 'Math' }, _count: { exam_questions: 10 } },
      ]);

      const result = await service.getExamsForStudent('user-1');
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Available Exam');
    });
  });

  describe('generateToken()', () => {
    it('should create a token for published exams', async () => {
      const examId = UUID();
      mockPrisma.exam.findFirst.mockResolvedValue({
        id: examId, title: 'Test', status: ExamStatus.PUBLISHED,
        start_at: new Date(), end_at: new Date(Date.now() + 3600000),
        exam_token: null, subject: { name: 'Math' },
        exam_questions: [], exam_classes: [], exam_packages: [],
      });
      mockPrisma.examToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.examToken.create.mockResolvedValue({ token: 'ABCD1234', exam_id: examId });

      const result = await service.generateToken(examId);
      expect(result.token).toBe('ABCD1234');
      expect(mockPrisma.examToken.deleteMany).toHaveBeenCalledWith({ where: { exam_id: examId } });
    });
  });
});
