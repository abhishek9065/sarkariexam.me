import { AdminPageShell } from '@/components/admin-page-shell';
import { CONTENT_WRITE_ROLES } from '@/lib/admin-roles';
import { TaxonomiesPage } from './taxonomies-page';

export default function Page() {
  return (
    <AdminPageShell allowedRoles={CONTENT_WRITE_ROLES}>
      <TaxonomiesPage />
    </AdminPageShell>
  );
}
