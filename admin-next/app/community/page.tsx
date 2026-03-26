import { AdminLayout } from '@/components/admin-layout';
import { AdminGuard } from '@/components/admin-guard';
import { CommunityPage } from './community-page';

export default function Page() {
  return (
    <AdminGuard>
      <AdminLayout>
        <CommunityPage />
      </AdminLayout>
    </AdminGuard>
  );
}
