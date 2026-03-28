import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { announcementCategoryMeta, getAnnouncementEntries } from '@/app/lib/public-content';

function buildJobsSummary(search?: string, department?: string) {
  const parts = [];

  if (search?.trim()) {
    parts.push(`search "${search.trim()}"`);
  }

  if (department?.trim()) {
    parts.push(`department "${department.trim()}"`);
  }

  return parts.length > 0 ? `Showing jobs for ${parts.join(' + ')}.` : undefined;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; search?: string }>;
}) {
  const { department, search } = await searchParams;

  return (
    <PublicCategoryHubPage
      meta={announcementCategoryMeta.jobs}
      entries={getAnnouncementEntries('jobs', { department, search })}
      querySummary={buildJobsSummary(search, department)}
      clearHref={announcementCategoryMeta.jobs.canonicalPath}
    />
  );
}
