import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UserRole } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('argon2', () => {
  const mockVerify = vi.fn().mockResolvedValue(true);
  const mockHash = vi.fn().mockResolvedValue('new-hash');
  return {
    default: { verify: mockVerify, hash: mockHash },
    verify: mockVerify,
    hash: mockHash,
  };
});

function UUID() { return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001'; }

// Realistic argon2 hash for 'test123'
const MOCK_HASH = '$argon2id$v=19$m=65536,t=3,p=4$Rg9VqL6sXwYz$Mq3xK8pL5nB2jH7fD9cV1gT4yR6sW0bE3uA8iC5oNk';

function createMockPrisma() {
  const mock: Record<string, any> = {
    user: { findFirst: vi.fn(), findUnique: vi.fn() },
    student: { findUnique: vi.fn() },
    teacher: { findUnique: vi.fn() },
    refreshToken: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn((fn: any) => fn(mock)),
  };
  return mock;
}

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockJwtService: { sign: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockJwtService = { sign: vi.fn().mockReturnValue('mock-token') };
    service = new AuthService(mockPrisma as any, mockJwtService as any);
  });

  describe('login()', () => {
    it('should throw for invalid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.login({ username: 'baduser', password: 'badpass', device_id: UUID() })).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens for valid student', async () => {
      const userId = UUID();
      mockPrisma.user.findFirst.mockResolvedValue({
        id: userId, username: 'teststudent', role: UserRole.STUDENT, password_hash: MOCK_HASH, is_active: true,
      });
      mockPrisma.student.findUnique.mockResolvedValue({ full_name: 'Test Student', nis: '12345', class: { name: 'X MIPA 1' } });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));

      const result = await service.login({ username: 'teststudent', password: 'test123', device_id: UUID() });
      expect(result.access_token).toBe('mock-token');
      expect(result.user.full_name).toBe('Test Student');
      expect(result.user.nis).toBe('12345');
    });

    it('should return role label for admin', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: UUID(), username: 'admin', role: UserRole.ADMIN, password_hash: MOCK_HASH, is_active: true,
      });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));

      const result = await service.login({ username: 'admin', password: 'admin123', device_id: UUID() });
      expect(result.user.full_name).toBe('Administrator');
    });
  });

  describe('refresh()', () => {
    it('should throw for expired token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        token: 'old-token', expires_at: new Date(Date.now() - 3600000),
        user: { id: UUID(), username: 'test', role: UserRole.STUDENT, is_active: true },
      });
      await expect(service.refresh({ refresh_token: 'old-token' })).rejects.toThrow(UnauthorizedException);
    });

    it('should rotate token on valid refresh', async () => {
      const userId = UUID();
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: UUID(), token: 'valid-token', expires_at: new Date(Date.now() + 3600000),
        user: { id: userId, username: 'test', role: UserRole.STUDENT, is_active: true },
      });
      mockPrisma.student.findUnique.mockResolvedValue({ full_name: 'Test Student', nis: '12345', class: { name: 'X MIPA 1' } });

      const result = await service.refresh({ refresh_token: 'valid-token' });
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(result.access_token).toBe('mock-token');
    });
  });

  describe('changePassword()', () => {
    it('should throw when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.changePassword(UUID(), { old_password: 'WrongPass1', new_password: 'NewPass123' })).rejects.toThrow(UnauthorizedException);
    });

    it('should change password on valid request', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: UUID(), password_hash: MOCK_HASH,
      });
      mockPrisma.user.update = vi.fn().mockResolvedValue({});

      await service.changePassword(UUID(), { old_password: 'OldPass1', new_password: 'NewPass123' });
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalled();
    });
  });

  describe('resolveProfileData()', () => {
    it('should return Administrator label for admin', async () => {
      const profile = await (service as any).resolveProfileData({ id: UUID(), role: UserRole.ADMIN, username: 'admin' });
      expect(profile.full_name).toBe('Administrator');
    });

    it('should look up student name from DB', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ full_name: 'Student Name', nis: '999', class: { name: 'XI MIPA 2' } });
      const profile = await (service as any).resolveProfileData({ id: UUID(), role: UserRole.STUDENT, username: 'student' });
      expect(profile.full_name).toBe('Student Name');
      expect(profile.nis).toBe('999');
    });
  });
});
