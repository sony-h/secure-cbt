import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/**
 * Standalone seed script for development.
 * Usage: ts-node prisma/seed.ts
 *
 * Creates:
 * - Admin user
 * - Academic year 2024/2025
 * - Two majors (IPA, IPS)
 * - Sample classes
 * - Sample subjects
 * - Sample teacher
 * - Sample students
 */
@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
  ],
})
class SeedModule {}

async function seed() {
  const app = await NestFactory.createApplicationContext(SeedModule);
  const prisma = app.get(PrismaService);
  const logger = new Logger('Seed');

  logger.log('🌱 Starting database seed...');

  try {
    // ── 1. Clean existing data (reverse order of dependencies) ─
    logger.log('Cleaning existing data...');
    await prisma.answer.deleteMany();
    await prisma.score.deleteMany();
    await prisma.sessionLog.deleteMany();
    await prisma.examSession.deleteMany();
    await prisma.examQuestion.deleteMany();
    await prisma.examClass.deleteMany();
    await prisma.examPackage.deleteMany();
    await prisma.examToken.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.questionTag.deleteMany();
    await prisma.questionOption.deleteMany();
    await prisma.question.deleteMany();
    await prisma.questionBank.deleteMany();
    await prisma.teacherSubject.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.student.deleteMany();
    await prisma.class.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.major.deleteMany();
    await prisma.academicYear.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.setting.deleteMany();

    // ── 2. Create default settings ──────────────────────────────
    logger.log('Creating default settings...');
    await prisma.setting.create({
      data: {
        warning_limit: 3,
        auto_submit_enabled: true,
        fullscreen_required: true,
        lock_task_mode: false,
        autosave_interval: 5,
        session_timeout: 30,
      },
    });

    // ── 3. Create admin user ────────────────────────────────────
    logger.log('Creating admin user...');
    const adminPassword = await argon2.hash('admin123');
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@securecbt.id',
        password_hash: adminPassword,
        role: 'ADMIN',
      },
    });
    logger.log(`  Admin: admin / admin123 (id: ${admin.id})`);

    // ── 4. Create operator user ─────────────────────────────────
    const operatorPassword = await argon2.hash('operator123');
    const operator = await prisma.user.create({
      data: {
        username: 'operator',
        email: 'operator@securecbt.id',
        password_hash: operatorPassword,
        role: 'OPERATOR',
      },
    });
    logger.log(`  Operator: operator / operator123 (id: ${operator.id})`);

    // ── 5. Create academic year ─────────────────────────────────
    logger.log('Creating academic data...');
    const academicYear = await prisma.academicYear.create({
      data: { name: 'Tahun Ajaran 2024/2025', is_active: true },
    });

    // ── 6. Create majors ────────────────────────────────────────
    const majorIPA = await prisma.major.create({
      data: { name: 'Ilmu Pengetahuan Alam', code: 'IPA' },
    });
    const majorIPS = await prisma.major.create({
      data: { name: 'Ilmu Pengetahuan Sosial', code: 'IPS' },
    });

    // ── 7. Create classes ───────────────────────────────────────
    const classXII_IPA_1 = await prisma.class.create({
      data: {
        name: 'XII IPA 1',
        major_id: majorIPA.id,
        academic_year_id: academicYear.id,
        grade_level: 12,
      },
    });
    const classXII_IPA_2 = await prisma.class.create({
      data: {
        name: 'XII IPA 2',
        major_id: majorIPA.id,
        academic_year_id: academicYear.id,
        grade_level: 12,
      },
    });
    const classXII_IPS_1 = await prisma.class.create({
      data: {
        name: 'XII IPS 1',
        major_id: majorIPS.id,
        academic_year_id: academicYear.id,
        grade_level: 12,
      },
    });

    // ── 8. Create subjects ──────────────────────────────────────
    const subjects = await Promise.all([
      prisma.subject.create({ data: { name: 'Matematika', code: 'MTK', major_id: majorIPA.id } }),
      prisma.subject.create({ data: { name: 'Bahasa Indonesia', code: 'BIN' } }),
      prisma.subject.create({ data: { name: 'Bahasa Inggris', code: 'BIG' } }),
      prisma.subject.create({ data: { name: 'Fisika', code: 'FIS', major_id: majorIPA.id } }),
      prisma.subject.create({ data: { name: 'Kimia', code: 'KIM', major_id: majorIPA.id } }),
      prisma.subject.create({ data: { name: 'Biologi', code: 'BIO', major_id: majorIPA.id } }),
      prisma.subject.create({ data: { name: 'Ekonomi', code: 'EKO', major_id: majorIPS.id } }),
      prisma.subject.create({ data: { name: 'Geografi', code: 'GEO', major_id: majorIPS.id } }),
      prisma.subject.create({ data: { name: 'Sosiologi', code: 'SOS', major_id: majorIPS.id } }),
      prisma.subject.create({ data: { name: 'Sejarah', code: 'SEJ' } }),
      prisma.subject.create({ data: { name: 'Pendidikan Agama', code: 'PAG' } }),
      prisma.subject.create({ data: { name: 'PKN', code: 'PKN' } }),
    ]);

    // ── 9. Create teacher user + teacher profile ────────────────
    logger.log('Creating sample teacher...');
    const teacherPassword = await argon2.hash('teacher123');
    const teacherUser = await prisma.user.create({
      data: {
        username: '198501012010011001',
        email: 'budi@teacher.securecbt.id',
        password_hash: teacherPassword,
        role: 'TEACHER',
      },
    });
    const teacher = await prisma.teacher.create({
      data: {
        user_id: teacherUser.id,
        nip: '198501012010011001',
        full_name: 'Budi Santoso, S.Pd.',
      },
    });

    // Assign teacher to Math and Physics
    await prisma.teacherSubject.createMany({
      data: [
        { teacher_id: teacher.id, subject_id: subjects[0].id }, // Matematika
        { teacher_id: teacher.id, subject_id: subjects[3].id }, // Fisika
      ],
    });
    logger.log(`  Teacher: 198501012010011001 / teacher123 (id: ${teacher.id})`);

    // ── 10. Create sample students (10 per class) ────────────────
    logger.log('Creating sample students...');
    const classes = [classXII_IPA_1, classXII_IPA_2, classXII_IPS_1];
    const classNames = ['XII IPA 1', 'XII IPA 2', 'XII IPS 1'];

    for (let c = 0; c < classes.length; c++) {
      for (let i = 1; i <= 10; i++) {
        const nis = `${2024}${String(c + 1).padStart(2, '0')}${String(i).padStart(3, '0')}`;
        const studentPassword = await argon2.hash(nis);
        const studentUser = await prisma.user.create({
          data: {
            username: nis,
            email: `${nis}@student.securecbt.id`,
            password_hash: studentPassword,
            role: 'STUDENT',
          },
        });
        await prisma.student.create({
          data: {
            user_id: studentUser.id,
            nis,
            full_name: `Siswa ${classNames[c]} ${i}`,
            class_id: classes[c].id,
            status: 'ACTIVE',
          },
        });
      }
    }
    logger.log('  30 students created (10 per class)');

    // ── 11. Create sample question bank ─────────────────────────
    logger.log('Creating sample question bank...');
    const mathSubject = subjects[0]; // Matematika
    const bank = await prisma.questionBank.create({
      data: {
        title: 'Bank Soal Matematika - Ujian Sekolah',
        subject_id: mathSubject.id,
        teacher_id: teacher.id,
      },
    });

    // ── 12. Create sample questions ─────────────────────────────
    logger.log('Creating sample questions...');
    const sampleQuestions = [
      {
        type: 'MULTIPLE_CHOICE' as const,
        content: 'Hasil dari 2² + 3² adalah...',
        options: [
          { content: '10', is_correct: false },
          { content: '13', is_correct: true },
          { content: '12', is_correct: false },
          { content: '11', is_correct: false },
        ],
        tags: ['aljabar', 'pangkat'],
      },
      {
        type: 'MULTIPLE_CHOICE' as const,
        content: 'Akar kuadrat dari 144 adalah...',
        options: [
          { content: '11', is_correct: false },
          { content: '12', is_correct: true },
          { content: '13', is_correct: false },
          { content: '14', is_correct: false },
        ],
        tags: ['akar', 'dasar'],
      },
      {
        type: 'TRUE_FALSE' as const,
        content: 'Sudut siku-siku adalah 90 derajat.',
        options: [
          { content: 'Benar', is_correct: true },
          { content: 'Salah', is_correct: false },
        ],
        tags: ['geometri'],
      },
      {
        type: 'MULTIPLE_CHOICE' as const,
        content: 'Jika x + 5 = 12, maka nilai x adalah...',
        options: [
          { content: '5', is_correct: false },
          { content: '6', is_correct: false },
          { content: '7', is_correct: true },
          { content: '8', is_correct: false },
        ],
        tags: ['aljabar', 'persamaan'],
      },
      {
        type: 'ESSAY' as const,
        content: 'Jelaskan pengertian dari Teorema Pythagoras dan berikan contoh penggunaannya dalam kehidupan sehari-hari.',
        options: [],
        tags: ['geometri', 'teori'],
      },
    ];

    for (const q of sampleQuestions) {
      const question = await prisma.question.create({
        data: {
          question_bank_id: bank.id,
          type: q.type,
          content: q.content,
          difficulty: 'MEDIUM',
        },
      });

      if (q.options.length > 0) {
        await prisma.questionOption.createMany({
          data: q.options.map((opt, idx) => ({
            question_id: question.id,
            content: opt.content,
            is_correct: opt.is_correct,
            order: idx + 1,
          })),
        });
      }

      if (q.tags.length > 0) {
        await prisma.questionTag.createMany({
          data: q.tags.map((tag) => ({ question_id: question.id, tag })),
        });
      }
    }
    logger.log('  5 sample questions created');

    logger.log('✅ Database seed completed successfully!');
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.log('  Admin:    admin / admin123');
    logger.log('  Operator: operator / operator123');
    logger.log('  Teacher:  198501012010011001 / teacher123');
    logger.log('  Students: NIS-based (e.g., 202401001 / 202401001)');
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    logger.error('Seed failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
