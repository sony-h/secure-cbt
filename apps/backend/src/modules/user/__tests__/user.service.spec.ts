import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../user.service';

describe('UserService', () => {
  let service: UserService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };
    service = new UserService(mockPrisma);
  });

  describe('remove', () => {
    it('soft-deletes user and scrambles email and username to avoid unique collisions', async () => {
      const existingUser = {
        id: 'user-123',
        username: 'john_doe',
        email: 'john@example.com',
        deleted_at: null,
      };

      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({ ...existingUser, deleted_at: new Date() });

      const result = await service.remove('user-123');

      expect(result).toEqual({ deleted: true });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          deleted_at: expect.any(Date),
          username: expect.stringMatching(/^john_doe\.deleted_\d+$/),
          email: expect.stringMatching(/^john@example\.com\.deleted_\d+$/),
        }),
      });
    });
  });
});
