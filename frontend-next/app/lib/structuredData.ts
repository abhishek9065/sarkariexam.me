/**
 * Structured Data (JSON-LD) Generators for SEO
 * Schema.org markup for better search engine understanding
 */

import type { Announcement } from './types';

export function generateOrganizationSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'SarkariExams.me',
        url: 'https://sarkariexams.me',
        logo: 'https://sarkariexams.me/logo.png',
        description: "India's fastest, most reliable source for Sarkari Results, Admit Cards, and Latest Government Jobs",
        sameAs: [
            'https://twitter.com/sarkariexams',
            'https://facebook.com/sarkariexams',
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Customer Service',
            email: 'support@sarkariexams.me',
        },
    };
}

export function generateWebSiteSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'SarkariExams.me',
        url: 'https://sarkariexams.me',
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://sarkariexams.me/jobs?q={search_term_string}',
            },
            'query-input': 'required name=search_term_string',
        },
    };
}

export function generateJobPostingSchema(announcement: Announcement) {
    if (announcement.type !== 'job') return null;

    const jobDetails = announcement.jobDetails;
    
    return {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: announcement.title,
        description: announcement.content || announcement.title,
        identifier: {
            '@type': 'PropertyValue',
            name: announcement.organization || 'Government of India',
            value: announcement.id,
        },
        datePosted: announcement.postedAt,
        validThrough: announcement.deadline || undefined,
        employmentType: 'FULL_TIME',
        hiringOrganization: {
            '@type': 'Organization',
            name: announcement.organization || 'Government of India',
        },
        jobLocation: {
            '@type': 'Place',
            address: {
                '@type': 'PostalAddress',
                addressCountry: 'IN',
                addressRegion: jobDetails?.location || 'India',
            },
        },
        baseSalary: jobDetails?.salary ? {
            '@type': 'MonetaryAmount',
            currency: 'INR',
            value: {
                '@type': 'QuantitativeValue',
                value: jobDetails.salary,
                unitText: 'MONTH',
            },
        } : undefined,
        numberOfPositions: announcement.totalPosts,
        qualifications: jobDetails?.qualification || undefined,
        url: `https://sarkariexams.me/job/${announcement.slug}`,
    };
}

export function generateArticleSchema(announcement: Announcement) {
    if (announcement.type === 'job') return null;

    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: announcement.title,
        description: announcement.content || announcement.title,
        datePublished: announcement.postedAt,
        dateModified: announcement.updatedAt || announcement.postedAt,
        author: {
            '@type': 'Organization',
            name: announcement.organization || 'SarkariExams.me',
        },
        publisher: {
            '@type': 'Organization',
            name: 'SarkariExams.me',
            logo: {
                '@type': 'ImageObject',
                url: 'https://sarkariexams.me/logo.png',
            },
        },
        url: `https://sarkariexams.me/${announcement.type}/${announcement.slug}`,
    };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    };
}
