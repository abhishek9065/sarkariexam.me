import { AdminLayout } from '@/components/admin-layout';
import { AdminGuard } from '@/components/admin-guard';
import { SubscribersPage } from './subscribers-page';

export default function Page() {
  return (
    <AdminGuard>
      <AdminLayout>
        <SubscribersPage />
      </AdminLayout>
    </AdminGuard>
  );
}
