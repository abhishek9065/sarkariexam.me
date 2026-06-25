import { AdminPageShell } from '@/components/admin-page-shell';
import { EDITORIAL_ROLES } from '@/lib/admin-roles';
import { DataQualityPage } from './data-quality-page';

export default function Page() {
  return (
    <AdminPageShell allowedRoles={EDITORIAL_ROLES}>
      <DataQualityPage />
    </AdminPageShell>
  );
}
