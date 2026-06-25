import { AdminPageShell } from '@/components/admin-page-shell';
import { MODERATION_ROLES } from '@/lib/admin-roles';
import { CommunityPage } from './community-page';

export default function Page() {
  return (
    <AdminPageShell allowedRoles={MODERATION_ROLES}>
      <CommunityPage />
    </AdminPageShell>
  );
}
