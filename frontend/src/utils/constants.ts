import type { ContentType } from '../types';

// API Base URL - defaults to empty for nginx reverse proxy, use VITE_API_BASE for custom backend
export const API_BASE = import.meta.env.VITE_API_BASE || '';

export type PageType = 'home' | 'admin' | 'about' | 'contact' | 'privacy' | 'disclaimer' | 'community';
export type TabType = ContentType | 'bookmarks' | 'profile' | 'community' | undefined;

// Navigation menu items
export const NAV_ITEMS = [
    { label: 'Home', type: undefined as TabType },
    { label: 'Result', type: 'result' as TabType },
    { label: 'Jobs', type: 'job' as TabType },
    { label: 'Admit Card', type: 'admit-card' as TabType },
    { label: 'Admission', type: 'admission' as TabType },
    { label: 'Syllabus', type: 'syllabus' as TabType },
    { label: 'Answer Key', type: 'answer-key' as TabType },
    { label: 'Community', type: 'community' as TabType },
    { label: '❤️ My Bookmarks', type: 'bookmarks' as TabType },
];

// Featured items on homepage
export const FEATURED_ITEMS = [
    { title: 'UPSC Civil Services', subtitle: 'Official Updates', color: 'purple', type: 'result' as ContentType },
    { title: 'SSC Notifications', subtitle: 'Latest Announcements', color: 'blue', type: 'result' as ContentType },
    { title: 'Railway Recruitment', subtitle: 'Ongoing Openings', color: 'red', type: 'job' as ContentType },
    { title: 'Banking Exams', subtitle: 'Admit Cards & Results', color: 'orange', type: 'admit-card' as ContentType },
    { title: 'State PSC Updates', subtitle: 'State-wise Notices', color: 'green', type: 'job' as ContentType },
];

// Content sections
export const SECTIONS = [
    { title: 'Latest Result', type: 'result' as ContentType },
    { title: 'Admit Card', type: 'admit-card' as ContentType },
    { title: 'Latest Jobs', type: 'job' as ContentType },
    { title: 'Answer Key', type: 'answer-key' as ContentType },
    { title: 'Syllabus', type: 'syllabus' as ContentType },
    { title: 'Admission', type: 'admission' as ContentType },
];

// Type-specific labels for detail pages
export const TYPE_LABELS: Record<string, { action: string; dateLabel: string; relatedTitle: string }> = {
    'job': { action: 'Apply Online', dateLabel: 'Last Date to Apply', relatedTitle: 'Similar Jobs' },
    'result': { action: 'Check Result', dateLabel: 'Result Date', relatedTitle: 'Other Results' },
    'admit-card': { action: 'Download Admit Card', dateLabel: 'Download Available', relatedTitle: 'Other Admit Cards' },
    'answer-key': { action: 'Check Answer Key', dateLabel: 'Answer Key Date', relatedTitle: 'Other Answer Keys' },
    'admission': { action: 'Apply for Admission', dateLabel: 'Last Date to Apply', relatedTitle: 'Other Admissions' },
    'syllabus': { action: 'Download Syllabus', dateLabel: 'Syllabus Available', relatedTitle: 'Other Syllabus' }
};

// Type-specific selection modes
export const SELECTION_MODES: Record<string, string[]> = {
    'job': ['Online Written Examination', 'Document Verification', 'Skill Test / Interview (If Required)', 'Medical Examination'],
    'result': ['Merit List Based', 'Cut-Off Marks', 'Category Wise Selection', 'Final Merit List'],
    'admit-card': ['Online Exam Hall Ticket', 'Photo & Signature Verification', 'Exam Center Allocation'],
    'answer-key': ['Provisional Answer Key', 'Objection Window', 'Final Answer Key', 'Result Declaration'],
    'admission': ['Merit Based Selection', 'Entrance Exam (If Required)', 'Counselling Process', 'Document Verification'],
    'syllabus': ['Subject Wise Topics', 'Exam Pattern', 'Important Topics', 'Previous Year Papers']
};

// SEO-friendly Route Paths
export const PATHS: Record<string, string> = {
    'job': '/jobs',
    'result': '/results',
    'admit-card': '/admit-card',
    'answer-key': '/answer-key',
    'admission': '/admission',
    'syllabus': '/syllabus',
    'bookmarks': '/bookmarks',
    'community': '/community',
    'undefined': '/' // Home
};
