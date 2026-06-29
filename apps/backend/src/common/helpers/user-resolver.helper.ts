import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export async function resolveStudentId(prisma: PrismaService, userId: string): Promise<string> {
  const student = await prisma.student.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  if (!student) throw new NotFoundException('Data siswa tidak ditemukan');
  return student.id;
}

export async function resolveTeacherId(prisma: PrismaService, userId: string): Promise<string> {
  const teacher = await prisma.teacher.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  if (!teacher) throw new NotFoundException('Data guru tidak ditemukan');
  return teacher.id;
}
