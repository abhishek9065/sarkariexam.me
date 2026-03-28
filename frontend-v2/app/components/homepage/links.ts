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
  quickLinks: '/#quick-links',
  importantLinks: '/important',
  latestJobs: '/#latest-jobs',
  latestAdmission: '/#latest-admission',
  stateJobs: '/#state-jobs',
  states: '/states',
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

export function toOfficialUrl(host: string) {
  return `https://${host}`;
}
