import { useEffect } from 'react';
import type { Announcement } from '../../types';

interface SEOProps {
    title?: string;
    description?: string;
    announcement?: Announcement;
    canonicalUrl?: string;
}

/**
 * SEO Component with dynamic meta tags and JSON-LD structured data
 * Supports Job Posting schema for Google Jobs
 */
export function SEO({ title, description, announcement, canonicalUrl }: SEOProps) {
    const siteName = 'SarkariExams.me';
    const defaultTitle = 'SarkariExams.me - Government Jobs, Results, Admit Cards 2024-25';
    const defaultDescription = 'Get latest SarkariExams.me updates, Government Jobs, UPSC, SSC, Railway, Bank Recruitment notifications, Results and Admit Cards.';

    const pageTitle = title ? `${title} | ${siteName}` : defaultTitle;
    const pageDescription = description || defaultDescription;

    useEffect(() => {
        // Update document title
        document.title = pageTitle;

        // Update meta description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', pageDescription);

        // Update canonical URL
        if (canonicalUrl) {
            let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
            if (!canonicalLink) {
                canonicalLink = document.createElement('link');
                canonicalLink.rel = 'canonical';
                document.head.appendChild(canonicalLink);
            }
            canonicalLink.href = canonicalUrl;
        }

        // ========== Open Graph Meta Tags ==========
        const baseUrl = 'https://sarkariexams.me';
        const ogImage = `${baseUrl}/og-image.png`;

        const ogTags: Record<string, string> = {
            'og:title': pageTitle,
            'og:description': pageDescription,
            'og:type': announcement ? 'article' : 'website',
            'og:url': canonicalUrl || baseUrl,
            'og:image': ogImage,
            'og:site_name': siteName,
            'og:locale': 'en_IN',
            // Twitter Card
            'twitter:card': 'summary_large_image',
            'twitter:title': pageTitle,
            'twitter:description': pageDescription,
            'twitter:image': ogImage,
        };

        // Add announcement-specific OG tags
        if (announcement) {
            ogTags['article:published_time'] = announcement.postedAt;
            if (announcement.updatedAt) {
                ogTags['article:modified_time'] = announcement.updatedAt;
            }
            ogTags['article:section'] = announcement.type;
            ogTags['article:tag'] = announcement.category;
        }

        // Apply OG meta tags
        Object.entries(ogTags).forEach(([property, content]) => {
            let meta = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute(property.startsWith('twitter:') ? 'name' : 'property', property);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        });

        // Add JSON-LD structured data for announcements
        if (announcement) {
            const existingScript = document.querySelector('script[type="application/ld+json"]');
            if (existingScript) existingScript.remove();

            const jsonLd = generateStructuredData(announcement);
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.text = JSON.stringify(jsonLd);
            document.head.appendChild(script);
        }

        // Cleanup
        return () => {
            const script = document.querySelector('script[type="application/ld+json"]');
            if (script) script.remove();
        };
    }, [pageTitle, pageDescription, canonicalUrl, announcement]);

    return null; // This component only manages head tags
}

/**
 * Generate JSON-LD structured data based on announcement type
 */
function generateStructuredData(announcement: Announcement) {
    const baseUrl = 'https://sarkariexams.me';

    // Common organization data
    const organization = {
        "@type": "Organization",
        "name": announcement.organization || "Government of India",
        "url": announcement.externalLink || baseUrl
    };

    // Job Posting Schema (for jobs)
    if (announcement.type === 'job') {
        return {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": announcement.title,
            "description": announcement.content || `${announcement.title} - Apply online at ${announcement.organization}`,
            "identifier": {
                "@type": "PropertyValue",
                "name": announcement.organization,
                "value": announcement.slug
            },
            "datePosted": announcement.postedAt,
            "validThrough": announcement.deadline || undefined,
            "hiringOrganization": organization,
            "jobLocation": {
                "@type": "Place",
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": announcement.location || "India",
                    "addressCountry": "IN"
                }
            },
            "baseSalary": announcement.applicationFee ? {
                "@type": "MonetaryAmount",
                "currency": "INR",
                "value": {
                    "@type": "QuantitativeValue",
                    "value": "As per rules"
                }
            } : undefined,
            "employmentType": "FULL_TIME",
            "qualifications": announcement.minQualification || undefined,
            "directApply": true,
            "url": `${baseUrl}/${announcement.type}/${announcement.slug}`
        };
    }

    // Article/NewsArticle Schema (for results, admit cards, etc.)
    return {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": announcement.title,
        "description": announcement.content || `Latest update for ${announcement.title}`,
        "author": organization,
        "publisher": {
            "@type": "Organization",
            "name": "Sarkari Result Gold",
            "url": baseUrl,
            "logo": {
                "@type": "ImageObject",
                "url": `${baseUrl}/icon-192.png`
            }
        },
        "datePublished": announcement.postedAt,
        "dateModified": announcement.updatedAt || announcement.postedAt,
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${baseUrl}/${announcement.type}/${announcement.slug}`
        }
    };
}

export default SEO;
