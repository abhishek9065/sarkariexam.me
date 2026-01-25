import type { Announcement, ContentType } from '../types';

// Mock announcements data - fallback for when backend is unavailable
const mockAnnouncements: Announcement[] = [
    // JOBS
    {
        id: '1',
        title: 'UPSC Civil Services 2024 - IAS/IPS/IFS Recruitment',
        slug: 'upsc-civil-services-2024',
        type: 'job',
        category: 'Central Government',
        organization: 'Union Public Service Commission',
        content: 'Applications invited for Civil Services Examination 2024.',
        externalLink: 'https://upsc.gov.in',
        location: 'All India',
        deadline: '2024-03-15T00:00:00Z',
        minQualification: 'Graduate',
        ageLimit: '21-32 years',
        applicationFee: '₹100',
        totalPosts: 1056,
        postedAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-10T00:00:00Z',
        isActive: true,
        viewCount: 15420,
        tags: [{ id: 1, name: 'UPSC', slug: 'upsc' }]
    },
    {
        id: '2',
        title: 'SSC CGL 2024 - Combined Graduate Level Examination',
        slug: 'ssc-cgl-2024',
        type: 'job',
        category: 'Central Government',
        organization: 'Staff Selection Commission',
        content: 'SSC CGL 2024 notification for Group B and C posts.',
        externalLink: 'https://ssc.nic.in',
        location: 'All India',
        deadline: '2024-02-28T00:00:00Z',
        totalPosts: 8000,
        postedAt: '2024-01-05T00:00:00Z',
        updatedAt: '2024-01-05T00:00:00Z',
        isActive: true,
        viewCount: 23567,
        tags: [{ id: 3, name: 'SSC', slug: 'ssc' }]
    },
    {
        id: '3',
        title: 'IBPS PO 2024 - Probationary Officer Recruitment',
        slug: 'ibps-po-2024',
        type: 'job',
        category: 'Banking',
        organization: 'IBPS',
        externalLink: 'https://ibps.in',
        location: 'All India',
        deadline: '2024-03-20T00:00:00Z',
        totalPosts: 4500,
        postedAt: '2024-01-08T00:00:00Z',
        updatedAt: '2024-01-08T00:00:00Z',
        isActive: true,
        viewCount: 18932,
        tags: [{ id: 5, name: 'IBPS', slug: 'ibps' }]
    },
    {
        id: '4',
        title: 'Indian Army Agniveer Rally 2024',
        slug: 'indian-army-agniveer-2024',
        type: 'job',
        category: 'Defence',
        organization: 'Indian Army',
        externalLink: 'https://joinindianarmy.nic.in',
        location: 'Multiple States',
        deadline: '2024-03-10T00:00:00Z',
        totalPosts: 25000,
        postedAt: '2024-01-22T00:00:00Z',
        updatedAt: '2024-01-22T00:00:00Z',
        isActive: true,
        viewCount: 54321,
        tags: [{ id: 17, name: 'Army', slug: 'army' }]
    },

    // RESULTS
    {
        id: '11',
        title: 'IBPS Clerk Result 2024 (Prelims) - Download Merit List PDF',
        slug: 'ibps-clerk-result-2024',
        type: 'result',
        category: 'Banking',
        organization: 'IBPS',
        externalLink: 'https://ibps.in',
        location: 'All India',
        postedAt: '2024-01-30T00:00:00Z',
        updatedAt: '2024-01-30T00:00:00Z',
        isActive: true,
        viewCount: 87654,
        tags: []
    },
    {
        id: '12',
        title: 'UPSC NDA Result 2024 (II) - Final Merit List',
        slug: 'upsc-nda-result-2024',
        type: 'result',
        category: 'Defence',
        organization: 'UPSC',
        externalLink: 'https://upsc.gov.in',
        location: 'All India',
        postedAt: '2024-01-29T00:00:00Z',
        updatedAt: '2024-01-29T00:00:00Z',
        isActive: true,
        viewCount: 56789,
        tags: []
    },

    // ADMIT CARDS
    {
        id: '21',
        title: 'IBPS RRB 2024 Admit Card (Officer Scale) - Download Hall Ticket',
        slug: 'ibps-rrb-admit-card-2024',
        type: 'admit-card',
        category: 'Banking',
        organization: 'IBPS',
        externalLink: 'https://ibps.in',
        location: 'All India',
        postedAt: '2024-01-28T00:00:00Z',
        updatedAt: '2024-01-28T00:00:00Z',
        isActive: true,
        viewCount: 43210,
        tags: []
    },
    {
        id: '22',
        title: 'SSC GD Admit Card 2024 - Download Region-wise Hall Ticket',
        slug: 'ssc-gd-admit-card-2024',
        type: 'admit-card',
        category: 'Central Government',
        organization: 'SSC',
        externalLink: 'https://ssc.nic.in',
        location: 'All India',
        postedAt: '2024-01-27T00:00:00Z',
        updatedAt: '2024-01-27T00:00:00Z',
        isActive: true,
        viewCount: 65432,
        tags: []
    },

    // ANSWER KEYS
    {
        id: '31',
        title: 'UPSC CAPF Answer Key 2024 - Download Official Answer Key',
        slug: 'upsc-capf-answer-key-2024',
        type: 'answer-key',
        category: 'Central Government',
        organization: 'UPSC',
        externalLink: 'https://upsc.gov.in',
        location: 'All India',
        postedAt: '2024-01-26T00:00:00Z',
        updatedAt: '2024-01-26T00:00:00Z',
        isActive: true,
        viewCount: 34567,
        tags: []
    },

    // ADMISSIONS
    {
        id: '41',
        title: 'DU Admissions 2024 - UG Programs',
        slug: 'du-admissions-2024',
        type: 'admission',
        category: 'University',
        organization: 'Delhi University',
        externalLink: 'https://du.ac.in',
        location: 'Delhi',
        deadline: '2024-04-30T00:00:00Z',
        postedAt: '2024-01-25T00:00:00Z',
        updatedAt: '2024-01-25T00:00:00Z',
        isActive: true,
        viewCount: 76543,
        tags: []
    },

    // SYLLABUS
    {
        id: '51',
        title: 'UPSC CSE 2025 Syllabus PDF - Download Prelims & Mains',
        slug: 'upsc-cse-2025-syllabus',
        type: 'syllabus',
        category: 'Central Government',
        organization: 'UPSC',
        externalLink: 'https://upsc.gov.in',
        location: 'All India',
        postedAt: '2024-01-24T00:00:00Z',
        updatedAt: '2024-01-24T00:00:00Z',
        isActive: true,
        viewCount: 98765,
        tags: []
    }
];

// Filter mock announcements based on query params
export function filterMockAnnouncements(filters?: {
    type?: ContentType;
    search?: string;
    category?: string;
    organization?: string;
    limit?: number;
    offset?: number;
}): Announcement[] {
    let result = [...mockAnnouncements];

    if (filters?.type) {
        result = result.filter(a => a.type === filters.type);
    }

    if (filters?.category) {
        result = result.filter(a => a.category === filters.category);
    }

    if (filters?.organization) {
        result = result.filter(a => a.organization === filters.organization);
    }

    if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(a =>
            a.title.toLowerCase().includes(searchLower) ||
            a.organization.toLowerCase().includes(searchLower) ||
            a.category.toLowerCase().includes(searchLower) ||
            a.content?.toLowerCase().includes(searchLower) ||
            a.tags?.some(t => t.name.toLowerCase().includes(searchLower))
        );
    }

    // Sort by posted date descending
    result.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 100;

    return result.slice(offset, offset + limit);
}

export function findMockBySlug(slug: string): Announcement | null {
    return mockAnnouncements.find(a => a.slug === slug) || null;
}

export function getMockStats() {
    return {
        jobs: mockAnnouncements.filter(a => a.type === 'job').length,
        results: mockAnnouncements.filter(a => a.type === 'result').length,
        admitCards: mockAnnouncements.filter(a => a.type === 'admit-card').length,
        total: mockAnnouncements.length
    };
}

export { mockAnnouncements };