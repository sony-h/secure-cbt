import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudentService } from '../student.service';

function UUID() {
  return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001';
}

describe('StudentService Excel Export', () => {
  let service: StudentService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      student: {
        findMany: vi.fn(),
      },
    };
    service = new StudentService(mockPrisma as any);
  });

  it('generates an excel buffer containing student accounts and credentials', async () => {
    const mockStudents = [
      {
        id: UUID(),
        nis: '1001',
        full_name: 'Ahmad Dahlan',
        plain_password: 'AKL-ab12cd',
        status: 'ACTIVE',
        class: { name: 'X AKL 1' },
      },
      {
        id: UUID(),
        nis: '1002',
        full_name: 'Budi Utomo',
        plain_password: 'AKL-ef34gh',
        status: 'ACTIVE',
        class: { name: 'X AKL 1' },
      },
    ];

    mockPrisma.student.findMany.mockResolvedValue(mockStudents);

    const buffer = await service.generateExcelExport({ class_id: 'class-1' });
    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(100);
  });
});
