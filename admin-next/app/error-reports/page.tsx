import { AdminLayout } from '@/components/admin-layout';
import { AdminGuard } from '@/components/admin-guard';
import { ErrorReportsPage } from './error-reports-page';

export default function Page() {
  return (
    <AdminGuard>
      <AdminLayout>
        <ErrorReportsPage />
      </AdminLayout>
    </AdminGuard>
  );
}
