import { AdminLayout } from '@/components/admin-layout';
import { AdminGuard } from '@/components/admin-guard';

import { TaxonomiesPage } from './taxonomies-page';

export default function Page() {
  return (
    <AdminGuard>
      <AdminLayout>
        <TaxonomiesPage />
      </AdminLayout>
    </AdminGuard>
  );
}
