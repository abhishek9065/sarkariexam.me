'use client';

import {
  ArrowRight,
  ChevronRight,
  Clock,
  GraduationCap,
  Heart,
  Mail,
  MapPin,
  Phone,
  Send,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { buildCommunityPath } from '@/app/lib/public-content';
import { subscribeToAlerts } from '@/lib/alert-subscriptions';
import { homePageLinks } from './links';

const footerColumns = {
  'Quick Links': [
    { label: 'Latest Jobs', badge: '342', href: homePageLinks.jobs },
    { label: 'Results', badge: '89', href: homePageLinks.results },
    { label: 'Admit Card', badge: '128', href: homePageLinks.admitCards },
    { label: 'Answer Key', href: homePageLinks.answerKey },
    { label: 'Syllabus', href: homePageLinks.syllabus },
    { label: 'Admission', href: homePageLinks.admissions },
    { label: 'Board Result', href: homePageLinks.boardResults },
  ],
  'Top Exams': [
    { label: 'UPSC CSE', badge: 'HOT', href: homePageLinks.results },
    { label: 'SSC CGL', badge: 'HOT', href: homePageLinks.jobs },
    { label: 'SSC CHSL', href: homePageLinks.jobs },
    { label: 'IBPS PO', href: homePageLinks.jobs },
    { label: 'Railway NTPC', href: homePageLinks.jobs },
    { label: 'NDA', href: homePageLinks.admissions },
    { label: 'CTET', href: homePageLinks.answerKey },
    { label: 'SBI PO', href: homePageLinks.jobs },
  ],
  'State Jobs': [
    { label: 'Uttar Pradesh', href: '/states/uttar-pradesh' },
    { label: 'Bihar', href: '/states/bihar' },
    { label: 'Rajasthan', href: '/states/rajasthan' },
    { label: 'Madhya Pradesh', href: '/states/madhya-pradesh' },
    { label: 'Maharashtra', href: '/states/maharashtra' },
    { label: 'Delhi', href: '/states/delhi' },
    { label: 'Gujarat', href: '/states/gujarat' },
    { label: 'Haryana', href: '/states/haryana' },
  ],
} as const;

function TwitterGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M22 5.8c-.7.3-1.5.6-2.3.7.8-.5 1.4-1.2 1.7-2.1-.8.5-1.7.8-2.6 1-1.5-1.6-4-1.7-5.6-.2-1 1-1.5 2.4-1.2 3.8-3-.2-5.8-1.7-7.6-4-.9 1.5-.5 3.5 1 4.6-.6 0-1.2-.2-1.7-.5 0 1.9 1.3 3.5 3.1 3.9-.6.2-1.2.2-1.8.1.5 1.6 2 2.7 3.8 2.8-1.4 1.1-3.1 1.7-4.9 1.7H3c1.8 1.2 4 1.9 6.2 1.9 7.4 0 11.4-6.1 11.4-11.4v-.5c.8-.6 1.5-1.3 2-2.1Z" />
    </svg>
  );
}

function YouTubeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="6" width="18" height="12" rx="4" fill="currentColor" />
      <path d="M10 9.5 15.5 12 10 14.5Z" fill="white" />
    </svg>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="7" r="1.2" fill="currentColor" />
    </svg>
  );
}

const socials = [
  { icon: TwitterGlyph, label: 'Twitter', href: buildCommunityPath('twitter'), color: 'hover:bg-sky-500 hover:border-sky-400' },
  { icon: YouTubeGlyph, label: 'YouTube', href: buildCommunityPath('youtube'), color: 'hover:bg-red-600 hover:border-red-500' },
  { icon: InstagramGlyph, label: 'Instagram', href: buildCommunityPath('instagram'), color: 'hover:bg-pink-600 hover:border-pink-500' },
  { icon: Send, label: 'Telegram', href: buildCommunityPath('telegram'), color: 'hover:bg-blue-500 hover:border-blue-400' },
] as const;

const trustStats = [
  { icon: Users, value: '14L+', label: 'Active Users' },
  { icon: Shield, value: '100%', label: 'Verified Info' },
  { icon: Clock, value: '5 Min', label: 'Update Cycle' },
] as const;

const legalLinks = [
  { label: 'Privacy Policy', href: homePageLinks.privacy },
  { label: 'Terms of Use', href: homePageLinks.disclaimer },
  { label: 'Disclaimer', href: homePageLinks.disclaimer },
  { label: 'Sitemap', href: '/sitemap.xml' },
  { label: 'Contact Us', href: homePageLinks.contact },
] as const;

export function HomePageFooter() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState('');

  async function handleSubscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await subscribeToAlerts({
        email,
        frequency: 'daily',
        source: 'homepage-footer',
      });
      setIsSubscribed(true);
      setSubscriptionMessage(response.message || 'Subscription saved.');
      setEmail('');
    } catch (error) {
      setIsSubscribed(false);
      setSubscriptionMessage(error instanceof Error ? error.message : 'Failed to subscribe.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <footer
      id="footer-links"
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0a1240 0%, #1a237e 40%, #0d1860 100%)' }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, #e65100 0%, transparent 70%)', transform: 'translate(30%, -30%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, #1565c0 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }}
      />

      <div className="relative border-b border-white/8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-yellow-400/25 bg-yellow-400/15">
              <GraduationCap size={16} className="text-yellow-300" />
            </div>
            <span className="text-[15px] font-extrabold tracking-[-0.02em] text-white">
              SarkariExams<span className="text-yellow-300">.me</span>
            </span>
          </div>
          <div className="flex items-center gap-6 sm:gap-10">
            {trustStats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/8">
                  <stat.icon size={13} className="text-yellow-300" />
                </div>
                <div>
                  <div className="text-[13px] font-extrabold leading-none text-white">{stat.value}</div>
                  <div className="text-[10px] leading-tight text-blue-300">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="mb-6 text-[13px] leading-[1.8] text-blue-200">
              Sarkari Naukri alerts, results, admit cards, and answer keys for
              <span className="text-white"> 500+ exams</span> across departments and states.
            </p>

            <div className="mb-6 space-y-2.5">
              {[
                { icon: Mail, text: 'info@sarkariexams.me' },
                { icon: Phone, text: '+91 98765 43210' },
                { icon: MapPin, text: 'New Delhi, India' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/8">
                    <Icon size={12} className="text-yellow-300" />
                  </div>
                  <span className="text-[12px] text-blue-200">{text}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/8 transition-all duration-200 hover:scale-110 hover:shadow-lg ${social.color}`}
                >
                  <social.icon size={14} className="text-white" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerColumns).map(([title, links]) => (
            <div key={title} className="lg:col-span-1">
              <h4 className="mb-4 flex items-center gap-2 text-[12px] font-bold tracking-[0.08em] text-white">
                <span className="h-0.5 w-4 rounded-full bg-[#e65100]" />
                {title.toUpperCase()}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group flex items-center justify-between text-[12px] text-blue-300 transition-colors hover:text-white"
                    >
                      <span className="flex items-center gap-1.5 transition-transform group-hover:translate-x-0.5">
                        <ChevronRight size={11} className="text-blue-600 transition-colors group-hover:text-[#e65100]" />
                        {link.label}
                      </span>
                      {'badge' in link && link.badge && (
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold text-white ${
                            link.badge === 'HOT' ? 'bg-red-500' : 'bg-white/15'
                          }`}
                        >
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="relative mt-12 overflow-hidden rounded-2xl">
          <div
            className="absolute inset-0 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(230,81,0,0.18) 0%, rgba(255,255,255,0.04) 100%)' }}
          />
          <div className="absolute inset-0 rounded-2xl border border-white/10" />

          <div className="relative flex flex-col items-center gap-6 px-6 py-6 sm:flex-row">
            <div className="flex-1 text-center sm:text-left">
              <div className="mb-1 flex items-center justify-center gap-2 sm:justify-start">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e65100]">
                  <Send size={10} className="text-white" />
                </span>
                <span className="text-[10px] font-extrabold tracking-[0.1em] text-[#e65100]">JOB ALERTS</span>
              </div>
              <p className="mb-0.5 text-[16px] font-extrabold tracking-[-0.02em] text-white">Get Instant Job Alerts</p>
              <p className="text-[12px] text-blue-300">
                Daily digest with new jobs, results, and admit cards in your inbox.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="flex w-full items-center gap-2 sm:w-auto">
              {isSubscribed ? (
                <div className="flex items-center gap-2 rounded-xl border border-green-400/30 bg-green-500/20 px-4 py-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[13px] font-semibold text-green-300">{subscriptionMessage || 'You’re subscribed!'}</span>
                </div>
              ) : (
                <>
                  <div className="relative flex-1 sm:w-56">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="your@email.com"
                      className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pl-8 pr-3 text-[12px] text-white outline-none transition-all placeholder:text-blue-400 focus:border-white/35 focus:bg-white/15"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#e65100] to-[#bf360c] px-4 py-2.5 text-[12px] font-bold text-white transition-all hover:-translate-y-px hover:opacity-90 hover:shadow-lg"
                  >
                    {isSubmitting ? 'Saving...' : 'Subscribe'}
                    <ArrowRight size={13} />
                  </button>
                </>
              )}
            </form>
            {!isSubscribed && subscriptionMessage ? <p className="text-[11px] text-amber-300">{subscriptionMessage}</p> : null}
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/8">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-center text-[11px] text-blue-400 sm:text-left">
              © 2026 <span className="text-blue-300">SarkariExams.me</span>. All rights reserved. Not affiliated with
              any government body.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {legalLinks.map((link) => (
                <Link key={link.label} href={link.href} className="text-[11px] text-blue-400 transition-colors hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-blue-500">
            Made with <Heart size={10} className="fill-red-400 text-red-400" /> in India · Serving job seekers since 2018
          </div>
        </div>
      </div>
    </footer>
  );
}
