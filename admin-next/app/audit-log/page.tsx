import { AdminLayout } from '@/components/admin-layout';
import { AdminGuard } from '@/components/admin-guard';
import { AuditLogPage } from './audit-log-page';

export default function Page() {
  return (
    <AdminGuard>
      <AdminLayout>
        <AuditLogPage />
      </AdminLayout>
    </AdminGuard>
  );
}
