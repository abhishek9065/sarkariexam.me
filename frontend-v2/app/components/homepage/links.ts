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
  quickLinks: '/#quick-links',
  importantLinks: '/#important-links',
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
} as const;

export function toOfficialUrl(host: string) {
  return `https://${host}`;
}
