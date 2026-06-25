import { AdminPageShell } from '@/components/admin-page-shell';
import { ADMINISTRATOR_ROLES } from '@/lib/admin-roles';
import { SystemAdminPage } from './system-admin-page';

export default function Page() {
  return (
    <AdminPageShell allowedRoles={ADMINISTRATOR_ROLES}>
      <SystemAdminPage />
    </AdminPageShell>
  );
}
