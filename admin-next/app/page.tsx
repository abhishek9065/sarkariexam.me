import { AdminPageShell } from '@/components/admin-page-shell';
import { EDITORIAL_ROLES } from '@/lib/admin-roles';
import { DashboardPage } from './dashboard/dashboard-page';

export default function Page() {
  return (
    <AdminPageShell allowedRoles={EDITORIAL_ROLES}>
      <DashboardPage />
    </AdminPageShell>
  );
}
