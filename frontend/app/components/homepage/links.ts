export const homePageLinks = {
  home: '/',
  jobs: '/jobs',
  results: '/results',
  admitCards: '/admit-cards',
  answerKey: '/answer-keys',
  syllabus: '/syllabus',
  admissions: '/admissions',
  boardResults: '/board-results',
  scholarship: '/scholarship',
  search: '/search',
  app: '/app',
  certificates: '/certificates',
  importantPage: '/important',
  quickLinks: '/important',
  importantLinks: '/important',
  latestJobs: '/jobs',
  latestAdmission: '/admissions',
  stateJobs: '/states',
  states: '/states',
  organizations: '/organizations',
  bookmarks: '/bookmarks',
  profile: '/profile',
  about: '/about',
  contact: '/contact',
  privacy: '/privacy',
  disclaimer: '/disclaimer',
  advertise: '/advertise',
  joinTelegram: '/join/telegram',
  joinWhatsapp: '/join/whatsapp',
} as const;

const DEFAULT_ADMIN_URL = 'http://localhost:3001/admin';
const DEFAULT_PUBLIC_API_URL = 'http://localhost:5000/api';

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function normalizePath(path = '') {
  if (!path) {
    return '';
  }

  return path.startsWith('/') ? path : `/${path}`;
}

export function getAdminUrl(path = '') {
  const configured = stripTrailingSlash(process.env.NEXT_PUBLIC_ADMIN_URL || DEFAULT_ADMIN_URL);
  const base = configured.endsWith('/admin') ? configured : `${configured}/admin`;
  return `${base}${normalizePath(path)}`;
}

export function getPublicApiUrl(path = '') {
  const configured = stripTrailingSlash(
    process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      DEFAULT_PUBLIC_API_URL,
  );
  const base = configured.endsWith('/api') ? configured : `${configured}/api`;
  return `${base}${normalizePath(path)}`;
}

export function toOfficialUrl(host: string) {
  return `https://${host}`;
}
