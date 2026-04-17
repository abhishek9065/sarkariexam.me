'use client';

import { useAuth } from '@/lib/auth-context';
import { AdminLayout } from '@/components/admin-layout';
import { PlannedOperationsPage } from '@/components/planned-operations-page';
import { LoginPage } from '../login/login-page';
import { Loader2 } from 'lucide-react';

export default function Page() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!user) return <LoginPage />;
  return (
    <AdminLayout>
      <PlannedOperationsPage
        title="Ticker and quick-link management is not live yet"
        description="The old ticker console edited in-memory sample data and could mislead operators into thinking site-wide messaging was live. This surface stays quarantined until ticker items, quick links, approvals, and publish logs are backed by real storage and revalidation flows."
        actions={[
          {
            href: '/announcements',
            label: 'Manage live content',
            description: 'Use the editorial content queue for real public updates and publish actions.',
          },
          {
            href: '/settings',
            label: 'Review site configuration',
            description: 'Use live settings while ticker and quick-link workflows are rebuilt.',
          },
          {
            href: '/audit-log',
            label: 'Check recent operations',
            description: 'Use the audit log for actual operator-visible changes and publish activity.',
          },
        ]}
      />
    </AdminLayout>
  );
}
