import { AdminPageShell } from '@/components/admin-page-shell';
import { CONTENT_WRITE_ROLES } from '@/lib/admin-roles';
import { AnnouncementForm } from '../announcement-form';

export default function Page() {
  return (
    <AdminPageShell allowedRoles={CONTENT_WRITE_ROLES}>
      <AnnouncementForm />
    </AdminPageShell>
  );
}
