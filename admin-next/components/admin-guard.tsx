'use client';

import { useAuth } from '@/lib/auth-context';
import { LoginPage } from '@/app/login/login-page';
import type { AdminRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export function AdminGuard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: readonly AdminRole[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your role does not have access to this admin page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
