import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from '@secure-cbt/shared';
import { GlobalExceptionFilter } from './../src/common/filters/global-exception.filter';
import { ResponseInterceptor } from './../src/common/interceptors/response.interceptor';
import * as argon2 from 'argon2';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    
    // We must register the GlobalExceptionFilter, ResponseInterceptor, and ValidationPipe 
    // exactly like main.ts so that request payloads and validation errors are correctly intercepted and handled
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  }, 20000);

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeAll(async () => {
    // Clean up any leftover test users from previous runs
    await prisma.refreshToken.deleteMany({});
    
    const users = await prisma.user.findMany({
      where: {
        username: {
          in: ['test_student', 'test_teacher'],
        },
      },
      include: {
        student: true,
        teacher: {
          include: {
            question_banks: true,
          },
        },
      },
    });

    for (const u of users) {
      if (u.student) {
        await prisma.student.delete({ where: { id: u.student.id } });
      }
      if (u.teacher) {
        await prisma.exam.deleteMany({ where: { teacher_id: u.teacher.id } });
        for (const qb of u.teacher.question_banks) {
          await prisma.question.deleteMany({ where: { question_bank_id: qb.id } });
          await prisma.questionBank.delete({ where: { id: qb.id } });
        }
        await prisma.teacherSubject.deleteMany({ where: { teacher_id: u.teacher.id } });
        await prisma.teacher.delete({ where: { id: u.teacher.id } });
      }
      await prisma.user.delete({ where: { id: u.id } });
    }
  });

  it('/auth/login (POST) - login successfully', async () => {
    const passwordHash = await argon2.hash('password123');
    await prisma.user.create({
      data: {
        username: 'test_student',
        email: 'test_student@securecbt.id',
        password_hash: passwordHash,
        role: UserRole.STUDENT,
        is_active: true,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'test_student',
        password: 'password123',
        device_id: '9905d46f-c1ab-431f-bc87-9bc401b17ca3',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.access_token).toBeDefined();
    expect(response.body.data.refresh_token).toBeDefined();
    expect(response.body.data.user.username).toBe('test_student');
    expect(response.body.data.user.role).toBe(UserRole.STUDENT);
  });

  it('/auth/login (POST) - invalid password', async () => {
    const passwordHash = await argon2.hash('password123');
    await prisma.user.create({
      data: {
        username: 'test_student',
        email: 'test_student_wrong@securecbt.id',
        password_hash: passwordHash,
        role: UserRole.STUDENT,
        is_active: true,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'test_student',
        password: 'wrong_password',
        device_id: '9905d46f-c1ab-431f-bc87-9bc401b17ca3',
      })
      .expect(401);

    expect(response.body.success).toBe(false);
  });
});
