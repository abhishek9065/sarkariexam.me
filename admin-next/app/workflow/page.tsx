import { AdminPageShell } from '@/components/admin-page-shell';
import { REVIEW_WORKFLOW_ROLES } from '@/lib/admin-roles';
import { WorkflowPage } from './workflow-page';

export default function Page() {
  return (
    <AdminPageShell allowedRoles={REVIEW_WORKFLOW_ROLES}>
      <WorkflowPage />
    </AdminPageShell>
  );
}
