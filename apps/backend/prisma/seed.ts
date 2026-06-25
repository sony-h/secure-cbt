import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { randomBytes } from 'crypto';

/**
 * Comprehensive seed script for Secure CBT development.
 * Usage: ts-node prisma/seed.ts
 *
 * Creates:
 * - 3 users (admin, operator, 3 teachers)
 * - 2 academic years (1 active, 1 archived)
 * - 3 majors (IPA, IPS, Bahasa)
 * - 6 classes (2 per major)
 * - 15 subjects across majors
 * - 3 teachers with realistic names & subjects
 * - 60 students (10 per class) with realistic Indonesian names
 * - 3 question banks with 25 total questions
 * - 2 sample exams (1 published + token, 1 draft)
 * - Exam sessions & answers for monitoring/reports demo
 * - Grading scores for reports dashboard
 */

@Module({
  imports: [ConfigModule.forRoot(), PrismaModule],
})
class SeedModule {}

// ── Indonesian Student Names ────────────────────────────
const FIRST_NAMES = [
  'Adi', 'Ahmad', 'Aisyah', 'Andi', 'Anisa', 'Arif', 'Ayu', 'Bagas',
  'Budi', 'Citra', 'Dewi', 'Dimas', 'Dina', 'Eko', 'Fajar', 'Fitri',
  'Gilang', 'Hana', 'Indah', 'Irfan', 'Joko', 'Kartika', 'Lia', 'Maya',
  'Nanda', 'Novi', 'Putra', 'Putri', 'Rama', 'Ratna', 'Rian', 'Rina',
  'Rizky', 'Sari', 'Satria', 'Sinta', 'Teguh', 'Tuti', 'Wahyu', 'Yoga',
  'Yuni', 'Zahra', 'Agung', 'Bella', 'Cahya', 'Dian', 'Eka', 'Faisal',
  'Galih', 'Hendra', 'Intan', 'Kiki', 'Laras', 'Mira', 'Nina', 'Olga',
  'Pandu', 'Rani', 'Siska', 'Tono', 'Umar',
];

const LAST_NAMES = [
  'Pratama', 'Wijaya', 'Santoso', 'Hidayat', 'Kusuma', 'Nugroho', 'Setiawan',
  'Permana', 'Saputra', 'Mahendra', 'Hartono', 'Gunawan', 'Wibowo', 'Susanto',
  'Lesmana', 'Iskandar', 'Rahmawati', 'Kurniawan', 'Siregar', 'Nasution',
];

function randomName(): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

async function seed() {
  const app = await NestFactory.createApplicationContext(SeedModule);
  const prisma = app.get(PrismaService);
  const logger = new Logger('Seed');

  logger.log('🌱 Starting comprehensive database seed...');

  try {
    // ── 1. Clean existing data ─────────────────────────────
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

    // ── 2. Default settings ────────────────────────────────
    logger.log('Creating default settings...');
    await prisma.setting.create({
      data: { warning_limit: 3, auto_submit_enabled: true, fullscreen_required: true, lock_task_mode: false, autosave_interval: 5, session_timeout: 30 },
    });

    // ── 3. Users (Admin + Operator) ─────────────────────────
    logger.log('Creating users...');
    await prisma.user.createMany({
      data: [
        { username: 'admin', email: 'admin@securecbt.id', password_hash: await argon2.hash('admin123'), role: 'ADMIN' },
        { username: 'operator', email: 'operator@securecbt.id', password_hash: await argon2.hash('operator123'), role: 'OPERATOR' },
      ],
    });
    logger.log('  admin / admin123');
    logger.log('  operator / operator123');

    // ── 4. Academic Years ───────────────────────────────────
    logger.log('Creating academic data...');
    const year2024 = await prisma.academicYear.create({ data: { name: 'Tahun Ajaran 2024/2025', is_active: false } });
    const year2025 = await prisma.academicYear.create({ data: { name: 'Tahun Ajaran 2025/2026', is_active: true } });
    const activeYear = year2025;

    // ── 5. Majors ───────────────────────────────────────────
    const [majorIPA, majorIPS, majorBAH] = await Promise.all([
      prisma.major.create({ data: { name: 'Ilmu Pengetahuan Alam', code: 'IPA' } }),
      prisma.major.create({ data: { name: 'Ilmu Pengetahuan Sosial', code: 'IPS' } }),
      prisma.major.create({ data: { name: 'Bahasa', code: 'BAH' } }),
    ]);

    // ── 6. Classes (2 per major in active year) ─────────────
    const classNames = [
      { name: 'XII IPA 1', major_id: majorIPA.id },
      { name: 'XII IPA 2', major_id: majorIPA.id },
      { name: 'XII IPS 1', major_id: majorIPS.id },
      { name: 'XII IPS 2', major_id: majorIPS.id },
      { name: 'XII BAH 1', major_id: majorBAH.id },
      { name: 'XII BAH 2', major_id: majorBAH.id },
    ];
    const classes: any[] = [];
    for (const c of classNames) {
      const cls = await prisma.class.create({
        data: { name: c.name, major_id: c.major_id, academic_year_id: activeYear.id, grade_level: 12 },
      });
      classes.push(cls);
    }

    // ── 7. Subjects ─────────────────────────────────────────
    const subjects = await Promise.all([
      // Umum (no major)
      prisma.subject.create({ data: { name: 'Matematika Wajib', code: 'MTK-W' } }),
      prisma.subject.create({ data: { name: 'Bahasa Indonesia', code: 'BIN' } }),
      prisma.subject.create({ data: { name: 'Bahasa Inggris', code: 'BIG' } }),
      prisma.subject.create({ data: { name: 'Pendidikan Agama Islam', code: 'PAI' } }),
      prisma.subject.create({ data: { name: 'PKN', code: 'PKN' } }),
      prisma.subject.create({ data: { name: 'Sejarah Indonesia', code: 'SEJ' } }),
      prisma.subject.create({ data: { name: 'Penjasorkes', code: 'PJK' } }),
      // IPA
      prisma.subject.create({ data: { name: 'Matematika Peminatan', code: 'MTK-P', major_id: majorIPA.id } }),
      prisma.subject.create({ data: { name: 'Fisika', code: 'FIS', major_id: majorIPA.id } }),
      prisma.subject.create({ data: { name: 'Kimia', code: 'KIM', major_id: majorIPA.id } }),
      prisma.subject.create({ data: { name: 'Biologi', code: 'BIO', major_id: majorIPA.id } }),
      // IPS
      prisma.subject.create({ data: { name: 'Ekonomi', code: 'EKO', major_id: majorIPS.id } }),
      prisma.subject.create({ data: { name: 'Geografi', code: 'GEO', major_id: majorIPS.id } }),
      prisma.subject.create({ data: { name: 'Sosiologi', code: 'SOS', major_id: majorIPS.id } }),
      // Bahasa
      prisma.subject.create({ data: { name: 'Bahasa Jepang', code: 'BJE', major_id: majorBAH.id } }),
    ]);

    // ── 8. Teachers (3) ────────────────────────────────────
    logger.log('Creating teachers...');
    const teacherData = [
      { nip: '198501012010011001', name: 'Budi Santoso, S.Pd.', subjects: ['MTK-W', 'MTK-P'] },
      { nip: '199003152014012002', name: 'Dewi Lestari, S.Pd., M.Pd.', subjects: ['FIS', 'KIM'] },
      { nip: '198807202012011003', name: 'Hendra Gunawan, S.Pd.', subjects: ['BIO', 'BIN'] },
    ];
    const teachers: any[] = [];
    for (const td of teacherData) {
      const user = await prisma.user.create({
        data: { username: td.nip, email: `${td.nip}@teacher.securecbt.id`, password_hash: await argon2.hash('teacher123'), role: 'TEACHER' },
      });
      const teacher = await prisma.teacher.create({ data: { user_id: user.id, nip: td.nip, full_name: td.name } });
      teachers.push(teacher);

      for (const code of td.subjects) {
        const subj = subjects.find(s => s.code === code);
        if (subj) {
          await prisma.teacherSubject.create({ data: { teacher_id: teacher.id, subject_id: subj.id } });
        }
      }
      logger.log(`  ${td.nip} / teacher123 — ${td.name}`);
    }

    // ── 9. Students (10 per class = 60 total) ───────────────
    logger.log('Creating students...');
    const allStudents: any[] = [];
    const usedNames = new Set<string>();
    for (let ci = 0; ci < classes.length; ci++) {
      const cls = classes[ci];
      for (let i = 1; i <= 10; i++) {
        let name: string;
        do { name = randomName(); } while (usedNames.has(name));
        usedNames.add(name);

        const nis = `${2025}${String(ci + 1).padStart(2, '0')}${String(i).padStart(3, '0')}`;
        const user = await prisma.user.create({
          data: { username: nis, email: `${nis}@student.securecbt.id`, password_hash: await argon2.hash(nis), role: 'STUDENT' },
        });
        const student = await prisma.student.create({
          data: { user_id: user.id, nis, full_name: name, class_id: cls.id, status: 'ACTIVE' },
        });
        allStudents.push(student);
      }
    }
    logger.log(`  60 students created (10 per class)`);

    // ── 10. Question Banks (3) ──────────────────────────────
    logger.log('Creating question banks & questions...');
    const mathMinat = subjects.find(s => s.code === 'MTK-P');
    const fisika = subjects.find(s => s.code === 'FIS');
    const kimia = subjects.find(s => s.code === 'KIM');
    const bio = subjects.find(s => s.code === 'BIO');
    const bin = subjects.find(s => s.code === 'BIN');

    const banks = await Promise.all([
      prisma.questionBank.create({ data: { title: 'Bank Soal UTBK Matematika', subject_id: mathMinat!.id, teacher_id: teachers[0].id } }),
      prisma.questionBank.create({ data: { title: 'Bank Soal Fisika Kelas XII', subject_id: fisika!.id, teacher_id: teachers[1].id } }),
      prisma.questionBank.create({ data: { title: 'Bank Soal Bahasa Indonesia', subject_id: bin!.id, teacher_id: teachers[2].id } }),
    ]);

    // ── 11. Questions (10 + 8 + 7 = 25 total) ──────────────
    const questionTemplates: { bank: number; type: string; content: string; options: { text: string; correct: boolean }[]; difficulty: string; tags: string[] }[] = [
      // ── Bank 0: Matematika (10 questions) ──
      { bank: 0, type: 'MULTIPLE_CHOICE', difficulty: 'EASY',
        content: 'Hasil dari 2³ × 2² adalah...',
        options: [{ text: '32', correct: true }, { text: '16', correct: false }, { text: '64', correct: false }, { text: '10', correct: false }, { text: '8', correct: false }],
        tags: ['eksponen', 'dasar'] },
      { bank: 0, type: 'MULTIPLE_CHOICE', difficulty: 'EASY',
        content: 'Akar kuadrat dari 196 adalah...',
        options: [{ text: '12', correct: false }, { text: '13', correct: false }, { text: '14', correct: true }, { text: '15', correct: false }, { text: '16', correct: false }],
        tags: ['akar', 'dasar'] },
      { bank: 0, type: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM',
        content: 'Jika f(x) = 2x² - 3x + 1, maka f(2) adalah...',
        options: [{ text: '3', correct: true }, { text: '5', correct: false }, { text: '7', correct: false }, { text: '9', correct: false }],
        tags: ['fungsi', 'aljabar'] },
      { bank: 0, type: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM',
        content: 'Persamaan garis yang melalui titik (2, 3) dan (4, 7) adalah...',
        options: [{ text: 'y = 2x - 1', correct: true }, { text: 'y = x + 1', correct: false }, { text: 'y = 2x + 1', correct: false }, { text: 'y = x - 1', correct: false }],
        tags: ['persamaan_garis', 'geometri'] },
      { bank: 0, type: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM',
        content: 'Turunan pertama dari f(x) = x³ - 6x² + 9x adalah...',
        options: [{ text: '3x² - 12x + 9', correct: true }, { text: 'x² - 6x + 9', correct: false }, { text: '3x² - 6x + 9', correct: false }, { text: '3x² - 12x', correct: false }],
        tags: ['turunan', 'kalkulus'] },
      { bank: 0, type: 'TRUE_FALSE', difficulty: 'EASY',
        content: 'Nilai sin 90° adalah 1.',
        options: [{ text: 'Benar', correct: true }, { text: 'Salah', correct: false }],
        tags: ['trigonometri', 'dasar'] },
      { bank: 0, type: 'MULTIPLE_CHOICE', difficulty: 'HARD',
        content: 'Jika matriks A = [[2, 1], [3, 4]], determinan dari A adalah...',
        options: [{ text: '5', correct: true }, { text: '8', correct: false }, { text: '11', correct: false }, { text: '6', correct: false }],
        tags: ['matriks', 'aljabar_linear'] },
      { bank: 0, type: 'MULTI_SELECT', difficulty: 'HARD',
        content: 'Manakah yang termasuk bilangan prima? (Pilih semua yang benar)',
        options: [{ text: '2', correct: true }, { text: '9', correct: false }, { text: '13', correct: true }, { text: '21', correct: false }, { text: '17', correct: true }],
        tags: ['bilangan', 'teori'] },
      { bank: 0, type: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM',
        content: 'Peluang munculnya mata dadu genap pada pelemparan sebuah dadu adalah...',
        options: [{ text: '1/2', correct: true }, { text: '1/3', correct: false }, { text: '1/6', correct: false }, { text: '2/3', correct: false }],
        tags: ['probabilitas', 'statistika'] },
      { bank: 0, type: 'ESSAY', difficulty: 'HARD',
        content: 'Sebuah bola dilempar vertikal ke atas dengan kecepatan awal 20 m/s. Jika percepatan gravitasi 10 m/s², hitunglah: (a) waktu untuk mencapai titik tertinggi, (b) tinggi maksimum yang dicapai.',
        options: [], tags: ['kinematika', 'terapan'] },

      // ── Bank 1: Fisika (8 questions) ──
      { bank: 1, type: 'MULTIPLE_CHOICE', difficulty: 'EASY',
        content: 'Satuan dari gaya dalam SI adalah...',
        options: [{ text: 'Newton', correct: true }, { text: 'Joule', correct: false }, { text: 'Pascal', correct: false }, { text: 'Watt', correct: false }],
        tags: ['satuan', 'dasar'] },
      { bank: 1, type: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM',
        content: 'Sebuah benda bermassa 2 kg bergerak dengan kecepatan 4 m/s. Energi kinetik benda tersebut adalah...',
        options: [{ text: '16 J', correct: true }, { text: '8 J', correct: false }, { text: '32 J', correct: false }, { text: '4 J', correct: false }],
        tags: ['energi', 'mekanika'] },
      { bank: 1, type: 'TRUE_FALSE', difficulty: 'EASY',
        content: 'Semakin besar hambatan, semakin besar arus listrik yang mengalir pada tegangan tetap.',
        options: [{ text: 'Benar', correct: false }, { text: 'Salah', correct: true }],
        tags: ['listrik', 'hukum_ohm'] },
      { bank: 1, type: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM',
        content: 'Sebuah benda bermassa 5 kg dikenai gaya 20 N. Percepatan benda adalah...',
        options: [{ text: '4 m/s²', correct: true }, { text: '100 m/s²', correct: false }, { text: '0,25 m/s²', correct: false }, { text: '15 m/s²', correct: false }],
        tags: ['hukum_newton', 'mekanika'] },
      { bank: 1, type: 'MULTIPLE_CHOICE', difficulty: 'HARD',
        content: 'Dua buah muatan masing-masing 2 μC dan 4 μC terpisah sejauh 2 cm. Gaya Coulomb yang terjadi adalah... (k = 9×10⁹ Nm²/C²)',
        options: [{ text: '180 N', correct: true }, { text: '90 N', correct: false }, { text: '360 N', correct: false }, { text: '45 N', correct: false }],
        tags: ['listrik_statis', 'coulomb'] },
      { bank: 1, type: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM',
        content: 'Frekuensi gelombang yang memiliki panjang gelombang 2 m dan cepat rambat 340 m/s adalah...',
        options: [{ text: '170 Hz', correct: true }, { text: '680 Hz', correct: false }, { text: '340 Hz', correct: false }, { text: '85 Hz', correct: false }],
        tags: ['gelombang', 'bunyi'] },
      { bank: 1, type: 'MULTI_SELECT', difficulty: 'HARD',
        content: 'Manakah yang termasuk gelombang elektromagnetik? (Pilih semua yang benar)',
        options: [{ text: 'Gelombang radio', correct: true }, { text: 'Gelombang bunyi', correct: false }, { text: 'Sinar X', correct: true }, { text: 'Gelombang air', correct: false }],
        tags: ['gelombang', 'elektromagnetik'] },
      { bank: 1, type: 'ESSAY', difficulty: 'HARD',
        content: 'Jelaskan perbedaan antara rangkaian seri dan paralel pada listrik, beserta rumus hambatan penggantinya. Berikan contoh aplikasi masing-masing.',
        options: [], tags: ['listrik', 'rangkaian'] },

      // ── Bank 2: Bahasa Indonesia (7 questions) ──
      { bank: 2, type: 'MULTIPLE_CHOICE', difficulty: 'EASY',
        content: 'Kata "efektif" dalam KBBI berarti...',
        options: [{ text: 'Ada efeknya', correct: false }, { text: 'Tepat guna / berhasil guna', correct: true }, { text: 'Bermanfaat', correct: false }, { text: 'Berkualitas', correct: false }],
        tags: ['kosakata', 'dasar'] },
      { bank: 2, type: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM',
        content: 'Bacalah paragraf berikut:\n\n"Pendidikan karakter sangat penting bagi generasi muda. Melalui pendidikan karakter, siswa tidak hanya cerdas secara intelektual tetapi juga memiliki moral yang baik."\n\nIde pokok paragraf tersebut adalah...',
        options: [{ text: 'Pentingnya pendidikan karakter', correct: true }, { text: 'Kecerdasan intelektual', correct: false }, { text: 'Generasi muda', correct: false }, { text: 'Moral yang baik', correct: false }],
        tags: ['pemahaman_bacaan', 'ide_pokok'] },
      { bank: 2, type: 'TRUE_FALSE', difficulty: 'EASY',
        content: '"Saya pergi ke sekolah" menggunakan kata depan yang tepat.',
        options: [{ text: 'Benar', correct: true }, { text: 'Salah', correct: false }],
        tags: ['tata_bahasa', 'kata_depan'] },
      { bank: 2, type: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM',
        content: 'Kalimat berikut yang menggunakan ejaan yang benar adalah...',
        options: [
          { text: 'Presiden Republik Indonesia.', correct: false },
          { text: 'presiden Republik Indonesia.', correct: true },
          { text: 'Presiden republik indonesia.', correct: false },
          { text: 'presiden republik Indonesia.', correct: false },
        ],
        tags: ['ejaan', 'EYD'] },
      { bank: 2, type: 'MULTIPLE_CHOICE', difficulty: 'HARD',
        content: 'Majas yang digunakan dalam kalimat "Angin berbisik lembut di telingaku" adalah...',
        options: [{ text: 'Personifikasi', correct: true }, { text: 'Metafora', correct: false }, { text: 'Hiperbola', correct: false }, { text: 'Simile', correct: false }],
        tags: ['majas', 'sastra'] },
      { bank: 2, type: 'MULTI_SELECT', difficulty: 'MEDIUM',
        content: 'Manakah yang termasuk jenis teks eksposisi? (Pilih semua yang benar)',
        options: [{ text: 'Artikel ilmiah', correct: true }, { text: 'Cerpen', correct: false }, { text: 'Editorial', correct: true }, { text: 'Puisi', correct: false }, { text: 'Laporan penelitian', correct: true }],
        tags: ['teks', 'jenis_teks'] },
      { bank: 2, type: 'ESSAY', difficulty: 'HARD',
        content: 'Tulislah sebuah paragraf argumentatif (minimal 5 kalimat) tentang pentingnya literasi digital di era modern. Perhatikan struktur: pendahuluan, argumen, dan kesimpulan.',
        options: [], tags: ['menulis', 'argumentasi'] },
    ];

    const allQuestions: any[] = [];
    for (let qi = 0; qi < questionTemplates.length; qi++) {
      const t = questionTemplates[qi]!;
      const question = await prisma.question.create({
        data: { question_bank_id: banks[t.bank]!.id, type: t.type as any, content: t.content, difficulty: t.difficulty as any },
      });
      allQuestions.push(question);

      if (t.options.length > 0) {
        await prisma.questionOption.createMany({
          data: t.options.map((opt, idx) => ({
            question_id: question.id, content: opt.text, is_correct: opt.correct, order: idx + 1,
          })),
        });
      }
      if (t.tags.length > 0) {
        await prisma.questionTag.createMany({
          data: t.tags.map((tag) => ({ question_id: question.id, tag })),
        });
      }
    }
    logger.log(`  25 questions created across 3 banks`);

    // ── 12. Sample Exams ────────────────────────────────────
    logger.log('Creating sample exams...');
    const now = new Date();
    const exam1Start = new Date(now.getTime() - 24 * 3600 * 1000);  // 1 day ago
    const exam1End = new Date(now.getTime() + 30 * 24 * 3600 * 1000); // 30 days from now

    // Exam 1: UTS Matematika (Published, ongoing)
    const mathQuestions = allQuestions.slice(0, 10);  // Bank 0 questions
    const exam1 = await prisma.exam.create({
      data: {
        title: 'UTS Matematika Peminatan Semester 1',
        description: 'Ujian Tengah Semester Matematika Peminatan — Materi: Eksponen, Fungsi, Trigonometri, Matriks',
        subject_id: mathMinat!.id,
        teacher_id: teachers[0].id,
        duration_minutes: 90,
        status: 'PUBLISHED',
        start_at: exam1Start,
        end_at: exam1End,
        randomize_questions: true,
        randomize_answers: true,
        warning_limit: 3,
        auto_submit_enabled: true,
        fullscreen_required: true,
        package_count: 2,
      },
    });

    // Assign IPA classes to exam 1
    const ipaClasses = classes.filter(c => c.major_id === majorIPA.id);
    await prisma.examClass.createMany({
      data: ipaClasses.map(c => ({ exam_id: exam1.id, class_id: c.id })),
    });

    // Create 2 packages for exam 1
    const pkg1A = await prisma.examPackage.create({ data: { exam_id: exam1.id, name: 'A' } });
    const pkg1B = await prisma.examPackage.create({ data: { exam_id: exam1.id, name: 'B' } });

    // Assign 5 questions per package (rotated subset)
    const shuffledQ = [...mathQuestions].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 5; i++) {
      await prisma.examQuestion.create({ data: { exam_id: exam1.id, question_id: shuffledQ[i].id, position: i + 1, package_id: pkg1A.id } });
      await prisma.examQuestion.create({ data: { exam_id: exam1.id, question_id: shuffledQ[i + 5].id, position: i + 1, package_id: pkg1B.id } });
    }

    // Generate token for exam 1
    const token1 = randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
    await prisma.examToken.create({ data: { exam_id: exam1.id, token: token1, expires_at: new Date(Date.now() + 3 * 24 * 3600 * 1000) } });
    logger.log(`  UTS Matematika (PUBLISHED) — Token: ${token1}`);

    // Exam 2: Fisika Harian (Draft)
    const physicsQuestions = allQuestions.slice(10, 18);
    const exam2 = await prisma.exam.create({
      data: {
        title: 'Ulangan Harian Fisika — Hukum Newton & Energi',
        description: 'Ulangan harian Bab 2 dan 3. Materi: Hukum Newton, Energi Kinetik, dan Usaha.',
        subject_id: fisika!.id,
        teacher_id: teachers[1].id,
        duration_minutes: 60,
        status: 'DRAFT',
        start_at: new Date(now.getTime() + 2 * 24 * 3600 * 1000),   // 2 days from now
        end_at: new Date(now.getTime() + 32 * 24 * 3600 * 1000),       // 32 days from now
        randomize_questions: true,
        randomize_answers: true,
        warning_limit: 2,
        auto_submit_enabled: true,
        fullscreen_required: true,
        package_count: 1,
      },
    });
    await prisma.examClass.createMany({
      data: ipaClasses.map(c => ({ exam_id: exam2.id, class_id: c.id })),
    });
    const pkg2 = await prisma.examPackage.create({ data: { exam_id: exam2.id, name: 'A' } });
    for (let i = 0; i < physicsQuestions.length; i++) {
      await prisma.examQuestion.create({ data: { exam_id: exam2.id, question_id: physicsQuestions[i].id, position: i + 1, package_id: pkg2.id } });
    }
    logger.log('  Ulangan Harian Fisika (DRAFT)');

    // ── 13. Exam Sessions & Answers (for monitoring/reports demo) ──
    logger.log('Creating demo exam sessions & answers...');
    const ipaStudents = allStudents.filter(s => classes.find(c => c.id === s.class_id)?.major_id === majorIPA.id);
    const demoStudents = ipaStudents.slice(0, 5); // 5 students

    for (let si = 0; si < demoStudents.length; si++) {
      const student = demoStudents[si];
      const pkg = si % 2 === 0 ? pkg1A : pkg1B;
      const status = si < 4 ? 'SUBMITTED' : 'ACTIVE';

      const session = await prisma.examSession.create({
        data: {
          exam_id: exam1.id,
          student_id: student.id,
          package_id: pkg.id,
          status: status as any,
          started_at: new Date(now.getTime() - 45 * 60 * 1000),
          submitted_at: status === 'SUBMITTED' ? new Date(now.getTime() - 10 * 60 * 1000) : null,
          remaining_time_seconds: status === 'ACTIVE' ? 2700 : 0,
          warning_count: si === 2 ? 1 : 0,
          device_id: `device-${si}`,
        },
      });

      // Create session log
      await prisma.sessionLog.create({
        data: { exam_session_id: session.id, event: 'SESSION_STARTED', description: `Siswa ${student.full_name} memulai ujian`, created_at: session.started_at },
      });
      if (si === 2) {
        await prisma.sessionLog.create({
          data: { exam_session_id: session.id, event: 'WARNING_TRIGGERED', description: 'Aplikasi diminimalkan (APP_MINIMIZED)' },
        });
      }

      // Create answers for submitted students
      if (status === 'SUBMITTED') {
        const pkgQs = await prisma.examQuestion.findMany({ where: { package_id: pkg.id }, orderBy: { position: 'asc' } });
        const correctAnswers: Record<string, string> = {};
        for (const eq of pkgQs) {
          const correctOpt = await prisma.questionOption.findFirst({ where: { question_id: eq.question_id, is_correct: true } });
          if (correctOpt) correctAnswers[eq.question_id] = correctOpt.content;
        }

        for (const eq of pkgQs) {
          const isCorrect = si % 3 !== 0; // 2/3 correct randomly
          const allOpts = await prisma.questionOption.findMany({ where: { question_id: eq.question_id }, orderBy: { order: 'asc' } });
          const answerText = isCorrect && allOpts.length > 0
            ? (allOpts.find(o => o.is_correct)?.content || allOpts[0]!.content)
            : (allOpts.find(o => !o.is_correct)?.content || '');
          const questionType = allOpts.length > 0 ? (allOpts.length <= 2 ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE') : 'ESSAY';

          await prisma.answer.create({
            data: {
              exam_session_id: session.id,
              question_id: eq.question_id,
              answer_text: answerText,
              is_correct: questionType !== 'ESSAY' ? isCorrect : null,
              score: questionType !== 'ESSAY' ? (isCorrect ? 100 / pkgQs.length : 0) : null,
              answered_at: new Date(now.getTime() - 30 * 60 * 1000 + si * 5 * 60 * 1000),
              synced_at: new Date(),
            },
          });
        }

        // Create score
        const totalQuestions = pkgQs.filter(q => allQuestions.some(aq => aq.id === q.question_id)).length;
        const correctCount = Math.floor(totalQuestions * (si === 0 ? 0.9 : si === 1 ? 0.7 : 0.5));
        await prisma.score.create({
          data: {
            exam_session_id: session.id,
            total_score: Math.round((correctCount / Math.max(totalQuestions, 1)) * 100),
            correct_count: correctCount,
            wrong_count: totalQuestions - correctCount,
            graded_by: null,
            graded_at: status === 'SUBMITTED' ? new Date() : null,
          },
        });

        await prisma.sessionLog.create({
          data: { exam_session_id: session.id, event: 'SESSION_SUBMITTED', description: 'Ujian selesai dikerjakan' },
        });
      }
    }
    logger.log('  5 demo sessions + answers + scores created');

    // ── Final Summary ──────────────────────────────────────
    logger.log('✅ Database seed completed successfully!');
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.log('  🔑 Admin:    admin / admin123');
    logger.log('  🔑 Operator: operator / operator123');
    logger.log('  🔑 Teachers:');
    logger.log('     • 198501012010011001 / teacher123 (Budi S. — Matematika)');
    logger.log('     • 199003152014012002 / teacher123 (Dewi L. — Fisika, Kimia)');
    logger.log('     • 198807202012011003 / teacher123 (Hendra G. — Biologi, BIN)');
    logger.log('  🔑 Students: NIS-based login (e.g., 202501001 / 202501001)');
    logger.log('  📝 Questions: 25 across 3 banks (Math, Physics, Indonesian)');
    logger.log('  📋 Exams: 2 (1 published with demo sessions, 1 draft)');
    logger.log('  🎫 Exam Token: ' + token1);
    logger.log('  📊 Demo Data: 5 exam sessions, answers, and scores for reports');
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
