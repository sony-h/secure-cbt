import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeacherService } from '../teacher.service';
import { BadRequestException } from '@nestjs/common';

function UUID() {
  return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001';
}

describe('TeacherService with optional NIP/NIY', () => {
  let service: TeacherService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      teacher: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      user: {
        create: vi.fn(),
        update: vi.fn(),
      },
      teacherSubject: {
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn((fn: any) => fn(mockPrisma)),
    };
    service = new TeacherService(mockPrisma as any);
  });

  it('creates teacher with provided NIP/NIY', async () => {
    mockPrisma.teacher.findFirst.mockResolvedValue(null);
    let capturedTeacherData: any;
    let capturedUserData: any;

    mockPrisma.user.create.mockImplementation(({ data }: any) => {
      capturedUserData = data;
      return Promise.resolve({ id: UUID() });
    });

    mockPrisma.teacher.create.mockImplementation(({ data }: any) => {
      capturedTeacherData = data;
      return Promise.resolve({ id: UUID(), ...data });
    });
    mockPrisma.teacher.findUnique.mockResolvedValue({ id: UUID() });

    await service.create({
      nip: '198501012010011001',
      full_name: 'Drs. Supriyanto',
    });

    expect(capturedTeacherData.nip).toBe('198501012010011001');
    expect(capturedUserData.username).toBe('198501012010011001');
  });

  it('creates teacher when NIP/NIY is omitted or blank (for swasta/private school teachers)', async () => {
    let capturedTeacherData: any;
    let capturedUserData: any;

    mockPrisma.user.create.mockImplementation(({ data }: any) => {
      capturedUserData = data;
      return Promise.resolve({ id: UUID() });
    });

    mockPrisma.teacher.create.mockImplementation(({ data }: any) => {
      capturedTeacherData = data;
      return Promise.resolve({ id: UUID(), ...data });
    });
    mockPrisma.teacher.findUnique.mockResolvedValue({ id: UUID() });

    await service.create({
      full_name: 'Siti Rahmawati, S.Pd.',
      nip: '',
    });

    // Should store nip as null
    expect(capturedTeacherData.nip).toBeNull();
    // Should generate a clean username starting with guru_
    expect(capturedUserData.username).toMatch(/^guru_sitirahmaw_[a-z0-9]{4}$/);
    expect(capturedUserData.email).toMatch(/@teacher\.securecbt\.id$/);
  });

  it('throws BadRequestException if provided NIP/NIY is already registered', async () => {
    mockPrisma.teacher.findFirst.mockResolvedValue({ id: UUID(), nip: '19850101' });

    await expect(
      service.create({
        nip: '19850101',
        full_name: 'Drs. Supriyanto',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
