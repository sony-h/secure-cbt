'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@secure-cbt/shared';

export function useRoleGuard(allowedRoles: UserRole[]) {
  const { user } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    if (user && !allowedRoles.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, allowedRoles, router]);
  return { user };
}
