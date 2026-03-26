'use client';

import { useAuth } from '@/lib/auth-context';
import { AdminLayout } from '@/components/admin-layout';
import { EngagementPage } from './engagement-page';
import { LoginPage } from '../login/login-page';
import { Loader2 } from 'lucide-react';

export default function Page() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!user) return <LoginPage />;
  return <AdminLayout><EngagementPage /></AdminLayout>;
}
