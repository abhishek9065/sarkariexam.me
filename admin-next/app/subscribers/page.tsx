import { AdminPageShell } from '@/components/admin-page-shell';
import { ADMINISTRATOR_ROLES } from '@/lib/admin-roles';
import { SubscribersPage } from './subscribers-page';

export default function Page() {
  return (
    <AdminPageShell allowedRoles={ADMINISTRATOR_ROLES}>
      <SubscribersPage />
    </AdminPageShell>
  );
}
