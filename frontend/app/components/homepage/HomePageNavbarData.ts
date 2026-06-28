import { homePageLinks } from './links';

export type AuthTab = 'login' | 'register';

export const navLinks = [
  { label: 'Home', icon: 'home', badge: null, href: homePageLinks.home },
  { label: 'Latest Jobs', icon: 'briefcase', badge: 'HOT', href: homePageLinks.jobs },
  { label: 'Results', icon: 'clipboard', badge: null, href: homePageLinks.results },
  { label: 'Admit Card', icon: 'file', badge: 'NEW', href: homePageLinks.admitCards },
  { label: 'Answer Key', icon: 'book', badge: null, href: homePageLinks.answerKey },
  { label: 'Syllabus', icon: 'grid', badge: null, href: homePageLinks.syllabus },
  { label: 'Admission', icon: 'cap', badge: 'NEW', href: homePageLinks.admissions },
  { label: 'Board Result', icon: 'award', badge: null, href: homePageLinks.boardResults },
  { label: 'Scholarship', icon: 'school', badge: null, href: homePageLinks.scholarship },
] as const;

export const notifications = [
  'SSC CGL 2026 Notification Out!',
  'UPSC CSE Prelims Result Declared',
  'IBPS PO 2026 Apply Now',
];
