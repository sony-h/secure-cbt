import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRoleGuard } from '../use-role-guard';
import { UserRole } from '@secure-cbt/shared';

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = '/dashboard/exams';
let mockAuthState = {
  user: null as any,
  isAuthenticated: false,
  isLoading: false,
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockAuthState,
}));

describe('useRoleGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/dashboard/exams';
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
  });

  it('redirects to /login with redirect parameter when not authenticated and not loading', () => {
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };

    renderHook(() => useRoleGuard([UserRole.ADMIN, UserRole.TEACHER]));

    expect(mockReplace).toHaveBeenCalledWith('/login?redirect=%2Fdashboard%2Fexams');
  });

  it('does not redirect while auth is still loading', () => {
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: true,
    };

    renderHook(() => useRoleGuard([UserRole.ADMIN, UserRole.TEACHER]));

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to /dashboard when user role is not allowed', () => {
    mockAuthState = {
      user: { id: 'u1', username: 'student1', role: UserRole.STUDENT, full_name: 'Student One' },
      isAuthenticated: true,
      isLoading: false,
    };

    renderHook(() => useRoleGuard([UserRole.ADMIN, UserRole.TEACHER]));

    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });

  it('allows access and does not redirect when user has an allowed role', () => {
    mockAuthState = {
      user: { id: 'u2', username: 'teacher1', role: UserRole.TEACHER, full_name: 'Teacher One' },
      isAuthenticated: true,
      isLoading: false,
    };

    renderHook(() => useRoleGuard([UserRole.ADMIN, UserRole.TEACHER]));

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
