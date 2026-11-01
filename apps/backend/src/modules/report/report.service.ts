import { Injectable, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionStatus, UserRole } from '@secure-cbt/shared';
import { getTeacherScope, assertTeacherMonitorAccess } from '../../common/helpers/teacher-access.helper';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getExamReport(
    examId: string,
    classId?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    userId?: string,
    userRole?: string,
  ) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deleted_at: null },
      include: { subject: true },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherMonitorAccess(
        scope,
        exam.subject_id,
        'Anda tidak memiliki izin melihat laporan ujian ini',
      );
    }

    const where: any = { exam_id: examId, score: { isNot: null } };
    if (classId) where.student = { class_id: classId };

    const sessions = await this.prisma.examSession.findMany({
      where,
      include: {
        student: { include: { class: true } },
        score: true,
      },
      orderBy: { attempt_number: 'asc' },
    });

    const settings = await this.prisma.setting.findFirst();
    const passingGrade = settings?.passing_grade ?? 70;

    // Group sessions by student_id to handle dual-attempts (Attempt 1: Main, Attempt 2: Remedial)
    const studentSessionMap = new Map<string, typeof sessions>();
    for (const s of sessions) {
      if (!s.score) continue;
      const list = studentSessionMap.get(s.student_id) ?? [];
      list.push(s);
      studentSessionMap.set(s.student_id, list);
    }

    const rawMax = exam.max_attempts === undefined ? 1 : exam.max_attempts;
    const isMultiAttempt = rawMax === null || rawMax === 0 || rawMax > 1;

    const students = Array.from(studentSessionMap.values()).map((studentSessions) => {
      const attempt1 = studentSessions.find((s) => s.attempt_number === 1) ?? studentSessions[0];
      const attempt2 = studentSessions.find((s) => s.attempt_number === 2);

      const mainScore = attempt1?.score?.total_score ?? null;
      const remedialScore = attempt2?.score?.total_score ?? null;
      const isRemedialAllowed = attempt1?.is_remedial_allowed ?? false;
      const attemptCount = studentSessions.length;

      const validScores = studentSessions
        .map((s) => s.score?.total_score)
        .filter((sc): sc is number => typeof sc === 'number');
      const bestScore = validScores.length > 0 ? Math.max(...validScores) : 0;

      const bestSession =
        studentSessions.find((s) => s.score?.total_score === bestScore) ??
        studentSessions[studentSessions.length - 1]!;

      const baseSession = (isMultiAttempt ? bestSession : (attempt1 ?? attempt2))!;
      const student = baseSession.student;

      const hasPassed = isMultiAttempt
        ? bestScore >= passingGrade
        : (mainScore !== null && mainScore >= passingGrade) ||
          (remedialScore !== null && remedialScore >= passingGrade);

      const attemptsBreakdown = studentSessions.map((s) => ({
        attempt_number: s.attempt_number,
        session_id: s.id,
        score: s.score?.total_score ?? null,
        correct_count: s.score?.correct_count ?? 0,
        wrong_count: s.score?.wrong_count ?? 0,
        submitted_at: s.submitted_at?.toISOString() ?? null,
      }));

      return {
        session_id: baseSession.id,
        attempt1_session_id: attempt1?.id ?? null,
        attempt2_session_id: attempt2?.id ?? null,
        student_id: student.id,
        student_name: student.full_name,
        nis: student.nis,
        class_name: student.class?.name || '-',
        score: isMultiAttempt ? bestScore : (mainScore ?? remedialScore ?? 0),
        best_score: bestScore,
        main_score: mainScore,
        remedial_score: remedialScore,
        is_remedial_allowed: isRemedialAllowed,
        attempt_count: attemptCount,
        attempts_count: attemptCount,
        attempts: attemptsBreakdown,
        correct_count: baseSession.score?.correct_count ?? 0,
        wrong_count: baseSession.score?.wrong_count ?? 0,
        essay_score: baseSession.score?.essay_score ?? null,
        total_questions: baseSession.score?.total_questions ?? 0,
        status: (hasPassed ? 'passed' : 'failed') as 'passed' | 'failed',
      };
    });

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
      max_attempts: exam.max_attempts,
      is_multi_attempt: isMultiAttempt,
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

  async getSessionReview(sessionId: string, userId?: string, userRole?: string) {
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

    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherMonitorAccess(
        scope,
        session.exam.subject_id,
        'Anda tidak memiliki izin meninjau sesi ujian ini',
      );
    }

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

  async getItemAnalysis(examId: string, userId?: string, userRole?: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deleted_at: null },
      include: {
        exam_questions: {
          include: {
            question: {
              include: {
                options: { orderBy: { order: 'asc' } },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherMonitorAccess(
        scope,
        exam.subject_id,
        'Anda tidak memiliki izin melihat analisis butir soal ujian ini',
      );
    }

    const sessions = await this.prisma.examSession.findMany({
      where: {
        exam_id: examId,
        status: { in: [SessionStatus.SUBMITTED, SessionStatus.AUTO_SUBMITTED] },
      },
      include: {
        answers: true,
      },
    });

    const totalSessions = sessions.length;

    const questions = exam.exam_questions.map((eq, index) => {
      const q = eq.question;
      const options = q.options || [];

      const questionAnswers = sessions
        .map((s) => s.answers.find((a) => a.question_id === q.id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a && a.answer_text !== null && a.answer_text !== ''));

      const totalAnswered = questionAnswers.length;
      const correctCount = questionAnswers.filter((a) => a.is_correct).length;
      const wrongCount = totalAnswered - correctCount;

      const difficultyIndex = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) / 100 : 0;
      const passRate = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 1000) / 10 : 0;

      const distractorDistribution = options.map((opt) => {
        const count = questionAnswers.filter((a) => {
          const raw = (a.answer_text || '').split(',').map((x) => x.trim().toLowerCase());
          return (
            raw.includes(opt.id.toLowerCase()) ||
            raw.includes(opt.content.trim().toLowerCase())
          );
        }).length;

        const percentage = totalAnswered > 0 ? Math.round((count / totalAnswered) * 1000) / 10 : 0;

        return {
          option_id: opt.id,
          order: opt.order,
          content: opt.content,
          is_correct: opt.is_correct,
          count,
          percentage,
        };
      });

      return {
        question_id: q.id,
        number: index + 1,
        content: q.content,
        type: q.type,
        difficulty: q.difficulty,
        total_answered: totalAnswered,
        correct_count: correctCount,
        wrong_count: wrongCount,
        difficulty_index: difficultyIndex,
        pass_rate: passRate,
        distractor_distribution: distractorDistribution,
      };
    });

    return {
      exam_id: exam.id,
      exam_title: exam.title,
      total_sessions: totalSessions,
      questions,
    };
  }

  async generateExcelReport(
    examId: string,
    classId?: string,
    userId?: string,
    userRole?: string,
  ): Promise<Buffer> {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deleted_at: null },
      include: { subject: true },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherMonitorAccess(
        scope,
        exam.subject_id,
        'Anda tidak memiliki izin mengunduh laporan ujian ini',
      );
    }

    const targetClass = classId
      ? await this.prisma.class.findUnique({
          where: { id: classId },
          include: { major: true },
        })
      : null;

    const where: any = { exam_id: examId, score: { isNot: null } };
    if (classId) where.student = { class_id: classId };

    const sessions = await this.prisma.examSession.findMany({
      where,
      include: {
        student: { include: { class: true } },
        score: true,
      },
      orderBy: { attempt_number: 'asc' },
    });

    const settings = await this.prisma.setting.findFirst();
    const passingGrade = settings?.passing_grade ?? 70;

    // Group sessions by student_id to handle dual-attempts (Attempt 1: Main, Attempt 2: Remedial)
    const studentSessionMap = new Map<string, typeof sessions>();
    for (const s of sessions) {
      if (!s.score) continue;
      const list = studentSessionMap.get(s.student_id) ?? [];
      list.push(s);
      studentSessionMap.set(s.student_id, list);
    }

    const rawMax = exam.max_attempts === undefined ? 1 : exam.max_attempts;
    const isMultiAttempt = rawMax === null || rawMax === 0 || rawMax > 1;

    const students = Array.from(studentSessionMap.values())
      .map((studentSessions) => {
        const attempt1 = studentSessions.find((s) => s.attempt_number === 1) ?? studentSessions[0];
        const attempt2 = studentSessions.find((s) => s.attempt_number === 2);

        const mainScore = attempt1?.score?.total_score ?? null;
        const remedialScore = attempt2?.score?.total_score ?? null;
        const isRemedialAllowed = attempt1?.is_remedial_allowed ?? false;

        const validScores = studentSessions
          .map((s) => s.score?.total_score)
          .filter((sc): sc is number => typeof sc === 'number');
        const bestScore = validScores.length > 0 ? Math.max(...validScores) : 0;

        const bestSession =
          studentSessions.find((s) => s.score?.total_score === bestScore) ??
          studentSessions[studentSessions.length - 1]!;

        const baseSession = (isMultiAttempt ? bestSession : (attempt1 ?? attempt2))!;
        const student = baseSession.student;

        let statusLabel: 'LULUS' | 'REMEDIAL' | 'TUNTAS (REMEDIAL)' | 'BELUM TUNTAS' = 'REMEDIAL';
        if (isMultiAttempt) {
          statusLabel = bestScore >= passingGrade ? 'LULUS' : 'BELUM TUNTAS';
        } else {
          if (mainScore !== null && mainScore >= passingGrade) {
            statusLabel = 'LULUS';
          } else if (remedialScore !== null && remedialScore >= passingGrade) {
            statusLabel = 'TUNTAS (REMEDIAL)';
          }
        }

        return {
          session_id: baseSession.id,
          student_id: student.id,
          student_name: student.full_name,
          nis: student.nis,
          class_name: student.class?.name || '-',
          main_score: mainScore,
          remedial_score: remedialScore,
          best_score: bestScore,
          attempts_count: studentSessions.length,
          is_remedial_allowed: isRemedialAllowed,
          correct_count: baseSession.score?.correct_count ?? 0,
          wrong_count: baseSession.score?.wrong_count ?? 0,
          essay_score: baseSession.score?.essay_score ?? null,
          total_questions: baseSession.score?.total_questions ?? 0,
          status: statusLabel,
        };
      })
      .sort((a, b) => a.student_name.localeCompare(b.student_name));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Assessia by Orivastra';
    workbook.lastModifiedBy = 'Assessia';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Laporan Nilai', {
      views: [{ showGridLines: true }],
      pageSetup: { orientation: 'landscape', paperSize: 9 },
    });

    sheet.columns = [
      { key: 'no', width: 6 },
      { key: 'nis', width: 16 },
      { key: 'nama', width: 34 },
      { key: 'kelas', width: 16 },
      { key: 'benar', width: 12 },
      { key: 'salah', width: 12 },
      { key: 'esai', width: 12 },
      { key: isMultiAttempt ? 'percobaan' : 'nilai_utama', width: 16 },
      { key: isMultiAttempt ? 'nilai_terbaik' : 'nilai_remedial', width: 16 },
      { key: 'status', width: 22 },
    ];

    // School Header Band (#1E3A8A)
    sheet.mergeCells('A2:J2');
    const titleCell = sheet.getCell('A2');
    titleCell.value = 'LAPORAN HASIL EVALUASI NILAI UJIAN SISWA';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 30;

    sheet.mergeCells('A3:J3');
    const subtitleCell = sheet.getCell('A3');
    subtitleCell.value = 'ASSESSIA CBT ACADEMIC ASSESSMENT SYSTEM';
    subtitleCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'DBEAFE' } };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(3).height = 20;

    // Metadata Section
    const exportDateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const classNameStr = targetClass ? targetClass.name : 'Semua Kelas';

    sheet.getCell('B5').value = 'Mata Pelajaran';
    sheet.getCell('B5').font = { name: 'Arial', size: 10, bold: true, color: { argb: '475569' } };
    sheet.getCell('C5').value = `: ${exam.subject?.name || '-'}`;
    sheet.getCell('C5').font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };

    sheet.getCell('G5').value = 'KKM / Nilai Minimal';
    sheet.getCell('G5').font = { name: 'Arial', size: 10, bold: true, color: { argb: '475569' } };
    sheet.getCell('H5').value = `: ${passingGrade}`;
    sheet.getCell('H5').font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };

    sheet.getCell('B6').value = 'Judul Ujian';
    sheet.getCell('B6').font = { name: 'Arial', size: 10, bold: true, color: { argb: '475569' } };
    sheet.getCell('C6').value = `: ${exam.title}`;
    sheet.getCell('C6').font = { name: 'Arial', size: 10, color: { argb: '0F172A' } };

    sheet.getCell('G6').value = 'Tanggal Ekspor';
    sheet.getCell('G6').font = { name: 'Arial', size: 10, bold: true, color: { argb: '475569' } };
    sheet.getCell('H6').value = `: ${exportDateStr}`;
    sheet.getCell('H6').font = { name: 'Arial', size: 10, color: { argb: '0F172A' } };

    sheet.getCell('B7').value = 'Kelas';
    sheet.getCell('B7').font = { name: 'Arial', size: 10, bold: true, color: { argb: '475569' } };
    sheet.getCell('C7').value = `: ${classNameStr}`;
    sheet.getCell('C7').font = { name: 'Arial', size: 10, color: { argb: '0F172A' } };

    sheet.getCell('G7').value = 'Total Siswa';
    sheet.getCell('G7').font = { name: 'Arial', size: 10, bold: true, color: { argb: '475569' } };
    sheet.getCell('H7').value = `: ${students.length} Peserta`;
    sheet.getCell('H7').font = { name: 'Arial', size: 10, color: { argb: '0F172A' } };

    // Table Headers
    const tableHeaderRow = sheet.getRow(9);
    tableHeaderRow.height = 26;
    const headers = isMultiAttempt
      ? [
          'NO',
          'NIS',
          'NAMA SISWA',
          'KELAS',
          'BENAR',
          'SALAH',
          'ESAI',
          'PERCOBAAN',
          'NILAI TERBAIK',
          'STATUS',
        ]
      : [
          'NO',
          'NIS',
          'NAMA SISWA',
          'KELAS',
          'BENAR',
          'SALAH',
          'ESAI',
          'NILAI UTAMA',
          'NILAI REMEDIAL',
          'STATUS',
        ];
    tableHeaderRow.values = headers;
    tableHeaderRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: '0F172A' } },
        bottom: { style: 'medium', color: { argb: '0F172A' } },
        left: { style: 'thin', color: { argb: '334155' } },
        right: { style: 'thin', color: { argb: '334155' } },
      };
    });

    // Table Data
    const startRow = 10;
    const borderThin = {
      top: { style: 'thin' as const, color: { argb: 'CBD5E1' } },
      bottom: { style: 'thin' as const, color: { argb: 'CBD5E1' } },
      left: { style: 'thin' as const, color: { argb: 'CBD5E1' } },
      right: { style: 'thin' as const, color: { argb: 'CBD5E1' } },
    };

    if (students.length === 0) {
      sheet.mergeCells(`A${startRow}:J${startRow}`);
      const emptyCell = sheet.getCell(`A${startRow}`);
      emptyCell.value = 'Belum ada data nilai siswa untuk ujian ini.';
      emptyCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '64748B' } };
      emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(startRow).height = 30;
      for (let c = 1; c <= 10; c++) {
        sheet.getRow(startRow).getCell(c).border = borderThin;
      }
    } else {
      students.forEach((s, idx) => {
        const rowNum = startRow + idx;
        const row = sheet.getRow(rowNum);
        row.height = 22;

        const isEven = idx % 2 === 1;
        const bgArgb = isEven ? 'F8FAFC' : 'FFFFFF';

        const mainScoreVal = s.main_score !== null ? Number(s.main_score.toFixed(1)) : '-';
        const remedialScoreVal = s.remedial_score !== null ? Number(s.remedial_score.toFixed(1)) : '-';
        const bestScoreVal = Number(s.best_score.toFixed(1));

        row.values = isMultiAttempt
          ? [
              idx + 1,
              s.nis || '-',
              s.student_name,
              s.class_name,
              s.correct_count,
              s.wrong_count,
              s.essay_score !== null ? Number(s.essay_score.toFixed(1)) : '-',
              `${s.attempts_count}x`,
              bestScoreVal,
              s.status,
            ]
          : [
              idx + 1,
              s.nis || '-',
              s.student_name,
              s.class_name,
              s.correct_count,
              s.wrong_count,
              s.essay_score !== null ? Number(s.essay_score.toFixed(1)) : '-',
              mainScoreVal,
              remedialScoreVal,
              s.status,
            ];

        for (let c = 1; c <= 10; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Arial', size: 10, color: { argb: '1E293B' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
          cell.border = borderThin;

          if (c === 1 || c === 2 || c === 4) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else if (c === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if (c === 5) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '15803D' } };
          } else if (c === 6) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { name: 'Arial', size: 10, color: { argb: 'DC2626' } };
          } else if (c === 7) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else if (c === 8) {
            if (isMultiAttempt) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              cell.font = { name: 'Arial', size: 10, color: { argb: '475569' } };
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'right' };
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
              if (typeof mainScoreVal === 'number') cell.numFmt = '0.0';
            }
          } else if (c === 9) {
            if (isMultiAttempt) {
              cell.alignment = { vertical: 'middle', horizontal: 'right' };
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E3A8A' } };
              cell.numFmt = '0.0';
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'right' };
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '4338CA' } };
              if (typeof remedialScoreVal === 'number') cell.numFmt = '0.0';
            }
          } else if (c === 10) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            const isPassed = s.status === 'LULUS' || s.status === 'TUNTAS (REMEDIAL)';
            cell.font = {
              name: 'Arial',
              size: 10,
              bold: true,
              color: { argb: isPassed ? '15803D' : 'DC2626' },
            };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: isPassed ? 'DCFCE7' : 'FEE2E2' },
            };
          }
        }
      });
    }

    // Statistical Summary Section
    const endDataRow = students.length > 0 ? startRow + students.length - 1 : startRow;
    const statStartRow = endDataRow + 2;

    if (students.length > 0) {
      const scoreCol = isMultiAttempt ? 'I' : 'H';
      const stats = [
        {
          label: 'RATA-RATA NILAI' + (isMultiAttempt ? ' (NILAI TERBAIK)' : ''),
          formula: `AVERAGE(${scoreCol}${startRow}:${scoreCol}${endDataRow})`,
          numFmt: '0.00',
        },
        {
          label: 'NILAI TERTINGGI',
          formula: `MAX(${scoreCol}${startRow}:${scoreCol}${endDataRow})`,
          numFmt: '0.00',
        },
        {
          label: 'NILAI TERENDAH',
          formula: `MIN(${scoreCol}${startRow}:${scoreCol}${endDataRow})`,
          numFmt: '0.00',
        },
        {
          label: 'JUMLAH SISWA LULUS (Nilai >= KKM)',
          formula: `COUNTIF(${scoreCol}${startRow}:${scoreCol}${endDataRow}, ">=${passingGrade}")`,
          numFmt: '0',
        },
        {
          label: isMultiAttempt ? 'JUMLAH SISWA BELUM TUNTAS (Nilai < KKM)' : 'JUMLAH SISWA REMEDIAL (Nilai < KKM)',
          formula: `COUNTIF(${scoreCol}${startRow}:${scoreCol}${endDataRow}, "<${passingGrade}")`,
          numFmt: '0',
        },
      ];

      stats.forEach((st, idx) => {
        const rNum = statStartRow + idx;
        const row = sheet.getRow(rNum);
        row.height = 22;

        sheet.mergeCells(`B${rNum}:G${rNum}`);
        const labelCell = sheet.getCell(`B${rNum}`);
        labelCell.value = st.label;
        labelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '334155' } };
        labelCell.alignment = { vertical: 'middle', horizontal: 'right' };
        labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };

        for (let col = 2; col <= 7; col++) {
          row.getCell(col).border = borderThin;
        }

        const valCell = sheet.getCell(`H${rNum}`);
        valCell.value = { formula: st.formula };
        valCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
        valCell.alignment = { vertical: 'middle', horizontal: 'right' };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        valCell.numFmt = st.numFmt;
        valCell.border = borderThin;

        const unitCell = sheet.getCell(`I${rNum}`);
        unitCell.value = idx >= 3 ? 'Siswa' : 'Poin';
        unitCell.font = { name: 'Arial', size: 9, color: { argb: '64748B' } };
        unitCell.alignment = { vertical: 'middle', horizontal: 'center' };
        unitCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        unitCell.border = borderThin;

        sheet.getCell(`J${rNum}`).border = borderThin;
      });
    }

    // Signature Footer for Teacher and Principal
    const signatureStartRow = (students.length > 0 ? statStartRow + 5 : startRow + 2) + 2;

    sheet.getCell(`B${signatureStartRow}`).value = 'Mengetahui,';
    sheet.getCell(`B${signatureStartRow}`).font = { name: 'Arial', size: 10, color: { argb: '475569' } };

    sheet.getCell(`B${signatureStartRow + 1}`).value = 'Kepala Sekolah';
    sheet.getCell(`B${signatureStartRow + 1}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };

    sheet.getCell(`B${signatureStartRow + 5}`).value = '( .................................................... )';
    sheet.getCell(`B${signatureStartRow + 5}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };

    sheet.getCell(`B${signatureStartRow + 6}`).value = 'NIP. ...............................................';
    sheet.getCell(`B${signatureStartRow + 6}`).font = { name: 'Arial', size: 9, color: { argb: '64748B' } };

    sheet.getCell(`G${signatureStartRow - 1}`).value = `${exportDateStr}`;
    sheet.getCell(`G${signatureStartRow - 1}`).font = { name: 'Arial', size: 10, color: { argb: '475569' } };

    sheet.getCell(`G${signatureStartRow}`).value = 'Guru Pengampu Mata Pelajaran,';
    sheet.getCell(`G${signatureStartRow}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };

    sheet.getCell(`G${signatureStartRow + 5}`).value = '( .................................................... )';
    sheet.getCell(`G${signatureStartRow + 5}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };

    sheet.getCell(`G${signatureStartRow + 6}`).value = 'NIP. ...............................................';
    sheet.getCell(`G${signatureStartRow + 6}`).font = { name: 'Arial', size: 9, color: { argb: '64748B' } };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
