import { useEffect } from 'react';

interface SEOHeadProps {
    title: string;
    description: string;
    canonicalUrl?: string;
    ogImage?: string;
    ogType?: 'website' | 'article';
    keywords?: string[];
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    // Job posting specific
    jobPosting?: {
        title: string;
        organization: string;
        location: string;
        deadline?: string;
        salary?: string;
        totalPosts?: number;
    };
}

/**
 * SEO Head component that updates document meta tags dynamically
 * Works with Vite/React by updating the DOM directly
 */
export function SEOHead({
    title,
    description,
    canonicalUrl,
    ogImage = 'https://www.sarkariexams.me/og-image.png',
    ogType = 'website',
    keywords = [],
    publishedTime,
    modifiedTime,
    author = 'SarkariExams.me',
    jobPosting,
}: SEOHeadProps) {
    useEffect(() => {
        // Update title
        document.title = `${title} | SarkariExams.me`;

        // Helper to update/create meta tag
        const setMeta = (name: string, content: string, isProperty = false) => {
            const attr = isProperty ? 'property' : 'name';
            let meta = document.querySelector(`meta[${attr}="${name}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute(attr, name);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        };

        // Basic SEO
        setMeta('description', description);
        if (keywords.length > 0) {
            setMeta('keywords', keywords.join(', '));
        }
        setMeta('author', author);

        // Open Graph
        setMeta('og:title', title, true);
        setMeta('og:description', description, true);
        setMeta('og:type', ogType, true);
        setMeta('og:image', ogImage, true);
        setMeta('og:site_name', 'SarkariExams.me', true);
        if (canonicalUrl) {
            setMeta('og:url', canonicalUrl, true);
        }

        // Twitter Card
        setMeta('twitter:card', 'summary_large_image');
        setMeta('twitter:title', title);
        setMeta('twitter:description', description);
        setMeta('twitter:image', ogImage);

        // Article dates
        if (publishedTime) {
            setMeta('article:published_time', publishedTime, true);
        }
        if (modifiedTime) {
            setMeta('article:modified_time', modifiedTime, true);
        }

        // Canonical URL
        let canonical = document.querySelector('link[rel="canonical"]');
        if (canonicalUrl) {
            if (!canonical) {
                canonical = document.createElement('link');
                canonical.setAttribute('rel', 'canonical');
                document.head.appendChild(canonical);
            }
            canonical.setAttribute('href', canonicalUrl);
        }

        // Job Posting Structured Data (JSON-LD)
        if (jobPosting) {
            const existingLD = document.querySelector('script[data-type="job-ld"]');
            if (existingLD) existingLD.remove();

            const ldScript = document.createElement('script');
            ldScript.type = 'application/ld+json';
            ldScript.setAttribute('data-type', 'job-ld');
            ldScript.textContent = JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'JobPosting',
                title: jobPosting.title,
                hiringOrganization: {
                    '@type': 'Organization',
                    name: jobPosting.organization,
                },
                jobLocation: {
                    '@type': 'Place',
                    address: {
                        '@type': 'PostalAddress',
                        addressLocality: jobPosting.location || 'India',
                        addressCountry: 'IN',
                    },
                },
                ...(jobPosting.deadline && { validThrough: jobPosting.deadline }),
                ...(jobPosting.salary && {
                    baseSalary: {
                        '@type': 'MonetaryAmount',
                        currency: 'INR',
                        value: {
                            '@type': 'QuantitativeValue',
                            value: jobPosting.salary,
                        },
                    },
                }),
                ...(jobPosting.totalPosts && {
                    totalJobOpenings: jobPosting.totalPosts,
                }),
                datePosted: publishedTime || new Date().toISOString(),
                employmentType: 'FULL_TIME',
            });
            document.head.appendChild(ldScript);
        }

        // Cleanup on unmount
        return () => {
            document.title = 'SarkariExams.me - Government Jobs, Results, Admit Cards';
            const jobLD = document.querySelector('script[data-type="job-ld"]');
            if (jobLD) jobLD.remove();
        };
    }, [title, description, canonicalUrl, ogImage, ogType, keywords, publishedTime, modifiedTime, author, jobPosting]);

    return null; // This component doesn't render anything
}

export default SEOHead;
