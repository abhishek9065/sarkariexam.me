'use client';

import { useAuth } from '@/lib/auth-context';
import type { AdminRole } from '@/lib/types';
import type { ReactNode } from 'react';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: AdminRole[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { user, loading } = useAuth();

  if (loading) return null; // Avoid flashing fallback during auth check

  // If there's no user, or their role isn't in the allowed array, show fallback
  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
