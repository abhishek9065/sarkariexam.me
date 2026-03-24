import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://sarkariexams.me';

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'hourly',
            priority: 1,
        },
        {
            url: `${baseUrl}/jobs`,
            lastModified: new Date(),
            changeFrequency: 'hourly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/results`,
            lastModified: new Date(),
            changeFrequency: 'hourly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/admit-cards`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/answer-keys`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/admissions`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
        },
    ];

    // In production, fetch dynamic pages from API
    try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiBase}/announcements/sitemap`, {
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (response.ok) {
            const announcements = await response.json();

            if (announcements?.data && Array.isArray(announcements.data)) {
                const dynamicPages: MetadataRoute.Sitemap = announcements.data.map((item: { type: string; slug: string; updatedAt?: string; postedAt?: string }) => ({
                    url: `${baseUrl}/${item.type}/${item.slug}`,
                    lastModified: new Date(item.updatedAt || item.postedAt || new Date()),
                    changeFrequency: 'daily' as const,
                    priority: 0.7,
                }));

                return [...staticPages, ...dynamicPages];
            }
        }
    } catch (error) {
        console.error('Failed to fetch dynamic sitemap entries:', error);
    }

    return staticPages;
}
