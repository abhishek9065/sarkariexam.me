/**
 * Dynamic Component Exports
 * Lazy-loaded components for better performance
 */

import dynamic from 'next/dynamic';

// Lazy load SearchOverlay with loading state
export const SearchOverlay = dynamic(
    () => import('./SearchOverlay').then(mod => ({ default: mod.SearchOverlay })),
    {
        loading: () => <div className="search-overlay-loading">Loading search...</div>,
        ssr: false,
    }
);

// Lazy load detailed job/result components
export const DetailPageClient = dynamic(
    () => import('./DetailPageClient').then(mod => ({ default: mod.DetailPage })),
    {
        loading: () => <div className="detail-page-skeleton">Loading details...</div>,
    }
);

// Lazy load category page client
export const CategoryPageClient = dynamic(
    () => import('./CategoryPageClient').then(mod => ({ default: mod.CategoryPage })),
    {
        loading: () => <div className="category-page-skeleton">Loading...</div>,
    }
);

// Lazy load homepage client
export const HomePageClient = dynamic(
    () => import('./HomePageClient').then(mod => ({ default: mod.HomePage })),
    {
        loading: () => <div className="homepage-skeleton">Loading homepage...</div>,
    }
);
