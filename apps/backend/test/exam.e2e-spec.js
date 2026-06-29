"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const supertest_1 = __importDefault(require("supertest"));
const app_module_1 = require("./../src/app.module");
const prisma_service_1 = require("./../src/prisma/prisma.service");
const shared_1 = require("@secure-cbt/shared");
const global_exception_filter_1 = require("./../src/common/filters/global-exception.filter");
const response_interceptor_1 = require("./../src/common/interceptors/response.interceptor");
const argon2 = __importStar(require("argon2"));
describe('Exam Flow (e2e)', () => {
    let app;
    let prisma;
    let authToken;
    let teacherId;
    let subjectId;
    let classId;
    let questionId;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        // Set up pipes, filters, interceptors to mimic main.ts environment
        app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
        app.useGlobalInterceptors(new response_interceptor_1.ResponseInterceptor());
        app.useGlobalPipes(new common_1.ValidationPipe({ transform: true }));
        await app.init();
        prisma = moduleFixture.get(prisma_service_1.PrismaService);
        // Setup initial data
        await prisma.refreshToken.deleteMany({});
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
                id: '2a49b29e-64bf-4221-bc01-a90a42b17a02',
                username: 'test_teacher',
                email: 'test_teacher@securecbt.id',
                password_hash: passwordHash,
                role: shared_1.UserRole.TEACHER,
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
        const loginRes = await (0, supertest_1.default)(app.getHttpServer())
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
    let createdExamId;
    it('/exams (POST) - create exam as teacher', async () => {
        const startAt = new Date();
        const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000); // +2 hours
        const response = await (0, supertest_1.default)(app.getHttpServer())
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
        console.log('Exam Create Response Body:', response.body);
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.status).toBe(shared_1.ExamStatus.DRAFT);
        createdExamId = response.body.data.id;
    });
    it('/exams/:id/publish (POST) - publish exam', async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post(`/api/v1/exams/${createdExamId}/publish`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe(shared_1.ExamStatus.PUBLISHED);
    });
    it('/exams/:id/token (POST) - generate token for published exam', async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post(`/api/v1/exams/${createdExamId}/token`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.token.length).toBe(8);
    });
});
//# sourceMappingURL=exam.e2e-spec.js.map