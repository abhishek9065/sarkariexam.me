'use client';

import { useParams } from 'next/navigation';
import { AdminPageShell } from '@/components/admin-page-shell';
import { EDITORIAL_ROLES } from '@/lib/admin-roles';
import { AnnouncementForm } from '../announcement-form';

export default function Page() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <AdminPageShell allowedRoles={EDITORIAL_ROLES}>
      <AnnouncementForm id={id} />
    </AdminPageShell>
  );
}
