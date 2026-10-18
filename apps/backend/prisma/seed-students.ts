import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot(), PrismaModule],
})
class SeedModule {}

interface ParsedStudent {
  no: number;
  nis: string;
  name: string;
  gender: string;
  rawClassName: string;
  normalizedClassName: string;
}

/**
 * Normalizes class name from Excel to match DB records.
 * Specifically converts Busana / BUSANA to TB (e.g. "X Busana" -> "X TB").
 */
function normalizeClassName(raw: string): string {
  let cleaned = raw.replace(/^[:\s]+/, '').trim();
  // Replace BUSANA (case-insensitive) with TB
  cleaned = cleaned.replace(/\bBUSANA\b/gi, 'TB');
  return cleaned;
}

function findExcelFilePath(): string {
  const candidatePaths = [
    path.resolve(__dirname, '../../../assets/Presensi Siswa 2026-2027.xls'),
    path.resolve(__dirname, '../../assets/Presensi Siswa 2026-2027.xls'),
    path.resolve(process.cwd(), 'assets/Presensi Siswa 2026-2027.xls'),
    path.resolve(process.cwd(), '../../assets/Presensi Siswa 2026-2027.xls'),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Presensi Siswa 2026-2027.xls not found in expected locations:\n${candidatePaths.join('\n')}`,
  );
}

async function seedStudents() {
  const app = await NestFactory.createApplicationContext(SeedModule);
  const prisma = app.get(PrismaService);
  const logger = new Logger('SeedStudents');

  try {
    const excelPath = findExcelFilePath();
    logger.log(`📖 Reading Excel file from: ${excelPath}`);

    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames.includes('Juli 2026')
      ? 'Juli 2026'
      : (workbook.SheetNames[0] || '');

    if (!sheetName || !workbook.Sheets[sheetName]) {
      throw new Error(`Sheet not found in Excel workbook: ${workbook.SheetNames.join(', ')}`);
    }

    logger.log(`📋 Using sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    // Fetch existing classes from DB
    const existingClasses = await prisma.class.findMany();
    const classMap = new Map<string, string>(); // normalized upper-case name -> class id
    existingClasses.forEach((c) => {
      classMap.set(c.name.trim().toUpperCase(), c.id);
    });

    logger.log(`Found ${existingClasses.length} existing classes in database.`);

    // Parse students from sheet
    let currentRawClass: string | null = null;
    let currentNormalizedClass: string | null = null;
    const parsedStudents: ParsedStudent[] = [];

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const firstCol = row[0];

      // Detect Class header row (e.g. row[0] === 'Kelas', row[2] === ': X TJKT 1' or ': X Busana')
      if (
        firstCol &&
        typeof firstCol === 'string' &&
        firstCol.trim().toLowerCase() === 'kelas'
      ) {
        const rawClassVal = (row[2] || row[1] || '').toString();
        const cleanedClass = rawClassVal.replace(/^[:\s]+/, '').trim();
        currentRawClass = cleanedClass;
        currentNormalizedClass = normalizeClassName(cleanedClass);
        continue;
      }

      // Detect Student row (row[0] is numeric No., row[1] is NIS, row[2] is Name)
      if (
        typeof firstCol === 'number' &&
        currentRawClass &&
        currentNormalizedClass
      ) {
        const rawNis = row[1];
        const rawName = row[2];
        const rawGender = row[3];

        if (rawNis !== undefined && rawNis !== null && rawName) {
          const nis = rawNis.toString().trim();
          const name = rawName.toString().trim();
          const gender = (rawGender || '').toString().trim();

          if (nis && name) {
            parsedStudents.push({
              no: firstCol,
              nis,
              name,
              gender,
              rawClassName: currentRawClass,
              normalizedClassName: currentNormalizedClass,
            });
          }
        }
      }
    }

    logger.log(`Parsed ${parsedStudents.length} students from Excel.`);

    // Group students by normalized class name and verify class mapping
    const groupedByClass = new Map<string, ParsedStudent[]>();
    for (const student of parsedStudents) {
      const list = groupedByClass.get(student.normalizedClassName) || [];
      list.push(student);
      groupedByClass.set(student.normalizedClassName, list);
    }

    logger.log(`Students grouped across ${groupedByClass.size} classes:`);
    for (const [clsName, students] of groupedByClass.entries()) {
      const classId = classMap.get(clsName.toUpperCase());
      const rawName = students[0]?.rawClassName ?? clsName;
      if (!classId) {
        throw new Error(
          `Class "${clsName}" (from "${rawName}") not found in DB! Available in DB: ${Array.from(classMap.keys()).join(', ')}`,
        );
      }
      logger.log(`  - ${clsName}: ${students.length} students (Class ID: ${classId})`);
    }

    // Seed students into DB
    logger.log('🚀 Seeding students and user accounts into database...');
    let createdCount = 0;
    let updatedCount = 0;

    // Process students sequentially or in small concurrency chunks to maintain stability
    for (const student of parsedStudents) {
      const classId = classMap.get(student.normalizedClassName.toUpperCase())!;
      const email = `${student.nis}@student.securecbt.id`;

      // Find or create User
      let user = await prisma.user.findFirst({
        where: {
          OR: [{ username: student.nis }, { email }],
        },
      });

      if (!user) {
        const passwordHash = await argon2.hash(student.nis);
        user = await prisma.user.create({
          data: {
            username: student.nis,
            email,
            password_hash: passwordHash,
            role: 'STUDENT',
            is_active: true,
          },
        });
      }

      // Upsert Student
      const existingStudent = await prisma.student.findUnique({
        where: { nis: student.nis },
      });

      if (existingStudent) {
        await prisma.student.update({
          where: { nis: student.nis },
          data: {
            full_name: student.name,
            class_id: classId,
            plain_password: null, // Left as null for user to generate manually
            status: 'ACTIVE',
            deleted_at: null,
          },
        });
        updatedCount++;
      } else {
        await prisma.student.create({
          data: {
            user_id: user.id,
            nis: student.nis,
            full_name: student.name,
            class_id: classId,
            plain_password: null, // Left as null for user to generate manually
            status: 'ACTIVE',
          },
        });
        createdCount++;
      }
    }

    logger.log(`✅ Student seeding completed successfully!`);
    logger.log(`   Total parsed: ${parsedStudents.length}`);
    logger.log(`   Newly created: ${createdCount}`);
    logger.log(`   Updated: ${updatedCount}`);

    // Verification check
    const totalInDb = await prisma.student.count({
      where: { deleted_at: null },
    });
    logger.log(`📊 Total active students in database now: ${totalInDb}`);

    await app.close();
  } catch (error) {
    logger.error('❌ Error seeding students:', error);
    await app.close();
    process.exit(1);
  }
}

seedStudents();
