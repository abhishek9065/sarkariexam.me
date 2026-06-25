import { AdminPageShell } from '@/components/admin-page-shell';
import { EDITORIAL_ROLES } from '@/lib/admin-roles';
import { AnnouncementsListPage } from './announcements-list-page';

export default function Page() {
  return (
    <AdminPageShell allowedRoles={EDITORIAL_ROLES}>
      <AnnouncementsListPage />
    </AdminPageShell>
  );
}
