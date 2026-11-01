import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExamService } from '../exam.service';
import { ExamStatus, SessionStatus } from '@secure-cbt/shared';

function UUID() {
  return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001';
}

function createMockPrisma() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: Record<string, any> = {
    student: { findUnique: vi.fn() },
    examSession: { findMany: vi.fn(), findFirst: vi.fn() },
    exam: { findMany: vi.fn(), findUnique: vi.fn() },
  };
  return mock;
}

describe('ExamService - Student Multi-Attempt Discovery', () => {
  let service: ExamService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new ExamService(mockPrisma as any, null as any);
  });

  it('returns exam with attempt metadata and does not bar retryable exams', async () => {
    const studentId = UUID();
    const userId = UUID();
    const examId = UUID();
    const classId = UUID();

    mockPrisma.student.findUnique.mockResolvedValue({ id: studentId, class_id: classId, user_id: userId });
    mockPrisma.examSession.findMany.mockResolvedValue([
      {
        exam_id: examId,
        attempt_number: 1,
        extra_attempts_allowed: 0,
        status: SessionStatus.SUBMITTED,
        is_remedial_allowed: false,
        score: { total_score: 80 },
      },
    ]);
    mockPrisma.exam.findMany.mockResolvedValue([
      {
        id: examId,
        title: 'UTS Fisika',
        max_attempts: 3,
        status: ExamStatus.PUBLISHED,
        start_at: new Date(Date.now() - 10000),
        end_at: new Date(Date.now() + 3600000),
        exam_classes: [{ class_id: classId }],
        subject: { name: 'Fisika' },
        _count: { exam_questions: 10 },
      },
    ]);

    const result = await service.getExamsForStudent(userId);
    expect(result).toHaveLength(1);
    const exam = result[0] as any;
    expect(exam.completed_attempts).toBe(1);
    expect(exam.effective_max_attempts).toBe(3);
    expect(exam.has_attempts_remaining).toBe(true);
    expect(exam.best_score).toBe(80);
    expect(exam.is_exhausted).toBe(false);
  });

  it('marks exam as exhausted when completed attempts reach max_attempts', async () => {
    const studentId = UUID();
    const userId = UUID();
    const examId = UUID();
    const classId = UUID();

    mockPrisma.student.findUnique.mockResolvedValue({ id: studentId, class_id: classId, user_id: userId });
    mockPrisma.examSession.findMany.mockResolvedValue([
      {
        exam_id: examId,
        attempt_number: 1,
        extra_attempts_allowed: 0,
        status: SessionStatus.SUBMITTED,
        score: { total_score: 70 },
      },
      {
        exam_id: examId,
        attempt_number: 2,
        extra_attempts_allowed: 0,
        status: SessionStatus.SUBMITTED,
        score: { total_score: 85 },
      },
    ]);
    mockPrisma.exam.findMany.mockResolvedValue([
      {
        id: examId,
        title: 'UTS Fisika',
        max_attempts: 2,
        status: ExamStatus.PUBLISHED,
        start_at: new Date(Date.now() - 10000),
        end_at: new Date(Date.now() + 3600000),
        exam_classes: [{ class_id: classId }],
        subject: { name: 'Fisika' },
        _count: { exam_questions: 10 },
      },
    ]);

    const result = await service.getExamsForStudent(userId);
    expect(result).toHaveLength(1);
    const exam = result[0] as any;
    expect(exam.completed_attempts).toBe(2);
    expect(exam.effective_max_attempts).toBe(2);
    expect(exam.has_attempts_remaining).toBe(false);
    expect(exam.best_score).toBe(85);
    expect(exam.is_exhausted).toBe(true);
  });
});
