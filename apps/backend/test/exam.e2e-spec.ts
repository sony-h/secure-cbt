import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole, ExamStatus } from '@secure-cbt/shared';
import { GlobalExceptionFilter } from './../src/common/filters/global-exception.filter';
import { ResponseInterceptor } from './../src/common/interceptors/response.interceptor';
import * as argon2 from 'argon2';

describe('Exam Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let teacherId: string;
  let subjectId: string;
  let classId: string;
  let questionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    
    // Set up pipes, filters, interceptors to mimic main.ts environment
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup initial data
    await prisma.refreshToken.deleteMany({});
    await prisma.score.deleteMany({});
    await prisma.answer.deleteMany({});
    await prisma.sessionLog.deleteMany({});
    await prisma.examSession.deleteMany({});
    await prisma.examClass.deleteMany({});
    await prisma.examQuestion.deleteMany({});
    await prisma.examPackage.deleteMany({});
    await prisma.examToken.deleteMany({});
    await prisma.exam.deleteMany({});
    await prisma.questionOption.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.questionBank.deleteMany({});
    await prisma.teacherSubject.deleteMany({});
    await prisma.student.deleteMany({});
    
    // Cleanup any teachers and users with test usernames to prevent unique key constraints
    const users = await prisma.user.findMany({
      where: {
        username: {
          in: ['test_teacher', 'test_student'],
        },
      },
      include: {
        teacher: {
          include: {
            question_banks: true,
          },
        },
      },
    });
    for (const u of users) {
      if (u.teacher) {
        for (const qb of u.teacher.question_banks) {
          await prisma.question.deleteMany({ where: { question_bank_id: qb.id } });
          await prisma.questionBank.delete({ where: { id: qb.id } });
        }
        await prisma.teacher.delete({ where: { id: u.teacher.id } });
      }
      await prisma.user.delete({ where: { id: u.id } });
    }

    const testClasses = await prisma.class.findMany({ where: { name: 'XII MIPA 1' } });
    for (const c of testClasses) {
      await prisma.class.delete({ where: { id: c.id } });
    }

    const testSubjects = await prisma.subject.findMany({ where: { code: 'MTK' } });
    for (const s of testSubjects) {
      await prisma.subject.delete({ where: { id: s.id } });
    }

    const testYears = await prisma.academicYear.findMany({ where: { name: '2026/2027 ODD' } });
    for (const y of testYears) {
      await prisma.academicYear.delete({ where: { id: y.id } });
    }

    const testMajors = await prisma.major.findMany({ where: { code: 'MIPA' } });
    for (const m of testMajors) {
      await prisma.major.delete({ where: { id: m.id } });
    }

    const passwordHash = await argon2.hash('teacher123');
    const user = await prisma.user.create({
      data: {
        username: 'test_teacher',
        email: 'test_teacher@securecbt.id',
        password_hash: passwordHash,
        role: UserRole.TEACHER,
        is_active: true,
      },
    });

    const teacher = await prisma.teacher.create({
      data: {
        user_id: user.id,
        nip: '1234567890',
        full_name: 'Test Teacher',
      },
    });
    teacherId = teacher.id;

    const academicYear = await prisma.academicYear.create({
      data: {
        name: '2026/2027 ODD',
        is_active: true,
      },
    });

    const major = await prisma.major.create({
      data: {
        name: 'MIPA',
        code: 'MIPA',
      },
    });

    const studentClass = await prisma.class.create({
      data: {
        name: 'XII MIPA 1',
        major_id: major.id,
        academic_year_id: academicYear.id,
        grade_level: 12,
      },
    });
    classId = studentClass.id;

    const subject = await prisma.subject.create({
      data: {
        name: 'Matematika',
        code: 'MTK',
        major_id: major.id,
      },
    });
    subjectId = subject.id;

    await prisma.teacherSubject.create({
      data: {
        teacher_id: teacherId,
        subject_id: subjectId,
      },
    });

    // We must associate the teacher with this subject for this specific academic year
    // Looking at the schema:
    // model TeacherSubject {
    //   id         String   @id @default(uuid()) @db.Uuid
    //   teacher_id String   @db.Uuid
    //   subject_id String   @db.Uuid
    //   // Note: there is no academic_year_id in the actual database schema!
    // }

    const questionBank = await prisma.questionBank.create({
      data: {
        title: 'Bank Soal Aljabar',
        subject_id: subjectId,
        teacher_id: teacherId,
      },
    });

    const question = await prisma.question.create({
      data: {
        question_bank_id: questionBank.id,
        content: 'Berapakah 1 + 1?',
        type: 'MULTIPLE_CHOICE',
        difficulty: 'EASY',
        options: {
          createMany: {
            data: [
              { content: '1', is_correct: false, order: 1 },
              { content: '2', is_correct: true, order: 2 },
              { content: '3', is_correct: false, order: 3 },
              { content: '4', is_correct: false, order: 4 },
            ],
          },
        },
      },
    });
    questionId = question.id;

    // Login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'test_teacher',
        password: 'teacher123',
        device_id: '9905d46f-c1ab-431f-bc87-9bc401b17ca3',
      });
    authToken = loginRes.body.data.access_token;
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  let createdExamId: string;

  it('/exams (POST) - create exam as teacher', async () => {
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    const response = await request(app.getHttpServer())
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Ujian Matematika Harian',
        description: 'Ujian Bab 1 Aljabar',
        subject_id: subjectId,
        duration_minutes: 60,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        class_ids: [classId],
        question_ids: [questionId],
        package_count: 1,
        randomize_questions: true,
        randomize_answers: true,
        warning_limit: 3,
        auto_submit_enabled: true,
        fullscreen_required: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.status).toBe(ExamStatus.PUBLISHED);
    createdExamId = response.body.data.id;
  });

  it('/exams/:id/token (POST) - generate token for published exam', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/exams/${createdExamId}/token`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.token.length).toBe(8);
  });
});
