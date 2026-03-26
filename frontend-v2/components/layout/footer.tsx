'use client';

import Link from 'next/link';
import { 
  Briefcase, 
  FileText, 
  CreditCard, 
  Key, 
  BookOpen,
  GraduationCap,
} from 'lucide-react';

const footerLinks = {
  categories: [
    { name: 'Govt Jobs', href: '/jobs', icon: Briefcase },
    { name: 'Results', href: '/results', icon: FileText },
    { name: 'Admit Cards', href: '/admit-cards', icon: CreditCard },
    { name: 'Answer Keys', href: '/answer-keys', icon: Key },
    { name: 'Syllabus', href: '/syllabus', icon: BookOpen },
    { name: 'Admissions', href: '/admissions', icon: GraduationCap },
  ],
  topDepartments: [
    { name: 'Railway Jobs', href: '/jobs?department=Railway' },
    { name: 'Banking Jobs', href: '/jobs?department=Banking' },
    { name: 'SSC Recruitment', href: '/jobs?department=SSC' },
    { name: 'UPSC Exams', href: '/jobs?department=UPSC' },
    { name: 'Defence Jobs', href: '/jobs?department=Defence' },
    { name: 'Teaching Jobs', href: '/jobs?department=Teaching' },
  ],
  states: [
    { name: 'UP Govt Jobs', href: '/states/uttar-pradesh' },
    { name: 'Bihar Jobs', href: '/states/bihar' },
    { name: 'MP Govt Jobs', href: '/states/madhya-pradesh' },
    { name: 'Rajasthan Jobs', href: '/states/rajasthan' },
    { name: 'Maharashtra Jobs', href: '/states/maharashtra' },
    { name: 'All States', href: '/states' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Disclaimer', href: '/disclaimer' },
    { name: 'Advertise', href: '/advertise' },
  ],
};

// Custom SVG social icons since lucide-react doesn't have them
const FacebookIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const YoutubeIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const socialLinks = [
  { name: 'Facebook', icon: FacebookIcon, href: '#' },
  { name: 'Twitter', icon: TwitterIcon, href: '#' },
  { name: 'Instagram', icon: InstagramIcon, href: '#' },
  { name: 'YouTube', icon: YoutubeIcon, href: '#' },
];

export function Footer() {
  return (
    <footer className="bg-[#0F172A] text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#F97316] to-[#FB923C]">
                <span className="text-lg font-bold text-white">S</span>
              </div>
              <div>
                <span className="text-xl font-bold text-white">Sarkari</span>
                <span className="text-xl font-bold text-[#F97316]">Exams</span>
              </div>
            </Link>
            <p className="text-sm text-gray-400 mb-4">
              India&apos;s most trusted platform for government job notifications, results, admit cards, and exam updates.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-[#F97316] transition-colors"
                  aria-label={social.name}
                >
                  <social.icon />
                </a>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Categories</h3>
            <ul className="space-y-2">
              {footerLinks.categories.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#F97316] transition-colors"
                  >
                    <link.icon className="h-4 w-4" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Top Departments */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Top Departments</h3>
            <ul className="space-y-2">
              {footerLinks.topDepartments.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-[#F97316] transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* States */}
          <div>
            <h3 className="font-semibold mb-4 text-white">State Jobs</h3>
            <ul className="space-y-2">
              {footerLinks.states.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-[#F97316] transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-[#F97316] transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#F97316]">50K+</p>
              <p className="text-sm text-gray-400">Active Jobs</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#F97316]">10M+</p>
              <p className="text-sm text-gray-400">Monthly Visitors</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#F97316]">100+</p>
              <p className="text-sm text-gray-400">Departments</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#F97316]">28</p>
              <p className="text-sm text-gray-400">States Covered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} SarkariExams.me. All rights reserved.
            </p>
            <p className="text-sm text-gray-400">
              Made with ❤️ for job seekers across India
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
