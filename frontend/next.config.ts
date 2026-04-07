import path from 'path';
import type { NextConfig } from 'next';
import { announcementCategoryMeta, announcementItemsBySection, buildAnnouncementPath } from './app/lib/public-content';

const singularAliasPathMap = {
  jobs: '/job',
  results: '/result',
  'admit-cards': '/admit-card',
} as const;

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return (Object.keys(announcementItemsBySection) as Array<keyof typeof announcementItemsBySection>).flatMap((section) =>
      announcementItemsBySection[section].flatMap((item) => {
        const destination = buildAnnouncementPath(item);
        const basePath = announcementCategoryMeta[section].canonicalPath;
        const singularAliasPath =
          section in singularAliasPathMap
            ? singularAliasPathMap[section as keyof typeof singularAliasPathMap]
            : null;
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

        if (singularAliasPath) {
          redirects.push({
            source: `${singularAliasPath}/${item.slug}`,
            destination,
            permanent: true,
          });
        }

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

          if (singularAliasPath) {
            redirects.push({
              source: `${singularAliasPath}/${item.legacyId}`,
              destination,
              permanent: true,
            });
          }
        }

        redirects.push(
          ...item.legacySlugs.map((legacySlug) => ({
            source: `/detail/${legacySlug}`,
            destination,
            permanent: true,
          })),
        );

        if (singularAliasPath) {
          redirects.push(
            ...item.legacySlugs.map((legacySlug) => ({
              source: `${singularAliasPath}/${legacySlug}`,
              destination,
              permanent: true,
            })),
          );
        }

        return redirects;
      }),
    );
  },
};

export default nextConfig;
