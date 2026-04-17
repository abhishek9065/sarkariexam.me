import { AdminLayout } from '@/components/admin-layout';
import { AdminGuard } from '@/components/admin-guard';
import { PlannedOperationsPage } from '@/components/planned-operations-page';

export default function Page() {
  return (
    <AdminGuard>
      <AdminLayout>
        <PlannedOperationsPage
          title="Community moderation is not live yet"
          description="The previous Q&A moderation screen used local demo state and simulated approvals. It is intentionally quarantined until community workflows, moderation queues, and audit actions are backed by real APIs."
          actions={[
            {
              href: '/audit-log',
              label: 'Review editorial activity',
              description: 'Use the live audit trail to monitor actual publish and workflow events.',
            },
            {
              href: '/subscribers',
              label: 'Manage subscriber audience',
              description: 'Live subscriber data is already wired and safe for operators.',
            },
            {
              href: '/settings',
              label: 'Prepare moderation settings',
              description: 'Use configuration surfaces while the real moderation workflow is being rebuilt.',
            },
          ]}
        />
      </AdminLayout>
    </AdminGuard>
  );
}
