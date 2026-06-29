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
describe('Authentication (e2e)', () => {
    let app;
    let prisma;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        // We must register the GlobalExceptionFilter, ResponseInterceptor, and ValidationPipe 
        // exactly like main.ts so that request payloads and validation errors are correctly intercepted and handled
        app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
        app.useGlobalInterceptors(new response_interceptor_1.ResponseInterceptor());
        app.useGlobalPipes(new common_1.ValidationPipe({ transform: true }));
        await app.init();
        prisma = moduleFixture.get(prisma_service_1.PrismaService);
    }, 20000);
    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });
    beforeEach(async () => {
        // Clear tokens and users before each test
        await prisma.refreshToken.deleteMany({});
        // We only clean the specific test user we created to avoid violating constraints on seeded users
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
                await prisma.examClass.deleteMany({
                    where: {
                        exam: {
                            teacher_id: u.teacher.id,
                        },
                    },
                });
                await prisma.examQuestion.deleteMany({
                    where: {
                        exam: {
                            teacher_id: u.teacher.id,
                        },
                    },
                });
                await prisma.examPackage.deleteMany({
                    where: {
                        exam: {
                            teacher_id: u.teacher.id,
                        },
                    },
                });
                await prisma.examToken.deleteMany({
                    where: {
                        exam: {
                            teacher_id: u.teacher.id,
                        },
                    },
                });
                await prisma.exam.deleteMany({ where: { teacher_id: u.teacher.id } });
                for (const qb of u.teacher.question_banks) {
                    await prisma.questionOption.deleteMany({
                        where: {
                            question: {
                                question_bank_id: qb.id,
                            },
                        },
                    });
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
                role: shared_1.UserRole.STUDENT,
                is_active: true,
            },
        });
        const response = await (0, supertest_1.default)(app.getHttpServer())
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
        expect(response.body.data.user.role).toBe(shared_1.UserRole.STUDENT);
    });
    it('/auth/login (POST) - invalid password', async () => {
        const passwordHash = await argon2.hash('password123');
        await prisma.user.create({
            data: {
                username: 'test_student',
                email: 'test_student_wrong@securecbt.id',
                password_hash: passwordHash,
                role: shared_1.UserRole.STUDENT,
                is_active: true,
            },
        });
        const response = await (0, supertest_1.default)(app.getHttpServer())
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
//# sourceMappingURL=auth.e2e-spec.js.map