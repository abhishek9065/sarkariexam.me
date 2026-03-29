import type { NextConfig } from 'next';
import { announcementCategoryMeta, announcementItemsBySection, buildAnnouncementPath } from './app/lib/public-content';

const nextConfig: NextConfig = {
  async redirects() {
    return (Object.keys(announcementItemsBySection) as Array<keyof typeof announcementItemsBySection>).flatMap((section) =>
      announcementItemsBySection[section].flatMap((item) => {
        const destination = buildAnnouncementPath(item);
        const basePath = announcementCategoryMeta[section].canonicalPath;
        const redirects = item.legacySlugs.map((legacySlug) => ({
          source: `${basePath}/${legacySlug}`,
          destination,
          permanent: true,
        }));

        redirects.push({
          source: `/detail/${item.slug}`,
          destination,
          permanent: true,
        });

        if (item.legacyId) {
          redirects.push({
            source: `${basePath}/${item.legacyId}`,
            destination,
            permanent: true,
          });

          redirects.push({
            source: `/detail/${item.legacyId}`,
            destination,
            permanent: true,
          });
        }

        redirects.push(
          ...item.legacySlugs.map((legacySlug) => ({
            source: `/detail/${legacySlug}`,
            destination,
            permanent: true,
          })),
        );

        return redirects;
      }),
    );
  },
};

export default nextConfig;
