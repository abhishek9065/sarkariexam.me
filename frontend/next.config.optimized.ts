import type { NextConfig } from 'next';
import { announcementCategoryMeta, announcementItemsBySection, buildAnnouncementPath } from './app/lib/public-content';

const singularAliasPathMap = {
  jobs: '/job',
  results: '/result',
  'admit-cards': '/admit-card',
} as const;

type RedirectRule = {
  source: string;
  destination: string;
  permanent: boolean;
};

let cachedRedirects: RedirectRule[] | null = null;

const nextConfig: NextConfig = {
  // Build optimizations for faster deployments
  experimental: {
    // Enable optimized package imports for faster builds
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Build performance optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Reduce bundle analysis time
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Bundle React and Next.js together
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // Bundle UI libraries together  
          ui: {
            name: 'ui',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
            priority: 30,
          },
          // Common vendor bundle
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]/,
            priority: 20,
          },
        },
      };
    }
    
    return config;
  },

  // Output optimization for standalone deployment
  output: 'standalone',
  
  // Disable source maps in production for faster builds
  productionBrowserSourceMaps: false,
  
  // Static optimization
  trailingSlash: false,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },
  
  // Redirects (cached for faster computation)
  async redirects() {
    if (cachedRedirects) {
      return cachedRedirects;
    }
    
    const redirects = (Object.keys(announcementItemsBySection) as Array<keyof typeof announcementItemsBySection>).flatMap((section) =>
      announcementItemsBySection[section].flatMap((item) => {
        const destination = buildAnnouncementPath(item);
        const basePath = announcementCategoryMeta[section].canonicalPath;
        const singularAliasPath =
          section in singularAliasPathMap
            ? singularAliasPathMap[section as keyof typeof singularAliasPathMap]
            : null;
        const itemRedirects = item.legacySlugs.map((legacySlug) => ({
          source: `${basePath}/${legacySlug}`,
          destination,
          permanent: true,
        }));

        itemRedirects.push({
          source: `/detail/${item.slug}`,
          destination,
          permanent: true,
        });

        if (singularAliasPath) {
          itemRedirects.push({
            source: `${singularAliasPath}/${item.slug}`,
            destination,
            permanent: true,
          });
        }

        if (item.legacyId) {
          itemRedirects.push({
            source: `${basePath}/${item.legacyId}`,
            destination,
            permanent: true,
          });

          itemRedirects.push({
            source: `/detail/${item.legacyId}`,
            destination,
            permanent: true,
          });

          if (singularAliasPath) {
            itemRedirects.push({
              source: `${singularAliasPath}/${item.legacyId}`,
              destination,
              permanent: true,
            });
          }
        }

        itemRedirects.push(
          ...item.legacySlugs.map((legacySlug) => ({
            source: `/detail/${legacySlug}`,
            destination,
            permanent: true,
          })),
        );

        if (singularAliasPath) {
          itemRedirects.push(
            ...item.legacySlugs.map((legacySlug) => ({
              source: `${singularAliasPath}/${legacySlug}`,
              destination,
              permanent: true,
            })),
          );
        }

        return itemRedirects;
      }),
    );
    
    cachedRedirects = redirects;
    return redirects;
  },
};

export default nextConfig;
