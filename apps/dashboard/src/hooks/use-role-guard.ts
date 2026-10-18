'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@secure-cbt/shared';

export function useRoleGuard(allowedRoles: UserRole[]) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : '/login';
      router.replace(redirectUrl);
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, isAuthenticated, isLoading, allowedRoles, router, pathname]);

  return { user, isLoading, isAuthenticated };
}

