'use client';

import type { ReactNode } from 'react';
import { AdminGuard } from './admin-guard';
import { AdminLayout } from './admin-layout';
import type { AdminRole } from '@/lib/types';

interface AdminPageShellProps {
  children: ReactNode;
  allowedRoles?: readonly AdminRole[];
}

export function AdminPageShell({ children, allowedRoles }: AdminPageShellProps) {
  return (
    <AdminGuard allowedRoles={allowedRoles}>
      <AdminLayout>{children}</AdminLayout>
    </AdminGuard>
  );
}
