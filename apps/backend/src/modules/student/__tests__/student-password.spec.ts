import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateClassPassword } from '@secure-cbt/shared';
import { StudentService } from '../student.service';
import * as argon2 from 'argon2';

function UUID() {
  return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001';
}

describe('generateClassPassword helper', () => {
  it('extracts class prefix correctly and formats as PREFIX-xxxxxx', () => {
    const pwAkl = generateClassPassword('X AKL 1');
    expect(pwAkl).toMatch(/^AKL-[2-9a-km-np-z]{6}$/);

    const pwTjkt = generateClassPassword('XII TJKT 2');
    expect(pwTjkt).toMatch(/^TJKT-[2-9a-km-np-z]{6}$/);

    const pwRpl = generateClassPassword('XI RPL');
    expect(pwRpl).toMatch(/^RPL-[2-9a-km-np-z]{6}$/);

    const pwTkro = generateClassPassword('10 TKRO 3');
    expect(pwTkro).toMatch(/^TKRO-[2-9a-km-np-z]{6}$/);

    const pwFallback = generateClassPassword('10');
    expect(pwFallback).toMatch(/^CBT-[2-9a-km-np-z]{6}$/);
  });
});

describe('StudentService password retention and batch generator', () => {
  let service: StudentService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      student: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      class: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      user: {
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((fn: any) => fn(mockPrisma)),
    };
    service = new StudentService(mockPrisma as any);
  });

  it('persists custom plain_password and hashes it for User on create', async () => {
    const classId = UUID();
    mockPrisma.student.findFirst.mockResolvedValue(null);
    mockPrisma.class.findUnique.mockResolvedValue({ id: classId, name: 'X AKL 1' });

    let capturedUserData: any;
    let capturedStudentData: any;

    mockPrisma.user.create.mockImplementation(({ data }: any) => {
      capturedUserData = data;
      return Promise.resolve({ id: UUID() });
    });

    mockPrisma.student.create.mockImplementation(({ data }: any) => {
      capturedStudentData = data;
      return Promise.resolve({ id: UUID(), ...data });
    });

    await service.create({
      nis: '1001',
      full_name: 'Budi Raharjo',
      class_id: classId,
      password: 'custom-pass-123',
    });

    expect(capturedStudentData.plain_password).toBe('custom-pass-123');
    expect(capturedUserData.username).toBe('1001');
    const isMatch = await argon2.verify(capturedUserData.password_hash, 'custom-pass-123');
    expect(isMatch).toBe(true);
  });

  it('defaults plain_password to nis when password is not supplied', async () => {
    const classId = UUID();
    mockPrisma.student.findFirst.mockResolvedValue(null);
    mockPrisma.class.findUnique.mockResolvedValue({ id: classId, name: 'X AKL 1' });

    let capturedUserData: any;
    let capturedStudentData: any;

    mockPrisma.user.create.mockImplementation(({ data }: any) => {
      capturedUserData = data;
      return Promise.resolve({ id: UUID() });
    });

    mockPrisma.student.create.mockImplementation(({ data }: any) => {
      capturedStudentData = data;
      return Promise.resolve({ id: UUID(), ...data });
    });

    await service.create({
      nis: '1002',
      full_name: 'Siti Aminah',
      class_id: classId,
    });

    expect(capturedStudentData.plain_password).toBe('1002');
    const isMatch = await argon2.verify(capturedUserData.password_hash, '1002');
    expect(isMatch).toBe(true);
  });

  it('batch generates class-formatted passwords for students in a class', async () => {
    const classId = UUID();
    const student1 = {
      id: UUID(),
      nis: '1001',
      full_name: 'Budi Raharjo',
      user_id: UUID(),
      class: { name: 'X AKL 1' },
    };
    const student2 = {
      id: UUID(),
      nis: '1002',
      full_name: 'Siti Aminah',
      user_id: UUID(),
      class: { name: 'X AKL 1' },
    };

    mockPrisma.student.findMany.mockResolvedValue([student1, student2]);
    mockPrisma.student.update.mockResolvedValue({});
    mockPrisma.user.update.mockResolvedValue({});

    const result = await service.batchGeneratePasswords({ class_id: classId });

    expect(result.count).toBe(2);
    expect(result.students).toHaveLength(2);
    expect(result.students[0]?.plain_password).toMatch(/^AKL-[2-9a-km-np-z]{6}$/);
    expect(result.students[1]?.plain_password).toMatch(/^AKL-[2-9a-km-np-z]{6}$/);
    expect(mockPrisma.student.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(2);
  });
});
