import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getExamReport(examId: string, classId?: string, sortBy?: string, sortOrder?: 'asc' | 'desc') {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deleted_at: null },
      include: { subject: true },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    const where: any = { exam_id: examId, score: { isNot: null } };
    if (classId) where.student = { class_id: classId };

    const sessions = await this.prisma.examSession.findMany({
      where,
      include: {
        student: { include: { class: true } },
        score: true,
      },
    });

    const settings = await this.prisma.setting.findFirst();
    const passingGrade = settings?.passing_grade ?? 70;

    const students = sessions
      .filter((s) => s.score)
      .map((s) => ({
        session_id: s.id,
        student_id: s.student_id,
        student_name: s.student.full_name,
        nis: s.student.nis,
        class_name: s.student.class.name,
        score: s.score!.total_score,
        correct_count: s.score!.correct_count,
        wrong_count: s.score!.wrong_count,
        essay_score: s.score!.essay_score,
        total_questions: s.score!.total_questions,
        status: (s.score!.total_score >= passingGrade ? 'passed' : 'failed') as 'passed' | 'failed',
      }));

    const sorted = [...students];
    if (sortBy) {
      sorted.sort((a, b) => {
        const aVal = (a as any)[sortBy] ?? '';
        const bVal = (b as any)[sortBy] ?? '';
        const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
        return sortOrder === 'desc' ? -cmp : cmp;
      });
    }

    const scores = students.map((s) => s.score);
    return {
      exam_id: exam.id,
      exam_title: exam.title,
      subject_name: exam.subject.name,
      total_students: students.length,
      average_score: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      highest_score: scores.length > 0 ? Math.max(...scores) : 0,
      lowest_score: scores.length > 0 ? Math.min(...scores) : 0,
      generated_at: new Date().toISOString(),
      students: sorted,
    };
  }

  async getClassReport(classId: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { major: true },
    });
    if (!cls) throw new NotFoundException('Class not found');

    const students = await this.prisma.student.findMany({
      where: { class_id: classId, deleted_at: null },
      include: {
        exam_sessions: {
          include: { exam: { include: { subject: true } }, score: true },
        },
      },
    });

    const studentReports = students.map((s) => {
      const exams = s.exam_sessions
        .filter((se) => se.score)
        .map((se) => ({
          exam_title: se.exam.title,
          subject: se.exam.subject.name,
          score: se.score!.total_score,
        }));
      const avg = exams.length > 0 ? exams.reduce((a, b) => a + b.score, 0) / exams.length : 0;

      return {
        student_id: s.id,
        student_name: s.full_name,
        nis: s.nis,
        average_score: avg,
        exams,
      };
    });

    return {
      class_id: cls.id,
      class_name: cls.name,
      major_name: cls.major.name,
      student_count: studentReports.length,
      average_score: studentReports.length > 0 ? studentReports.reduce((a, b) => a + b.average_score, 0) / studentReports.length : 0,
      students: studentReports,
    };
  }

  async getSessionReview(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { include: { class: true } },
        score: true,
        exam: {
          include: {
            subject: true,
            exam_questions: {
              include: {
                question: {
                  include: {
                    options: { orderBy: { order: 'asc' } },
                  },
                },
              },
            },
          },
        },
        answers: true,
      },
    });

    if (!session) throw new NotFoundException('Session not found');

    const filteredQuestions = session.exam.exam_questions.filter(
      (eq) => !eq.package_id || eq.package_id === session.package_id,
    );

    let orderedQuestions: typeof filteredQuestions;
    if (session.question_order && Array.isArray(session.question_order)) {
      const orderArray = session.question_order as string[];
      orderedQuestions = orderArray
        .map((id) => filteredQuestions.find((eq) => eq.id === id))
        .filter(Boolean) as typeof filteredQuestions;
    } else {
      orderedQuestions = [...filteredQuestions].sort((a, b) => a.position - b.position);
    }

    const answerMap = new Map(session.answers.map((a) => [a.question_id, a]));

    const questions = orderedQuestions.map((eq, index) => {
      const q = eq.question;
      const ans = answerMap.get(q.id);

      return {
        id: q.id,
        number: index + 1,
        type: q.type,
        content: q.content,
        image_url: q.image_url,
        difficulty: q.difficulty,
        explanation: q.explanation,
        student_answer: ans?.answer_text ?? null,
        is_correct: ans?.is_correct ?? false,
        score: ans?.score ?? 0,
        feedback: ans?.feedback ?? null,
        options: (q.options || []).map((opt) => ({
          id: opt.id,
          content: opt.content,
          image_url: opt.image_url,
          is_correct: opt.is_correct,
          order: opt.order,
        })),
      };
    });

    return {
      session_id: session.id,
      student_id: session.student_id,
      student_name: session.student.full_name,
      nis: session.student.nis,
      class_name: session.student.class.name,
      exam_id: session.exam_id,
      exam_title: session.exam.title,
      subject_name: session.exam.subject.name,
      score: session.score?.total_score ?? null,
      correct_count: session.score?.correct_count ?? null,
      wrong_count: session.score?.wrong_count ?? null,
      submitted_at: session.submitted_at?.toISOString() ?? null,
      status: session.status,
      questions,
    };
  }
}
