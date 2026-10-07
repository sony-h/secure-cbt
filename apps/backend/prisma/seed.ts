import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as path from 'path';
import { ensureSeedDiagrams } from './seed-diagrams';

/**
 * Comprehensive seed script for Secure CBT development.
 * Usage: ts-node prisma/seed.ts
 *
 * Creates:
 * - 3 users (admin, operator)
 * - 2 academic years (1 active, 1 archived)
 * - 3 majors (IPA, IPS, Bahasa)
 * - 6 classes (2 per major)
 * - 15 subjects across majors
 * - 4 teachers with realistic names & subjects
 * - 60 students (10 per class) with realistic Indonesian names
 * - 4 question banks with 30 total questions
 * - 5 sample exams: 2 published, 1 draft, 1 ongoing, 1 finished
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
      data: { id: 'global', warning_limit: 3, auto_submit_enabled: true, fullscreen_required: true, lock_task_mode: false, autosave_interval: 5, session_timeout: 30 },
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
      { nip: '199107152018012004', name: 'Siti Rahmawati, S.Pd., M.Pd.', subjects: ['EKO', 'GEO', 'SOS'] },
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

    // ── 10. Question Banks (4) ──────────────────────────────
    logger.log('Generating seed diagram images...');
    const uploadsDir = path.join(process.cwd(), 'storage', 'uploads', 'questions');
    await ensureSeedDiagrams(uploadsDir);
    logger.log('  11 diagram images generated in storage/uploads/questions/');

    logger.log('Creating question banks & questions...');
    const mathMinat = subjects.find(s => s.code === 'MTK-P');
    const fisika = subjects.find(s => s.code === 'FIS');
    const kimia = subjects.find(s => s.code === 'KIM');
    const bio = subjects.find(s => s.code === 'BIO');
    const bin = subjects.find(s => s.code === 'BIN');
    const eko = subjects.find(s => s.code === 'EKO');

    const banks = await Promise.all([
      prisma.questionBank.create({ data: { title: 'Bank Soal UTBK Matematika', subject_id: mathMinat!.id, teacher_id: teachers[0].id } }),
      prisma.questionBank.create({ data: { title: 'Bank Soal Fisika Kelas XII', subject_id: fisika!.id, teacher_id: teachers[1].id } }),
      prisma.questionBank.create({ data: { title: 'Bank Soal Sains & Kimia/Biologi Terpadu', subject_id: kimia!.id, teacher_id: teachers[1].id } }),
      prisma.questionBank.create({ data: { title: 'Bank Soal Ekonomi & Pengetahuan Umum', subject_id: eko!.id, teacher_id: teachers[3].id } }),
    ]);

    // ── 11. Questions (32 total across all 6 question types) ──
    const questionTemplates: {
      bank: number;
      type: string;
      content: string;
      image_url?: string | null;
      options: { text: string; correct: boolean; image_url?: string | null }[];
      difficulty: string;
      explanation?: string | null;
      tags: string[];
    }[] = [
      // ════════════════════════════════════════════════════════
      // ── Bank 0: Matematika Peminatan (10 questions) ──────────
      // ════════════════════════════════════════════════════════
      {
        bank: 0,
        type: 'MULTIPLE_CHOICE',
        difficulty: 'EASY',
        content: 'Bentuk sederhana dari operasi perpangkatan $\\left(\\frac{2^4 \\cdot 3^{-2} \\cdot 5^3}{2^2 \\cdot 3^{-4} \\cdot 5}\\right)^2$ adalah...',
        options: [
          { text: '100', correct: false },
          { text: '2025', correct: false },
          { text: '202500', correct: true },
          { text: '450000', correct: false },
          { text: '625000', correct: false },
        ],
        explanation: 'Langkah penyelesaian:\n$$\\left(\\frac{2^{4-2} \\cdot 3^{-2-(-4)} \\cdot 5^{3-1}}{1}\\right)^2 = (2^2 \\cdot 3^2 \\cdot 5^2)^2 = (450)^2 = 202.500$$',
        tags: ['eksponen', 'aljabar', 'utbk'],
      },
      {
        bank: 0,
        type: 'MULTIPLE_CHOICE',
        difficulty: 'MEDIUM',
        content: 'Hitunglah nilai dari integral tentu fungsi aljabar berikut:\n$$\\int_{0}^{2} (3x^2 - 4x + 5) \\, dx$$',
        options: [
          { text: '10', correct: false },
          { text: '12', correct: false },
          { text: '14', correct: true },
          { text: '16', correct: false },
          { text: '18', correct: false },
        ],
        explanation: 'Antiturunan dari $3x^2 - 4x + 5$ adalah $F(x) = x^3 - 2x^2 + 5x$.\nMaka:\n$$F(2) - F(0) = (2^3 - 2(2)^2 + 5(2)) - 0 = (8 - 8 + 10) = 14$$',
        tags: ['kalkulus', 'integral'],
      },
      {
        bank: 0,
        type: 'MULTIPLE_CHOICE',
        difficulty: 'MEDIUM',
        image_url: '/uploads/questions/stimulus-math-geometry.webp',
        content: 'Perhatikan gambar segitiga siku-siku $ABC$ terlampir. Jika panjang sisi hipotenusa $r = 10\\text{ cm}$ dan besar sudut $\\theta = 30^\\circ$, tentukan luas segitiga $ABC$ tersebut!',
        options: [
          { text: '12,5 cm²', correct: false },
          { text: '21,65 cm²', correct: true },
          { text: '25 cm²', correct: false },
          { text: '43,3 cm²', correct: false },
          { text: '50 cm²', correct: false },
        ],
        explanation: 'Tinggi $y = r \\sin(30^\\circ) = 10 \\cdot 0{,}5 = 5\\text{ cm}$.\nAlas $x = r \\cos(30^\\circ) = 10 \\cdot \\frac{1}{2}\\sqrt{3} = 5\\sqrt{3} \\approx 8{,}66\\text{ cm}$.\nLuas $= \\frac{1}{2} \\cdot x \\cdot y = \\frac{1}{2} \\cdot 5\\sqrt{3} \\cdot 5 = 12{,}5\\sqrt{3} \\approx 21{,}65\\text{ cm}^2$.',
        tags: ['trigonometri', 'geometri', 'gambar'],
      },
      {
        bank: 0,
        type: 'MULTIPLE_CHOICE',
        difficulty: 'HARD',
        content: 'Manakah di antara grafik fungsi kuadrat berikut yang merepresentasikan kurva parabola $f(x) = x^2 - 2x - 3$?',
        options: [
          { text: 'Grafik Parabola A', correct: true, image_url: '/uploads/questions/opt-parabola-a.webp' },
          { text: 'Grafik Parabola B', correct: false, image_url: '/uploads/questions/opt-parabola-b.webp' },
          { text: 'Grafik Parabola C', correct: false, image_url: '/uploads/questions/opt-parabola-c.webp' },
          { text: 'Grafik Parabola D', correct: false, image_url: '/uploads/questions/opt-parabola-d.webp' },
        ],
        explanation: 'Fungsi $f(x) = x^2 - 2x - 3$ memiliki $a = 1 > 0$ (terbuka ke atas).\nTitik puncak $x_p = -\\frac{b}{2a} = 1$, $y_p = 1^2 - 2(1) - 3 = -4$.\nTitik potong sumbu-x: $x = 3$ dan $x = -1$. Grafik A adalah representasi yang tepat.',
        tags: ['fungsi_kuadrat', 'parabola', 'grafik'],
      },
      {
        bank: 0,
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        content: 'Identitas dasar trigonometri $\\sin^2(\\alpha) + \\cos^2(\\alpha) = 1$ berlaku untuk setiap sudut real $\\alpha \\in \\mathbb{R}$.',
        options: [
          { text: 'Benar', correct: true },
          { text: 'Salah', correct: false },
        ],
        explanation: 'Berdasarkan teorema Pythagoras pada lingkaran satuan dengan persamaan $x^2 + y^2 = 1$, identitas ini berlaku universal untuk semua nilai real sudut $\\alpha$.',
        tags: ['trigonometri', 'identitas'],
      },
      {
        bank: 0,
        type: 'MULTI_SELECT',
        difficulty: 'HARD',
        content: 'Diberikan dua matriks persegi $A$ dan $B$ berordo $2 \\times 2$ yang memiliki invers. Manakah sifat-sifat matriks berikut yang BENAR? (Pilih semua yang sesuai)',
        options: [
          { text: 'det(A · B) = det(A) · det(B)', correct: true },
          { text: 'det(Aᵀ) = det(A)', correct: true },
          { text: 'A · B = B · A untuk setiap matriks persegi', correct: false },
          { text: 'det(A⁻¹) = 1 / det(A)', correct: true },
          { text: 'det(k · A) = k · det(A) untuk sembarang skalar k', correct: false },
        ],
        explanation: 'Perkalian matriks tidak bersifat komutatif ($AB \\neq BA$). Pada ordo $2 \\times 2$, $\\det(kA) = k^2 \\det(A)$. Tiga pernyataan lainnya adalah sifat baku determinan matriks.',
        tags: ['matriks', 'aljabar_linear', 'multi_pilih'],
      },
      {
        bank: 0,
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        content: 'Diketahui matriks $A = \\begin{pmatrix} 4 & 2 \\\\ 1 & 5 \\end{pmatrix}$. Tentukan nilai determinan dari matriks $A$!',
        options: [
          { text: '18', correct: true },
          { text: '18.0', correct: true },
          { text: '18 satuan', correct: true },
        ],
        explanation: 'Determinan matriks $2 \\times 2$:\n$$\\det(A) = ad - bc = (4 \\cdot 5) - (2 \\cdot 1) = 20 - 2 = 18$$',
        tags: ['matriks', 'determinan', 'isian_singkat'],
      },
      {
        bank: 0,
        type: 'SHORT_ANSWER',
        difficulty: 'HARD',
        content: 'Hitunglah nilai dari limit trigonometri berikut:\n$$\\lim_{x \\to 0} \\frac{\\sin(6x)}{\\tan(2x)}$$',
        options: [
          { text: '3', correct: true },
          { text: '3.0', correct: true },
        ],
        explanation: 'Menggunakan sifat dasar limit trigonometri $\\lim_{x \\to 0} \\frac{\\sin(ax)}{\\tan(bx)} = \\frac{a}{b} = \\frac{6}{2} = 3$.',
        tags: ['limit', 'trigonometri', 'isian_singkat'],
      },
      {
        bank: 0,
        type: 'MATCHING',
        difficulty: 'MEDIUM',
        content: 'Jodohkan fungsi $f(x)$ di kolom kiri dengan turunan pertamanya $f\'(x)$ di kolom kanan secara tepat:',
        options: [
          { text: JSON.stringify({ left: 'f(x) = x^3 - 4x', right: "f'(x) = 3x^2 - 4" }), correct: true },
          { text: JSON.stringify({ left: 'f(x) = \\sin(2x)', right: "f'(x) = 2\\cos(2x)" }), correct: true },
          { text: JSON.stringify({ left: 'f(x) = \\ln(x)', right: "f'(x) = \\frac{1}{x}" }), correct: true },
          { text: JSON.stringify({ left: 'f(x) = e^{3x}', right: "f'(x) = 3e^{3x}" }), correct: true },
        ],
        explanation: 'Aturan turunan baku: $(x^n)\' = n x^{n-1}$, $(\\sin ax)\' = a\\cos ax$, $(\\ln x)\' = 1/x$, dan $(e^{ax})\' = a e^{ax}$.',
        tags: ['kalkulus', 'turunan', 'menjodohkan'],
      },
      {
        bank: 0,
        type: 'ESSAY',
        difficulty: 'HARD',
        content: 'Tentukan himpunan penyelesaian dari pertidaksamaan rasional berikut:\n$$\\frac{x^2 - 5x + 6}{x - 1} \\le 0$$\nTuliskan langkah faktorisasi pembilang, pembuat nol fungsi, syarat penyebut, dan interval garis bilangannya secara lengkap!',
        options: [],
        explanation: 'Langkah Penyelesaian:\n1. Faktorkan pembilang: $x^2 - 5x + 6 = (x - 2)(x - 3)$.\n2. Pertidaksamaan: $\\frac{(x - 2)(x - 3)}{x - 1} \\le 0$.\n3. Pembuat nol: $x = 2$, $x = 3$, dan $x = 1$.\n4. Syarat penyebut: $x \\neq 1$.\n5. Garis bilangan: uji titik interval menghasilkan daerah negatif pada $x < 1$ atau $2 \\le x \\le 3$.\nHimpunan Penyelesaian: $HP = \\{x \\mid x < 1 \\text{ atau } 2 \\le x \\le 3, x \\in \\mathbb{R}\\}$.',
        tags: ['aljabar', 'pertidaksamaan', 'esai'],
      },

      // ════════════════════════════════════════════════════════
      // ── Bank 1: Fisika Kelas XII (8 questions) ──────────────
      // ════════════════════════════════════════════════════════
      {
        bank: 1,
        type: 'MULTIPLE_CHOICE',
        difficulty: 'MEDIUM',
        content: 'Dua buah muatan titik $q_1 = +2\\,\\mu\\text{C}$ dan $q_2 = -8\\,\\mu\\text{C}$ terpisah sejauh $r = 20\\text{ cm}$. Jika konstanta elektrostatika $k = 9 \\times 10^9\\,\\text{N}\\cdot\\text{m}^2/\\text{C}^2$, besar gaya Coulomb yang terjadi adalah...',
        options: [
          { text: '1,8 N', correct: false },
          { text: '3,6 N', correct: true },
          { text: '7,2 N', correct: false },
          { text: '18 N', correct: false },
          { text: '36 N', correct: false },
        ],
        explanation: 'Hukum Coulomb:\n$$F = k \\frac{|q_1 q_2|}{r^2} = 9 \\times 10^9 \\cdot \\frac{(2 \\times 10^{-6})(8 \\times 10^{-6})}{(0{,}2)^2} = \\frac{144 \times 10^{-3}}{0{,}04} = 3{,}6\\text{ N}$$',
        tags: ['listrik_statis', 'coulomb'],
      },
      {
        bank: 1,
        type: 'MULTIPLE_CHOICE',
        difficulty: 'MEDIUM',
        image_url: '/uploads/questions/stimulus-physics-circuit.webp',
        content: 'Perhatikan skema rangkaian listrik pada gambar terlampir. Jika $R_1 = 4\\,\\Omega$, $R_2 = 6\\,\\Omega$, dan $R_3 = 12\\,\\Omega$ dihubungkan ke sumber tegangan $V = 24\\text{ V}$, hitunglah kuat arus total $I$ yang mengalir pada rangkaian!',
        options: [
          { text: '1,5 A', correct: false },
          { text: '2,0 A', correct: false },
          { text: '3,0 A', correct: true },
          { text: '4,0 A', correct: false },
        ],
        explanation: 'Hambatan paralel $R_2$ dan $R_3$:\n$$\\frac{1}{R_p} = \\frac{1}{6} + \\frac{1}{12} = \\frac{3}{12} \\implies R_p = 4\\,\\Omega$$\nHambatan total seri $R_{tot} = R_1 + R_p = 4 + 4 = 8\\,\\Omega$.\nKuat arus total $I = \\frac{V}{R_{tot}} = \\frac{24}{8} = 3\\text{ A}$.',
        tags: ['listrik_dinamis', 'rangkaian', 'gambar'],
      },
      {
        bank: 1,
        type: 'MULTIPLE_CHOICE',
        difficulty: 'MEDIUM',
        image_url: '/uploads/questions/stimulus-physics-vt-graph.webp',
        content: 'Berdasarkan grafik kecepatan terhadap waktu ($v-t$) terlampir, tentukan jarak total yang ditempuh benda dari waktu $t = 0\\text{ s}$ sampai $t = 10\\text{ s}$!',
        options: [
          { text: '110 m', correct: false },
          { text: '140 m', correct: true },
          { text: '160 m', correct: false },
          { text: '200 m', correct: false },
        ],
        explanation: 'Jarak tempuh adalah luas trapesium di bawah grafik $v-t$:\n$$s = \\frac{\\text{sisi sejajar atas} + \\text{sisi sejajar bawah}}{2} \\times \\text{tinggi} = \\frac{(7 - 3) + 10}{2} \\times 20 = \\frac{4 + 10}{2} \\times 20 = 140\\text{ m}$$',
        tags: ['kinematika', 'grafik', 'glb_glbb'],
      },
      {
        bank: 1,
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        content: 'Pada suhu konstan, kuat arus listrik yang mengalir melalui suatu konduktor berbanding lurus dengan beda potensial pada kedua ujungnya (Hukum Ohm: $V = I \\cdot R$).',
        options: [
          { text: 'Benar', correct: true },
          { text: 'Salah', correct: false },
        ],
        explanation: 'Pernyataan tersebut tepat sesuai bunyi Hukum Ohm yang dirumuskan oleh Georg Simon Ohm pada tahun 1827.',
        tags: ['listrik', 'hukum_ohm'],
      },
      {
        bank: 1,
        type: 'MULTI_SELECT',
        difficulty: 'HARD',
        content: 'Manakah dari spektrum gelombang berikut yang termasuk dalam kelompok gelombang elektromagnetik? (Pilih semua yang benar)',
        options: [
          { text: 'Gelombang Radio & Televisi', correct: true },
          { text: 'Gelombang Bunyi / Suara Ultrasonik', correct: false },
          { text: 'Radiasi Inframerah', correct: true },
          { text: 'Sinar-X (Rontgen)', correct: true },
          { text: 'Gelombang Air Laut', correct: false },
        ],
        explanation: 'Gelombang elektromagnetik dapat merambat tanpa medium perantara (ruang hampa), meliputi radio, mikro, inframerah, cahaya tampak, ultraviolet, sinar-X, dan sinar gamma. Gelombang bunyi dan air adalah gelombang mekanik.',
        tags: ['gelombang', 'elektromagnetik', 'multi_pilih'],
      },
      {
        bank: 1,
        type: 'SHORT_ANSWER',
        difficulty: 'HARD',
        content: 'Sebuah mobil ambulans bergerak dengan kecepatan $v_s = 20\\text{ m/s}$ membunyikan sirine berfrekuensi $f_s = 680\\text{ Hz}$ mendekati pendengar yang diam di tepi jalan. Jika cepat rambat bunyi di udara $v = 340\\text{ m/s}$, hitunglah frekuensi bunyi yang didengar oleh pendengar! (dalam satuan Hz)',
        options: [
          { text: '722.5', correct: true },
          { text: '722,5', correct: true },
          { text: '722.5 Hz', correct: true },
          { text: '723', correct: true },
        ],
        explanation: 'Rumus Efek Doppler:\n$$f_p = \\left(\\frac{v \\pm v_p}{v \\pm v_s}\\right) f_s = \\left(\\frac{340}{340 - 20}\\right) 680 = \\frac{340}{320} \\times 680 = 722{,}5\\text{ Hz}$$',
        tags: ['gelombang_bunyi', 'efek_doppler', 'isian_singkat'],
      },
      {
        bank: 1,
        type: 'MATCHING',
        difficulty: 'MEDIUM',
        content: 'Pasangkan hukum fisika dan konsep mekanika di sebelah kiri dengan persamaan matematisnya yang tepat di sebelah kanan:',
        options: [
          { text: JSON.stringify({ left: 'Hukum II Newton', right: '\\Sigma F = m \\cdot a' }), correct: true },
          { text: JSON.stringify({ left: 'Hukum Gravitasi Universal', right: 'F = G \\frac{m_1 m_2}{r^2}' }), correct: true },
          { text: JSON.stringify({ left: 'Energi Kinetik Benda', right: 'E_k = \\frac{1}{2} m v^2' }), correct: true },
          { text: JSON.stringify({ left: 'Energi Potensial Pegas', right: 'E_p = \\frac{1}{2} k \\Delta x^2' }), correct: true },
        ],
        explanation: 'Pasangan rumus baku fisika mekanika klasik.',
        tags: ['mekanika', 'hukum_newton', 'menjodohkan'],
      },
      {
        bank: 1,
        type: 'ESSAY',
        difficulty: 'HARD',
        content: 'Tuliskan persamaan kesetaraan massa-energi Einstein $E = mc^2$ dan jelaskan konsep dilatasi waktu $\\Delta t = \\frac{\\Delta t_0}{\\sqrt{1 - \\frac{v^2}{c^2}}}$ pada kerangka acuan yang bergerak mendekati kecepatan cahaya!',
        options: [],
        explanation: 'Pembahasan:\n1. Kesetaraan massa-energi: $E = mc^2$ menyatakan bahwa massa dapat dikonversi menjadi energi dan sebaliknya.\n2. Dilatasi waktu: Waktu berjalan lebih lambat bagi pengamat yang bergerak relatif terhadap pengamat yang diam. Ketika $v \\to c$, penyebut $\\sqrt{1 - v^2/c^2} \\to 0$, menyebabkan $\\Delta t \\to \\infty$.',
        tags: ['relativitas', 'modern', 'esai'],
      },

      // ════════════════════════════════════════════════════════
      // ── Bank 2: Sains & Kimia/Biologi Terpadu (7 questions) ─
      // ════════════════════════════════════════════════════════
      {
        bank: 2,
        type: 'MULTIPLE_CHOICE',
        difficulty: 'MEDIUM',
        image_url: '/uploads/questions/stimulus-chemistry-volta.webp',
        content: 'Perhatikan diagram sel elektrokimia Volta terlampir. Pada sel tersebut, elektroda Seng (Zn) bertindak sebagai anoda dan Tembaga (Cu) sebagai katoda. Reaksi setengah sel yang berlangsung pada anoda adalah...',
        options: [
          { text: 'Zn(s) → Zn²⁺(aq) + 2e⁻', correct: true },
          { text: 'Cu²⁺(aq) + 2e⁻ → Cu(s)', correct: false },
          { text: 'Zn²⁺(aq) + 2e⁻ → Zn(s)', correct: false },
          { text: 'Cu(s) → Cu²⁺(aq) + 2e⁻', correct: false },
        ],
        explanation: 'Pada anoda selalu terjadi reaksi oksidasi (pelepasan elektron): $\\text{Zn}(s) \\rightarrow \\text{Zn}^{2+}(aq) + 2e^-$. Pada katoda terjadi reduksi: $\\text{Cu}^{2+}(aq) + 2e^- \\rightarrow \\text{Cu}(s)$.',
        tags: ['elektrokimia', 'sel_volta', 'kimia', 'gambar'],
      },
      {
        bank: 2,
        type: 'MULTIPLE_CHOICE',
        difficulty: 'EASY',
        image_url: '/uploads/questions/stimulus-biology-cell.webp',
        content: 'Perhatikan gambar mikroskop sel tumbuhan terlampir. Organel sel bermembran ganda yang ditunjukkan oleh penunjuk nomor (2) berfungsi sebagai tempat terjadinya...',
        options: [
          { text: 'Sintesis protein', correct: false },
          { text: 'Fotosintesis menghasilkan glukosa', correct: true },
          { text: 'Respirasi seluler dan pembentukan ATP', correct: false },
          { text: 'Pencernaan intraseluler', correct: false },
        ],
        explanation: 'Nomor (2) menunjukkan kloroplas (chloroplast) yang mengandung pigmen klorofil dan berfungsi menangkap energi cahaya matahari untuk proses fotosintesis.',
        tags: ['biologi', 'organel_sel', 'gambar'],
      },
      {
        bank: 2,
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        content: 'Persamaan termokimia pembakaran gas metana $\\text{CH}_4(g) + 2\\text{O}_2(g) \\rightarrow \\text{CO}_2(g) + 2\\text{H}_2\\text{O}(l)$ memiliki perubahan entalpi $\\Delta H = -890\\text{ kJ}$. Nilai $\\Delta H$ negatif menandakan reaksi berlangsung secara endoterm.',
        options: [
          { text: 'Benar', correct: false },
          { text: 'Salah', correct: true },
        ],
        explanation: 'Nilai $\\Delta H$ negatif menandakan sistem melepaskan kalor ke lingkungan, yang merupakan ciri khas reaksi EKSOTERM, bukan endoterm.',
        tags: ['termokimia', 'entalpi', 'kimia'],
      },
      {
        bank: 2,
        type: 'MULTI_SELECT',
        difficulty: 'MEDIUM',
        content: 'Manakah dari pernyataan-pernyataan berikut yang BENAR mengenai konsep reaksi reduksi-oksidasi (redoks)? (Pilih semua yang sesuai)',
        options: [
          { text: 'Oksidasi adalah peristiwa pelepasan elektron', correct: true },
          { text: 'Reduksi adalah peristiwa penurunan bilangan oksidasi (biloks)', correct: true },
          { text: 'Zat reduktor adalah zat yang mengalami reduksi', correct: false },
          { text: 'Oksidator adalah spesi yang mengoksidasi zat lain', correct: true },
        ],
        explanation: 'Reduktor adalah zat yang mereduksi zat lain sehingga dirinya sendiri mengalami OKSIDASI. Pernyataan 1, 2, dan 4 bernilai benar.',
        tags: ['redoks', 'biloks', 'kimia', 'multi_pilih'],
      },
      {
        bank: 2,
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        content: 'Berapakah nilai $\\text{pH}$ dari larutan asam klorida ($\\text{HCl}$) kuat dengan konsentrasi $0{,}001\\text{ M}$?',
        options: [
          { text: '3', correct: true },
          { text: '3.0', correct: true },
          { text: 'pH 3', correct: true },
        ],
        explanation: 'Asam kuat $\\text{HCl}$ terionisasi sempurna: $[\\text{H}^+] = 1 \\times 10^{-3}\\text{ M}$.\nMaka $\\text{pH} = -\\log[\\text{H}^+] = -\\log(10^{-3}) = 3$.',
        tags: ['asam_basa', 'ph', 'kimia', 'isian_singkat'],
      },
      {
        bank: 2,
        type: 'MATCHING',
        difficulty: 'EASY',
        content: 'Jodohkan rumus kimia senyawa anorganik di kolom kiri dengan nama ilmiah resminya di kolom kanan:',
        options: [
          { text: JSON.stringify({ left: '\\text{H}_2\\text{SO}_4', right: 'Asam Sulfat' }), correct: true },
          { text: JSON.stringify({ left: '\\text{NaCl}', right: 'Natrium Klorida' }), correct: true },
          { text: JSON.stringify({ left: '\\text{CaCO}_3', right: 'Kalsium Karbonat' }), correct: true },
          { text: JSON.stringify({ left: '\\text{CH}_3\\text{COOH}', right: 'Asam Asetat (Cuka)' }), correct: true },
        ],
        explanation: 'Tata nama senyawa anorganik dan organik sederhana sesuai standar IUPAC.',
        tags: ['tata_nama', 'senyawa', 'menjodohkan'],
      },
      {
        bank: 2,
        type: 'ESSAY',
        difficulty: 'HARD',
        content: 'Setarakan persamaan reaksi redoks berikut menggunakan metode setengah reaksi dalam suasana asam:\n$$\\text{MnO}_4^- + \\text{Fe}^{2+} \\rightarrow \\text{Mn}^{2+} + \\text{Fe}^{3+}$$\nTuliskan reaksi reduksi, reaksi oksidasi, dan persamaan ion bersihnya secara sistematis!',
        options: [],
        explanation: 'Langkah Penyetaraan:\n1. Reduksi: $\\text{MnO}_4^- + 8\\text{H}^+ + 5e^- \\rightarrow \\text{Mn}^{2+} + 4\\text{H}_2\\text{O}$.\n2. Oksidasi: $\\text{Fe}^{2+} \\rightarrow \\text{Fe}^{3+} + e^-$ (dikalikan 5).\n3. Reaksi Bersih: $\\text{MnO}_4^- + 5\\text{Fe}^{2+} + 8\\text{H}^+ \\rightarrow \\text{Mn}^{2+} + 5\\text{Fe}^{3+} + 4\\text{H}_2\\text{O}$.',
        tags: ['redoks', 'reaksi_kimia', 'esai'],
      },

      // ════════════════════════════════════════════════════════
      // ── Bank 3: Ekonomi & Pengetahuan Umum (7 questions) ────
      // ════════════════════════════════════════════════════════
      {
        bank: 3,
        type: 'MULTIPLE_CHOICE',
        difficulty: 'MEDIUM',
        image_url: '/uploads/questions/stimulus-economics-curve.webp',
        content: 'Perhatikan kurva ekuilibrium pasar terlampir. Jika terjadi kenaikan biaya produksi yang mengakibatkan kurva penawaran bergeser ke kiri dari $S_0$ ke $S_1$, maka dampak terhadap harga keseimbangan ($P$) dan jumlah keseimbangan ($Q$) adalah...',
        options: [
          { text: 'Harga naik dan kuantitas turun', correct: true },
          { text: 'Harga turun dan kuantitas naik', correct: false },
          { text: 'Harga dan kuantitas sama-sama naik', correct: false },
          { text: 'Harga dan kuantitas sama-sama turun', correct: false },
        ],
        explanation: 'Ketika kurva penawaran bergeser ke kiri atas (berkurang) sementara kurva permintaan tetap, titik ekuilibrium baru $E_1$ terbentuk pada tingkat harga yang lebih tinggi ($P_1 > P_0$) dan kuantitas yang lebih rendah ($Q_1 < Q_0$).',
        tags: ['permintaan_penawaran', 'ekuilibrium', 'kurva', 'gambar'],
      },
      {
        bank: 3,
        type: 'MULTIPLE_CHOICE',
        difficulty: 'EASY',
        content: 'Jika koefisien elastisitas permintaan suatu barang adalah $E_d = 1{,}8$ ($E_d > 1$), maka sifat elastisitas permintaan barang tersebut adalah...',
        options: [
          { text: 'Inelastis', correct: false },
          { text: 'Elastis', correct: true },
          { text: 'Elastis Uniter', correct: false },
          { text: 'Inelastis Sempurna', correct: false },
        ],
        explanation: 'Jika $E_d > 1$, persentase perubahan jumlah barang yang diminta lebih besar daripada persentase perubahan harga, sehingga sifatnya adalah elastis.',
        tags: ['elastisitas', 'mikroekonomi'],
      },
      {
        bank: 3,
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        content: 'Bank sentral (Bank Indonesia) menaikkan suku bunga acuan (BI Rate) dengan tujuan untuk meredam laju inflasi melalui penyerapan likuiditas uang beredar.',
        options: [
          { text: 'Benar', correct: true },
          { text: 'Salah', correct: false },
        ],
        explanation: 'Kenaikan suku bunga acuan merupakan instrumen kebijakan moneter kontraktif untuk mengerem laju inflasi dengan mendorong masyarakat menabung dan menurunkan konsumsi.',
        tags: ['kebijakan_moneter', 'bank_sentral'],
      },
      {
        bank: 3,
        type: 'MULTI_SELECT',
        difficulty: 'MEDIUM',
        content: 'Manakah instrumen-instrumen keuangan berikut yang diperjualbelikan di pasar modal (capital market)? (Pilih semua yang benar)',
        options: [
          { text: 'Saham Perusahaan Publik', correct: true },
          { text: 'Obligasi Korporasi / Surat Utang Negara', correct: true },
          { text: 'Sertifikat Bank Indonesia (SBI Pasar Uang)', correct: false },
          { text: 'Reksadana (Mutual Funds)', correct: true },
          { text: 'Call Money antar-bank', correct: false },
        ],
        explanation: 'Pasar modal memperjualbelikan instrumen jangka panjang (> 1 tahun) seperti saham, obligasi, dan reksadana. SBI dan Call Money adalah instrumen pasar uang jangka pendek.',
        tags: ['pasar_modal', 'keuangan', 'multi_pilih'],
      },
      {
        bank: 3,
        type: 'SHORT_ANSWER',
        difficulty: 'EASY',
        content: 'Ibukota negara Indonesia yang baru yang berlokasi di Kabupaten Penajam Paser Utara, Kalimantan Timur bernama...',
        options: [
          { text: 'Nusantara', correct: true },
          { text: 'IKN', correct: true },
          { text: 'Ibu Kota Nusantara', correct: true },
          { text: 'IKN Nusantara', correct: true },
        ],
        explanation: 'Berdasarkan Undang-Undang Nomor 3 Tahun 2022, Ibukota Negara Indonesia diberi nama Nusantara.',
        tags: ['pengetahuan_umum', 'geografi', 'isian_singkat'],
      },
      {
        bank: 3,
        type: 'MATCHING',
        difficulty: 'MEDIUM',
        content: 'Jodohkan tokoh pelopor teori ekonomi di kolom kiri dengan karya / konsep pemikirannya di kolom kanan:',
        options: [
          { text: JSON.stringify({ left: 'Adam Smith', right: 'Teori Pasar Bebas & Tangan Tak Terlihat' }), correct: true },
          { text: JSON.stringify({ left: 'John Maynard Keynes', right: 'Teori Intervensi Fiskal & Makroekonomi' }), correct: true },
          { text: JSON.stringify({ left: 'David Ricardo', right: 'Teori Keunggulan Komparatif Perdagangan' }), correct: true },
          { text: JSON.stringify({ left: 'Thomas Robert Malthus', right: 'Teori Deret Ukur Pertumbuhan Populasi' }), correct: true },
        ],
        explanation: 'Tokoh-tokoh sejarah pemikiran ekonomi klasik dan modern.',
        tags: ['sejarah_ekonomi', 'tokoh', 'menjodohkan'],
      },
      {
        bank: 3,
        type: 'ESSAY',
        difficulty: 'HARD',
        content: 'Jelaskan bagaimana inflasi yang tinggi dapat menurunkan daya beli masyarakat berpenghasilan tetap serta kebijakan fiskal apa saja yang dapat diambil pemerintah untuk menstabilkannya!',
        options: [],
        explanation: 'Pembahasan:\n1. Dampak terhadap daya beli: Inflasi menaikkan harga barang/jasa secara umum. Dengan pendapatan nominal tetap, nilai riil uang turun drastis sehingga kemampuan konsumsi menurun.\n2. Kebijakan fiskal pemerintah: Pengurangan belanja negara yang bersifat non-prioritas, penyesuaian tarif pajak, dan pemberian bantuan sosial tunai/subsidi pangan terarah untuk menjaga daya beli kelompok rentan.',
        tags: ['makroekonomi', 'inflasi', 'esai'],
      },
    ];

    const allQuestions: any[] = [];
    for (let qi = 0; qi < questionTemplates.length; qi++) {
      const t = questionTemplates[qi]!;
      const question = await prisma.question.create({
        data: {
          question_bank_id: banks[t.bank]!.id,
          type: t.type as any,
          content: t.content,
          image_url: t.image_url || null,
          difficulty: t.difficulty as any,
          explanation: t.explanation || null,
        },
      });
      allQuestions.push(question);

      if (t.options.length > 0) {
        await prisma.questionOption.createMany({
          data: t.options.map((opt, idx) => ({
            question_id: question.id,
            content: opt.text,
            image_url: opt.image_url || null,
            is_correct: opt.correct,
            order: idx + 1,
          })),
        });
      }
      if (t.tags.length > 0) {
        await prisma.questionTag.createMany({
          data: t.tags.map((tag) => ({ question_id: question.id, tag })),
        });
      }
    }
    logger.log(`  32 questions created across 4 banks covering all 6 question types`);

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
    const ipsClasses = classes.filter(c => c.major_id === majorIPS.id);
    const bahClasses = classes.filter(c => c.major_id === majorBAH.id);
    const ipaStudents = allStudents.filter(s => classes.find(c => c.id === s.class_id)?.major_id === majorIPA.id);
    const ipsStudents = allStudents.filter(s => classes.find(c => c.id === s.class_id)?.major_id === majorIPS.id);
    const bahStudents = allStudents.filter(s => classes.find(c => c.id === s.class_id)?.major_id === majorBAH.id);
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
        status: 'PUBLISHED',
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
    logger.log('  Ulangan Harian Fisika (PUBLISHED — upcoming, IPA)');

    // ── Exam 3: UTS Ekonomi — PASSED (IPS) ────────────────────
    const ekonomiQuestions = allQuestions.slice(25, 32);
    const token3 = randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
    const exam3 = await prisma.exam.create({
      data: {
        title: 'UTS Ekonomi — Pasar & Inflasi',
        description: 'Ujian Tengah Semester Ekonomi. Materi: Kegiatan Ekonomi, Permintaan & Penawaran, Inflasi, Pasar Modal.',
        subject_id: eko!.id,
        teacher_id: teachers[3].id,
        duration_minutes: 60,
        status: 'FINISHED',
        start_at: new Date(now.getTime() - 14 * 24 * 3600 * 1000),  // 14 days ago
        end_at: new Date(now.getTime() - 2 * 24 * 3600 * 1000),     // 2 days ago (passed)
        randomize_questions: true,
        randomize_answers: true,
        warning_limit: 3,
        auto_submit_enabled: true,
        fullscreen_required: true,
        package_count: 1,
      },
    });
    await prisma.examClass.createMany({
      data: ipsClasses.map(c => ({ exam_id: exam3.id, class_id: c.id })),
    });
    const pkg3 = await prisma.examPackage.create({ data: { exam_id: exam3.id, name: 'A' } });
    for (let i = 0; i < ekonomiQuestions.length; i++) {
      await prisma.examQuestion.create({ data: { exam_id: exam3.id, question_id: ekonomiQuestions[i].id, position: i + 1, package_id: pkg3.id } });
    }
    await prisma.examToken.create({ data: { exam_id: exam3.id, token: token3, expires_at: new Date(now.getTime() - 3 * 24 * 3600 * 1000) } }); // expired
    logger.log(`  UTS Ekonomi (FINISHED) — ${ipsStudents.length} IPS students completed`);

    // All IPS students have completed Exam 3
    for (let si = 0; si < ipsStudents.length; si++) {
      const s = ipsStudents[si];
      const session3 = await prisma.examSession.create({
        data: {
          exam_id: exam3.id,
          student_id: s.id,
          package_id: pkg3.id,
          status: 'SUBMITTED',
          started_at: new Date(now.getTime() - 10 * 24 * 3600 * 1000 - si * 3600 * 1000),
          submitted_at: new Date(now.getTime() - 9 * 24 * 3600 * 1000 - si * 3600 * 1000),
          remaining_time_seconds: 0,
          device_id: `economy-device-${si}`,
        },
      });
      await prisma.sessionLog.create({
        data: { exam_session_id: session3.id, event: 'SESSION_STARTED', description: `Siswa ${s.full_name} memulai ujian Ekonomi` },
      });
      const correctCount3 = 3 + (si % 3); // 3, 4, or 5 correct
      await prisma.score.create({
        data: {
          exam_session_id: session3.id,
          total_score: Math.round((correctCount3 / ekonomiQuestions.length) * 100),
          correct_count: correctCount3,
          wrong_count: ekonomiQuestions.length - correctCount3,
          graded_by: null,
          graded_at: new Date(),
        },
      });
      // Create answer rows consistent with the recorded score (first N correct, rest wrong)
      const ekoPkgQs = await prisma.examQuestion.findMany({
        where: { package_id: pkg3.id },
        orderBy: { position: 'asc' },
      });
      for (let qi = 0; qi < ekoPkgQs.length; qi++) {
        const eq = ekoPkgQs[qi]!;
        const isCorrect = qi < correctCount3;
        const allOpts = await prisma.questionOption.findMany({ where: { question_id: eq.question_id }, orderBy: { order: 'asc' } });
        const question = await prisma.question.findUnique({ where: { id: eq.question_id } });
        const qType = question?.type || 'MULTIPLE_CHOICE';

        let answerText = '';
        let score: number | null = null;
        let answerCorrect: boolean | null = null;

        if (qType === 'ESSAY') {
          answerText = 'Jawaban analisis esai terperinci oleh siswa.';
        } else if (qType === 'SHORT_ANSWER') {
          const accepted = allOpts.filter(o => o.is_correct);
          answerText = isCorrect && accepted.length > 0 ? accepted[0]!.content : 'jawaban lain';
          answerCorrect = isCorrect;
          score = isCorrect ? 100 : 0;
        } else if (qType === 'MATCHING') {
          const matches: Record<string, string> = {};
          for (let oi = 0; oi < allOpts.length; oi++) {
            const opt = allOpts[oi]!;
            if (isCorrect || oi === 0) {
              matches[opt.id] = opt.id;
            } else {
              matches[opt.id] = allOpts[(oi + 1) % allOpts.length]!.id;
            }
          }
          answerText = JSON.stringify(matches);
          const correctPairs = isCorrect ? allOpts.length : 1;
          score = Math.round((correctPairs / allOpts.length) * 100);
          answerCorrect = score === 100;
        } else if (qType === 'MULTI_SELECT') {
          const correctOpts = allOpts.filter(o => o.is_correct);
          answerText = isCorrect ? correctOpts.map(o => o.id).join(',') : (allOpts[0]?.id || '');
          answerCorrect = isCorrect;
          score = isCorrect ? 100 : 0;
        } else {
          // MULTIPLE_CHOICE or TRUE_FALSE
          const correctOpt = allOpts.find(o => o.is_correct);
          const wrongOpt = allOpts.find(o => !o.is_correct);
          answerText = isCorrect && correctOpt ? correctOpt.id : (wrongOpt?.id || allOpts[0]?.id || '');
          answerCorrect = isCorrect;
          score = isCorrect ? 100 : 0;
        }

        await prisma.answer.create({
          data: {
            exam_session_id: session3.id,
            question_id: eq.question_id,
            answer_text: answerText,
            is_correct: answerCorrect,
            score: score,
            answered_at: new Date(now.getTime() - 10 * 24 * 3600 * 1000 - si * 3600 * 1000 + qi * 60 * 1000),
            synced_at: new Date(),
          },
        });
      }
      await prisma.sessionLog.create({
        data: { exam_session_id: session3.id, event: 'SESSION_SUBMITTED', description: 'Ujian Ekonomi selesai dikerjakan' },
      });
    }

    // ── Exam 4: Bahasa Jepang — ONGOING (BAH) ─────────────────
    const bjepangQuestions = allQuestions.slice(18, 23); // 5 BIN questions as placeholder
    const token4 = randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
    const exam4 = await prisma.exam.create({
      data: {
        title: 'Latihan Bahasa Jepang — Huruf Hiragana',
        description: 'Latihan membaca dan menulis huruf Hiragana dasar. Materi: a, i, u, e, o, ka, ki, ku, ke, ko.',
        subject_id: subjects.find(s => s.code === 'BJE')!.id,
        teacher_id: teachers[2].id,
        duration_minutes: 30,
        status: 'ONGOING',
        start_at: new Date(now.getTime() - 1 * 3600 * 1000),   // 1 hour ago
        end_at: new Date(now.getTime() + 1 * 3600 * 1000),      // 1 hour from now
        randomize_questions: true,
        randomize_answers: true,
        warning_limit: 3,
        auto_submit_enabled: true,
        fullscreen_required: true,
        package_count: 1,
      },
    });
    await prisma.examClass.createMany({
      data: bahClasses.map(c => ({ exam_id: exam4.id, class_id: c.id })),
    });
    const pkg4 = await prisma.examPackage.create({ data: { exam_id: exam4.id, name: 'A' } });
    for (let i = 0; i < bjepangQuestions.length; i++) {
      await prisma.examQuestion.create({ data: { exam_id: exam4.id, question_id: bjepangQuestions[i].id, position: i + 1, package_id: pkg4.id } });
    }
    await prisma.examToken.create({ data: { exam_id: exam4.id, token: token4, expires_at: new Date(now.getTime() + 3 * 24 * 3600 * 1000) } });
    logger.log(`  Latihan Bahasa Jepang (ONGOING) — Token: ${token4}`);

    // 2 BAH students with ACTIVE sessions
    for (let si = 0; si < Math.min(2, bahStudents.length); si++) {
      const s = bahStudents[si];
      const session4 = await prisma.examSession.create({
        data: {
          exam_id: exam4.id,
          student_id: s.id,
          package_id: pkg4.id,
          status: 'ACTIVE',
          started_at: new Date(now.getTime() - 10 * 60 * 1000),
          submitted_at: null,
          remaining_time_seconds: 1200,
          device_id: `japanese-device-${si}`,
        },
      });
      await prisma.sessionLog.create({
        data: { exam_session_id: session4.id, event: 'SESSION_STARTED', description: `Siswa ${s.full_name} memulai ujian Bahasa Jepang` },
      });
    }

    // ── Exam 5: Tryout PKN — UPCOMING (All Classes) ──────────
    const pknQuestions = allQuestions.slice(23, 28); // last 2 BIN + first 3 Ekonomi
    const exam5 = await prisma.exam.create({
      data: {
        title: 'Tryout Nasional PKN — Pancasila & UUD 1945',
        description: 'Tryout persiapan ujian nasional. Materi: Pancasila, UUD 1945, Hak & Kewajiban Warga Negara, Sistem Pemerintahan.',
        subject_id: subjects.find(s => s.code === 'PKN')!.id,
        teacher_id: teachers[2].id,
        duration_minutes: 45,
        status: 'PUBLISHED',
        start_at: new Date(now.getTime() + 7 * 24 * 3600 * 1000),   // 7 days from now (upcoming)
        end_at: new Date(now.getTime() + 37 * 24 * 3600 * 1000),     // 37 days from now
        randomize_questions: true,
        randomize_answers: true,
        warning_limit: 3,
        auto_submit_enabled: true,
        fullscreen_required: true,
        package_count: 1,
      },
    });
    await prisma.examClass.createMany({
      data: classes.map(c => ({ exam_id: exam5.id, class_id: c.id })), // ALL classes
    });
    const pkg5 = await prisma.examPackage.create({ data: { exam_id: exam5.id, name: 'A' } });
    for (let i = 0; i < pknQuestions.length; i++) {
      await prisma.examQuestion.create({ data: { exam_id: exam5.id, question_id: pknQuestions[i].id, position: i + 1, package_id: pkg5.id } });
    }
    logger.log('  Tryout PKN (PUBLISHED — upcoming, all classes)');

    // ── 13. Exam Sessions & Answers (for monitoring/reports demo) ──
    logger.log('Creating demo exam sessions & answers...');
    const demoStudents = ipaStudents.slice(0, 5); // 5 IPA students for demo

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
          const question = await prisma.question.findUnique({ where: { id: eq.question_id } });
          const qType = question?.type || 'MULTIPLE_CHOICE';

          let answerText = '';
          let score: number | null = null;
          let answerCorrect: boolean | null = null;

          if (qType === 'ESSAY') {
            answerText = 'Jawaban analisis esai terperinci oleh siswa.';
            score = null;
            answerCorrect = null;
          } else if (qType === 'SHORT_ANSWER') {
            const accepted = allOpts.filter(o => o.is_correct);
            answerText = isCorrect && accepted.length > 0 ? accepted[0]!.content : 'jawaban lain';
            answerCorrect = isCorrect;
            score = isCorrect ? 100 : 0;
          } else if (qType === 'MATCHING') {
            const matches: Record<string, string> = {};
            for (let oi = 0; oi < allOpts.length; oi++) {
              const opt = allOpts[oi]!;
              if (isCorrect || oi === 0) {
                matches[opt.id] = opt.id;
              } else {
                matches[opt.id] = allOpts[(oi + 1) % allOpts.length]!.id;
              }
            }
            answerText = JSON.stringify(matches);
            const correctPairs = isCorrect ? allOpts.length : 1;
            score = Math.round((correctPairs / allOpts.length) * 100);
            answerCorrect = score === 100;
          } else if (qType === 'MULTI_SELECT') {
            const correctOpts = allOpts.filter(o => o.is_correct);
            answerText = isCorrect ? correctOpts.map(o => o.id).join(',') : (allOpts[0]?.id || '');
            answerCorrect = isCorrect;
            score = isCorrect ? 100 : 0;
          } else {
            // MULTIPLE_CHOICE or TRUE_FALSE
            const correctOpt = allOpts.find(o => o.is_correct);
            const wrongOpt = allOpts.find(o => !o.is_correct);
            answerText = isCorrect && correctOpt ? correctOpt.id : (wrongOpt?.id || allOpts[0]?.id || '');
            answerCorrect = isCorrect;
            score = isCorrect ? 100 : 0;
          }

          await prisma.answer.create({
            data: {
              exam_session_id: session.id,
              question_id: eq.question_id,
              answer_text: answerText,
              is_correct: answerCorrect,
              score: score,
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
    logger.log('     • 199107152018012004 / teacher123 (Siti R. — Ekonomi, Geografi, Sosiologi)');
    logger.log('  🔑 Students: NIS-based login (e.g., 202501001 / 202501001)');
    logger.log('  📝 Questions: 32 across 4 banks (Math, Physics, Science, Economics) covering all 6 question types');
    logger.log('  📋 Exams:');
    logger.log('     • UTS Matematika (PUBLISHED — IPA) — Token: ' + token1);
    logger.log('     • Ulangan Fisika (PUBLISHED — upcoming, IPA)');
    logger.log('     • UTS Ekonomi (FINISHED — IPS, ' + ipsStudents.length + ' sessions completed) — Token: ' + token3);
    logger.log('     • Latihan Bahasa Jepang (ONGOING — BAH) — Token: ' + token4);
    logger.log('     • Tryout PKN (PUBLISHED — upcoming, ALL classes)');
    logger.log('  📊 Demo Data: 5 IPA sessions (Exam 1) + ' + ipsStudents.length + ' IPS sessions (Exam 3) + 2 BAH sessions (Exam 4)');
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
