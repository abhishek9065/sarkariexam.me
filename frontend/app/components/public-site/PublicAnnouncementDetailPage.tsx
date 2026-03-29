'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Bell,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Copy,
  CornerDownRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  Home,
  IndianRupee,
  Info,
  Link2,
  MapPin,
  MessageCircle,
  MessageSquare,
  Newspaper,
  Printer,
  Send,
  Share2,
  Shield,
  ThumbsUp,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  AnnouncementItem,
  CategoryPageMeta,
  DetailImportantLink,
  DetailQaQuestion,
  DetailRelatedPost,
  PortalListEntry,
} from '@/app/lib/public-content';
import { buildCommunityPath } from '@/app/lib/public-content';
import { cn } from '@/lib/utils';

interface PublicAnnouncementDetailPageProps {
  item: AnnouncementItem;
  meta: CategoryPageMeta;
  relatedEntries: PortalListEntry[];
}

interface SectionVisualTheme {
  activePill: string;
  accentSoft: string;
  bullet: string;
  surfaceGlow: string;
}

interface NavSection {
  id: string;
  icon: typeof Info;
  label: string;
}

type InteractiveQaQuestion = DetailQaQuestion;

const sectionVisualTheme: Record<AnnouncementItem['section'], SectionVisualTheme> = {
  jobs: {
    activePill: 'border-orange-200 bg-orange-50 text-[#bf360c]',
    accentSoft: 'border-orange-200 bg-orange-50 text-[#e65100]',
    bullet: 'bg-orange-500',
    surfaceGlow: 'from-[#fff8f5] to-white',
  },
  results: {
    activePill: 'border-red-200 bg-red-50 text-[#b71c1c]',
    accentSoft: 'border-red-200 bg-red-50 text-[#c62828]',
    bullet: 'bg-red-500',
    surfaceGlow: 'from-[#fff5f5] to-white',
  },
  'admit-cards': {
    activePill: 'border-purple-200 bg-purple-50 text-[#5b1683]',
    accentSoft: 'border-purple-200 bg-purple-50 text-[#6a1b9a]',
    bullet: 'bg-purple-500',
    surfaceGlow: 'from-[#fbf5ff] to-white',
  },
  'answer-keys': {
    activePill: 'border-teal-200 bg-teal-50 text-[#00564b]',
    accentSoft: 'border-teal-200 bg-teal-50 text-[#00695c]',
    bullet: 'bg-teal-500',
    surfaceGlow: 'from-[#f2fffd] to-white',
  },
  admissions: {
    activePill: 'border-pink-200 bg-pink-50 text-[#910e48]',
    accentSoft: 'border-pink-200 bg-pink-50 text-[#ad1457]',
    bullet: 'bg-pink-500',
    surfaceGlow: 'from-[#fff4fb] to-white',
  },
};

const tagConfig = {
  hot: 'border-red-400 bg-red-500 text-white',
  new: 'border-emerald-400 bg-emerald-500 text-white',
  update: 'border-blue-400 bg-blue-500 text-white',
  'last-date': 'border-amber-400 bg-amber-500 text-white',
} as const;

const statusConfig = {
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  active: 'border-orange-200 bg-orange-50 text-[#bf360c]',
  upcoming: 'border-blue-200 bg-blue-50 text-blue-700',
} as const;

function isExternalHref(href: string) {
  return href.startsWith('http://') || href.startsWith('https://');
}

function SmartLink({
  href,
  className,
  children,
}: {
  children: ReactNode;
  className: string;
  href: string;
}) {
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function parseCount(value: string) {
  const parsed = Number.parseInt(value.replace(/,/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en-IN').format(value);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function createInteractiveQa(qa: DetailQaQuestion[]): InteractiveQaQuestion[] {
  return qa.map((question) => ({
    ...question,
    liked: question.liked ?? false,
    answers: question.answers.map((answer) => ({
      ...answer,
      liked: answer.liked ?? false,
    })),
  }));
}

function buildFallbackRelatedPosts(meta: CategoryPageMeta, relatedEntries: PortalListEntry[]): DetailRelatedPost[] {
  return relatedEntries.slice(0, 5).map((entry) => ({
    title: entry.title,
    href: entry.href,
    date: entry.date.replace(/\s+\d{4}$/, ''),
    tag: entry.tag,
    posts: entry.postCount,
    category: meta.title,
  }));
}

function renderLinkIcon(link: DetailImportantLink) {
  switch (link.icon) {
    case 'apply':
      return <ArrowRight size={18} />;
    case 'pdf':
      return <Download size={18} />;
    case 'doc':
      return <FileText size={18} />;
    case 'web':
      return <ExternalLink size={18} />;
    case 'card':
      return <Download size={18} />;
    case 'result':
      return <BadgeCheck size={18} />;
    default:
      return <Link2 size={18} />;
  }
}

function SectionCard({
  title,
  eyebrow,
  icon,
  children,
  surfaceGlow,
}: {
  children: ReactNode;
  eyebrow?: string;
  icon: ReactNode;
  surfaceGlow: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className={cn('border-b border-gray-100 bg-gradient-to-r px-5 py-4', surfaceGlow)}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/5 bg-white text-gray-700 shadow-sm">
            {icon}
          </div>
          <div>
            {eyebrow ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">{eyebrow}</p>
            ) : null}
            <h2 className="text-[16px] font-extrabold text-gray-900">{title}</h2>
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-[#fcfcfd] px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">{label}</div>
      <div className="mt-1 text-sm font-semibold leading-6 text-gray-800">{value}</div>
    </div>
  );
}

function ImportantLinkCard({ link }: { link: DetailImportantLink }) {
  const emphasis = link.emphasis ?? 'muted';
  const classes = {
    primary:
      'border-transparent bg-[linear-gradient(135deg,#e65100,#bf360c)] text-white shadow-[0_12px_28px_rgba(230,81,0,0.22)] hover:opacity-95',
    secondary: 'border-orange-200 bg-orange-50 text-[#bf360c] hover:border-orange-300 hover:bg-orange-100',
    muted: 'border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-[#bf360c]',
  } as const;

  return (
    <SmartLink
      href={link.href}
      className={cn(
        'group flex items-start gap-3 rounded-[18px] border px-4 py-3 transition-all',
        classes[emphasis],
        link.type === 'disabled' && 'pointer-events-none opacity-60',
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-current/15 bg-current/10">
        {renderLinkIcon(link)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{link.label}</div>
        <div className="mt-1 text-[11px] opacity-80">{link.note ?? link.type?.replace('-', ' ') ?? 'Important resource'}</div>
      </div>
      <ExternalLink size={15} className="mt-1 shrink-0 opacity-75 transition-transform group-hover:-translate-y-0.5" />
    </SmartLink>
  );
}

function PublicAnnouncementDetailPageInner({
  item,
  meta,
  relatedEntries,
}: PublicAnnouncementDetailPageProps) {
  const detail = item.detail;
  const visualTheme = sectionVisualTheme[item.section];
  const accent = detail.theme?.accent ?? '#e65100';
  const heroGradient = `linear-gradient(145deg, ${detail.theme?.gradientFrom ?? '#08103a'} 0%, ${detail.theme?.gradientTo ?? '#1a237e'} 64%, #1a237e 100%)`;
  const sidebarGradient = `linear-gradient(145deg, ${detail.theme?.sidebarFrom ?? detail.theme?.gradientFrom ?? '#1a237e'} 0%, ${detail.theme?.sidebarTo ?? detail.theme?.gradientTo ?? '#bf360c'} 100%)`;
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeSection, setActiveSection] = useState('shortinfo');
  const [readProgress, setReadProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [helpful, setHelpful] = useState(false);
  const [likeCount, setLikeCount] = useState(parseCount(detail.engagement.likes));
  const [mobileCtaVisible, setMobileCtaVisible] = useState(false);
  const [qaList, setQaList] = useState<InteractiveQaQuestion[]>(() => createInteractiveQa(detail.qa));
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>(detail.qa[0] ? [detail.qa[0].id] : []);
  const [askOpen, setAskOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newQuestionAuthor, setNewQuestionAuthor] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const primaryAction =
    detail.importantLinks.find((link) => link.emphasis === 'primary') ??
    (detail.cta ? { href: detail.cta.primaryHref, label: detail.cta.primaryLabel, emphasis: 'primary' as const } : null);
  const secondaryAction =
    detail.importantLinks.find((link) => link.href !== primaryAction?.href && link.emphasis !== 'primary') ??
    (detail.cta?.secondaryHref && detail.cta.secondaryLabel
      ? { href: detail.cta.secondaryHref, label: detail.cta.secondaryLabel, emphasis: 'secondary' as const }
      : null);
  const heroStats = detail.heroStats.length ? detail.heroStats : [];
  const relatedPosts = detail.relatedPosts.length ? detail.relatedPosts : buildFallbackRelatedPosts(meta, relatedEntries);
  const detailRows = [
    { label: 'Post / Update Name', value: item.title },
    { label: 'Organization', value: item.org },
    { label: 'Published Date', value: detail.summaryMeta.publishedDate },
    { label: 'Last Date', value: detail.summaryMeta.lastDate },
    { label: 'Application Start', value: detail.summaryMeta.applicationStartDate },
    { label: 'Exam / Status', value: detail.summaryMeta.examDate },
    { label: 'Qualification', value: item.qualification ?? 'Refer official notice' },
    { label: 'Age Limit', value: detail.summaryMeta.ageLimit ?? detail.ageLimit?.summary ?? 'Refer official notice' },
    { label: 'Salary / Pay', value: detail.summaryMeta.salary },
    { label: 'Location', value: detail.summaryMeta.location },
    { label: 'Short Information', value: item.shortInfo },
  ];
  const navSections: NavSection[] = [
    { id: 'shortinfo', label: 'Short Info', icon: Info },
    { id: 'overview', label: 'Overview', icon: FileText },
    ...(detail.importantDates.length ? [{ id: 'dates', label: 'Dates', icon: Calendar }] : []),
    ...(detail.eligibility.length ? [{ id: 'eligibility', label: 'Eligibility', icon: GraduationCap }] : []),
    ...(detail.vacancyTable?.rows.length ? [{ id: 'vacancy', label: 'Vacancy', icon: Briefcase }] : []),
    ...(detail.importantLinks.length ? [{ id: 'links', label: 'Imp. Links', icon: Link2 }] : []),
    { id: 'qa', label: 'Q&A', icon: MessageSquare },
  ];
  const navKey = navSections.map((section) => section.id).join('|');
  const commentsLabel = detail.engagement.comments.toLocaleString('en-IN');
  const totalHelpfulLabel = formatCount(likeCount);

  useEffect(() => {
    const sectionIds = navKey ? navKey.split('|') : [];

    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setReadProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
      setMobileCtaVisible(scrollTop > 300);

      for (let index = sectionIds.length - 1; index >= 0; index -= 1) {
        const node = sectionRefs.current[sectionIds[index]];

        if (!node) {
          continue;
        }

        if (node.getBoundingClientRect().top <= 150) {
          setActiveSection(sectionIds[index]);
          break;
        }
      }
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [navKey]);

  const qaSummary = useMemo(
    () =>
      qaList.reduce(
        (accumulator, question) => ({
          answers: accumulator.answers + question.answers.length,
          questions: accumulator.questions + 1,
        }),
        { answers: 0, questions: 0 },
      ),
    [qaList],
  );

  function scrollToSection(id: string) {
    const node = sectionRefs.current[id];

    if (!node) {
      return;
    }

    const top = node.getBoundingClientRect().top + window.scrollY - 126;
    window.scrollTo({ top, behavior: 'smooth' });
    setActiveSection(id);
  }

  async function handleCopyLink() {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: item.title,
        url: window.location.href,
      });
      return;
    }

    await handleCopyLink();
  }

  function handlePrint() {
    window.print();
  }

  function toggleQuestion(questionId: number) {
    setExpandedQuestions((current) =>
      current.includes(questionId) ? current.filter((value) => value !== questionId) : [...current, questionId],
    );
  }

  function handleHelpfulToggle() {
    setHelpful((current) => {
      setLikeCount((previous) => previous + (current ? -1 : 1));
      return !current;
    });
  }

  function handleQuestionUpvote(questionId: number) {
    setQaList((current) =>
      current.map((question) =>
        question.id !== questionId
          ? question
          : {
              ...question,
              liked: !question.liked,
              likes: question.likes + (question.liked ? -1 : 1),
            },
      ),
    );
  }

  function handleAnswerUpvote(questionId: number, answerId: number) {
    setQaList((current) =>
      current.map((question) =>
        question.id !== questionId
          ? question
          : {
              ...question,
              answers: question.answers.map((answer) =>
                answer.id !== answerId
                  ? answer
                  : {
                      ...answer,
                      liked: !answer.liked,
                      likes: answer.likes + (answer.liked ? -1 : 1),
                    },
              ),
            },
      ),
    );
  }

  function handleSubmitQuestion() {
    if (!newQuestion.trim()) {
      return;
    }

    const author = newQuestionAuthor.trim() || 'Site Visitor';
    const newEntry: InteractiveQaQuestion = {
      id: qaList.length ? Math.max(...qaList.map((question) => question.id)) + 1 : 1,
      author,
      initials: getInitials(author),
      avatarColor: '#0f766e',
      text: newQuestion.trim(),
      time: 'Just now',
      likes: 0,
      liked: false,
      answers: [],
    };

    setQaList((current) => [newEntry, ...current]);
    setExpandedQuestions((current) => [newEntry.id, ...current]);
    setAskOpen(false);
    setNewQuestion('');
    setNewQuestionAuthor('');
  }

  function handleSubmitReply(questionId: number) {
    if (!replyText.trim()) {
      return;
    }

    const author = replyAuthor.trim() || `${detail.summaryMeta.orgShort} Reader`;

    setQaList((current) =>
      current.map((question) =>
        question.id !== questionId
          ? question
          : {
              ...question,
              answers: [
                ...question.answers,
                {
                  id: question.answers.length ? Math.max(...question.answers.map((answer) => answer.id)) + 1 : 1,
                  author,
                  initials: getInitials(author),
                  avatarColor: '#1d4ed8',
                  text: replyText.trim(),
                  time: 'Just now',
                  likes: 0,
                  liked: false,
                },
              ],
            },
      ),
    );

    if (!expandedQuestions.includes(questionId)) {
      setExpandedQuestions((current) => [...current, questionId]);
    }

    setReplyingTo(null);
    setReplyText('');
    setReplyAuthor('');
  }

  function handleSubscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      return;
    }

    setIsSubscribed(true);
    setEmail('');
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 md:px-4">
      <div
        className="pointer-events-none fixed left-0 top-0 z-[60] h-[3px] bg-gradient-to-r from-[#e65100] via-[#ffb300] to-[#1565c0]"
        style={{ width: `${readProgress}%` }}
      />

      <section className="relative overflow-hidden rounded-[30px] shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0" style={{ background: heroGradient }} />
        <div
          className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.28), transparent 72%)' }}
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
        />

        <div className="relative border-b border-white/12 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-100">
              <Home size={12} />
              Homepage
            </Link>
            <span>/</span>
            <Link href={meta.canonicalPath} className="transition-opacity hover:opacity-100">
              {meta.title}
            </Link>
            <span>/</span>
            <span className="text-white/90">{detail.summaryMeta.orgShort}</span>
          </div>
        </div>

        <div className="relative px-5 py-6 md:px-6 md:py-7">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_360px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/85">
                  {detail.eyebrow}
                </span>
                <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">
                  {meta.title}
                </span>
                {item.tag ? (
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]',
                      tagConfig[item.tag],
                    )}
                  >
                    {item.tag.replace('-', ' ')}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-4 max-w-5xl text-[30px] font-black leading-tight text-white md:text-[44px]">
                {item.title}
              </h1>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-white/84 md:text-[15px]">{item.summary}</p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5 text-[11px] font-semibold text-white/80">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
                  <Building2 size={12} />
                  {item.org}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
                  <MapPin size={12} />
                  {detail.summaryMeta.location}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
                  <Clock size={12} />
                  Updated {detail.summaryMeta.publishedDate}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
                  <Eye size={12} />
                  {detail.engagement.views} views
                </span>
                {item.postCount ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
                    <Users size={12} />
                    {item.postCount} posts
                  </span>
                ) : null}
                {item.qualification ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
                    <GraduationCap size={12} />
                    {item.qualification}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSaved((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/18 bg-white/10 px-3.5 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/15"
                >
                  {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  {saved ? 'Saved' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/18 bg-white/10 px-3.5 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/15"
                >
                  <Share2 size={14} />
                  Share
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/18 bg-white/10 px-3.5 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/15"
                >
                  <Printer size={14} />
                  Print
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[22px] border border-white/16 bg-white/10 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/68">{stat.label}</div>
                    <div className="mt-2 text-xl font-black text-white">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/16 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Update Snapshot</div>
                  <div className="mt-1 text-lg font-extrabold text-white">Keep the official notice close</div>
                </div>
                <div className="rounded-full border border-white/18 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">
                  {detail.summaryMeta.orgShort}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {detailRows.slice(1, 6).map((row) => (
                  <div key={`${row.label}-${row.value}`} className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">{row.label}</div>
                    <div className="mt-1 text-sm font-semibold leading-6 text-white">{row.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                  <Shield size={13} />
                  Official-first reminder
                </div>
                <p className="mt-2 text-sm leading-6 text-white/82">
                  Verify dates, fee, qualification, and result instructions from the authority PDF or website before taking action.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {primaryAction ? (
                  <SmartLink
                    href={primaryAction.href}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ff8a3d,#bf360c)] px-4 py-3 text-sm font-bold text-white shadow-[0_16px_28px_rgba(230,81,0,0.28)]"
                  >
                    {primaryAction.label}
                    <ArrowRight size={15} />
                  </SmartLink>
                ) : null}
                {secondaryAction ? (
                  <SmartLink
                    href={secondaryAction.href}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                  >
                    {secondaryAction.label}
                    <ExternalLink size={14} />
                  </SmartLink>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 space-y-4 pb-24 lg:pb-0">
        <nav className="sticky top-[104px] z-20 overflow-x-auto rounded-[22px] border border-white/70 bg-white/90 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex min-w-max items-center gap-1 px-2 py-2">
            {navSections.map((section) => {
              const Icon = section.icon;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[12px] font-bold transition-all',
                    activeSection === section.id
                      ? visualTheme.activePill
                      : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <Icon size={13} />
                  {section.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.78fr)_360px]">
          <div className="space-y-4">
            {detail.notice ? (
              <div className="overflow-hidden rounded-[24px] border border-amber-200 bg-amber-50 shadow-sm">
                <div className="flex items-start gap-3 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <div className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-amber-800">{detail.notice.title}</div>
                    <div className="mt-2 space-y-2 text-sm leading-7 text-amber-900">
                      {detail.notice.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div
              id="shortinfo"
              ref={(node) => {
                sectionRefs.current.shortinfo = node;
              }}
              className="scroll-mt-[150px]"
            >
              <SectionCard title="Short Information" eyebrow={meta.eyebrow} icon={<ClipboardList size={18} />} surfaceGlow={visualTheme.surfaceGlow}>
                <div className="grid gap-3 md:grid-cols-2">
                  {detailRows.map((row) => (
                    <InfoTile key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
                  ))}
                </div>
              </SectionCard>
            </div>

            <div
              id="overview"
              ref={(node) => {
                sectionRefs.current.overview = node;
              }}
              className="scroll-mt-[150px]"
            >
              <SectionCard title={detail.overviewTitle ?? 'Overview'} icon={<FileText size={18} />} surfaceGlow={visualTheme.surfaceGlow}>
                <div className="space-y-5">
                  <p className="text-[15px] leading-8 text-gray-700">{item.summary}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {item.keyPoints.map((point) => (
                      <div key={point} className="rounded-2xl border border-gray-200 bg-[#fcfcfd] px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', visualTheme.bullet)} />
                          <p className="text-sm leading-7 text-gray-700">{point}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>

            {detail.importantDates.length ? (
              <div
                id="dates"
                ref={(node) => {
                  sectionRefs.current.dates = node;
                }}
                className="scroll-mt-[150px]"
              >
                <SectionCard title="Important Dates" icon={<Calendar size={18} />} surfaceGlow={visualTheme.surfaceGlow}>
                  <div className="overflow-hidden rounded-[20px] border border-gray-200">
                    <div className={cn('grid grid-cols-[1.3fr_1fr_auto] gap-3 border-b border-gray-200 bg-gradient-to-r px-4 py-3', visualTheme.surfaceGlow)}>
                      <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: accent }}>Event / Activity</span>
                      <span className="text-right text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: accent }}>Date</span>
                      <span className="text-right text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: accent }}>Status</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {detail.importantDates.map((row) => (
                        <div key={`${row.label}-${row.date}`} className="grid grid-cols-[1.3fr_1fr_auto] gap-3 px-4 py-3">
                          <div className="text-sm font-semibold leading-6 text-gray-800">{row.label}</div>
                          <div className="text-right text-sm font-bold text-gray-700">{row.date}</div>
                          <div className="text-right">
                            {row.status ? (
                              <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]', statusConfig[row.status])}>
                                {row.status}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Tracked</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {detail.applicationFee ? (
              <SectionCard title={detail.applicationFee.title ?? 'Application Fee'} icon={<IndianRupee size={18} />} surfaceGlow={visualTheme.surfaceGlow}>
                <div className="grid gap-3 md:grid-cols-2">
                  {detail.applicationFee.rows.map((row) => (
                    <InfoTile key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
                  ))}
                </div>
                {detail.applicationFee.note ? (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-[#fcfcfd] px-4 py-3 text-sm leading-7 text-gray-600">
                    {detail.applicationFee.note}
                  </div>
                ) : null}
              </SectionCard>
            ) : null}

            {detail.ageLimit ? (
              <SectionCard title="Age Limit" icon={<Shield size={18} />} surfaceGlow={visualTheme.surfaceGlow}>
                <div className="rounded-[20px] border border-gray-200 bg-[#fcfcfd] px-4 py-4">
                  <p className="text-sm font-semibold leading-7 text-gray-800">{detail.ageLimit.summary}</p>
                  <div className="mt-4 space-y-3">
                    {detail.ageLimit.points.map((point) => (
                      <div key={point} className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="mt-1 shrink-0" style={{ color: accent }} />
                        <p className="text-sm leading-7 text-gray-700">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            ) : null}

            {detail.eligibility.length ? (
              <div
                id="eligibility"
                ref={(node) => {
                  sectionRefs.current.eligibility = node;
                }}
                className="scroll-mt-[150px]"
              >
                <SectionCard title="Eligibility Details" icon={<GraduationCap size={18} />} surfaceGlow={visualTheme.surfaceGlow}>
                  <div className="grid gap-3 md:grid-cols-2">
                    {detail.eligibility.map((block) => (
                      <div key={block.title} className="rounded-[20px] border border-gray-200 bg-[#fcfcfd] px-4 py-4">
                        <h3 className="text-[14px] font-extrabold text-gray-900">{block.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-gray-700">{block.description}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            ) : null}
            
            {detail.vacancyTable?.rows.length ? (
              <div
                id="vacancy"
                ref={(node) => {
                  sectionRefs.current.vacancy = node;
                }}
                className="scroll-mt-[150px]"
              >
                <SectionCard title="Vacancy / Post Details" icon={<Briefcase size={18} />} surfaceGlow={visualTheme.surfaceGlow}>
                  <div className="overflow-x-auto rounded-[20px] border border-gray-200">
                    <table className="min-w-full border-collapse text-left">
                      <thead className={cn('bg-gradient-to-r', visualTheme.surfaceGlow)}>
                        <tr>
                          {detail.vacancyTable.columns.map((column) => (
                            <th key={column} className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: accent }}>
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detail.vacancyTable.rows.map((row) => (
                          <tr key={`${row.post}-${row.department}`}>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">{row.post}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.department}</td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-800">{row.vacancies}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.payLevel ?? 'Refer notice'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.salary ?? 'Refer notice'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {detail.selectionProcess?.length ? (
              <SectionCard title="Selection Process" icon={<BadgeCheck size={18} />} surfaceGlow={visualTheme.surfaceGlow}>
                <div className="space-y-3">
                  {detail.selectionProcess.map((step, index) => (
                    <div key={step} className="flex items-start gap-3 rounded-[20px] border border-gray-200 bg-[#fcfcfd] px-4 py-4">
                      <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[12px] font-extrabold', visualTheme.accentSoft)}>
                        {index + 1}
                      </span>
                      <p className="text-sm leading-7 text-gray-700">{step}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {detail.howToApply?.length ? (
              <SectionCard title="How To Apply / Use This Update" icon={<Newspaper size={18} />} surfaceGlow={visualTheme.surfaceGlow}>
                <div className="space-y-3">
                  {detail.howToApply.map((step, index) => (
                    <div key={step} className="flex items-start gap-3 rounded-[20px] border border-gray-200 bg-[#fcfcfd] px-4 py-4">
                      <span
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-extrabold text-white"
                        style={{ background: `linear-gradient(135deg, ${accent}, #1a237e)` }}
                      >
                        {index + 1}
                      </span>
                      <p className="text-sm leading-7 text-gray-700">{step}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {detail.extraSections?.map((section) => (
              <SectionCard key={section.id} title={section.title} eyebrow={section.eyebrow} icon={<FileText size={18} />} surfaceGlow={visualTheme.surfaceGlow}>
                <div className="space-y-4">
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-gray-700">{paragraph}</p>
                  ))}
                  {section.points?.length ? (
                    <div className="grid gap-3">
                      {section.points.map((point) => (
                        <div key={point} className="rounded-[20px] border border-gray-200 bg-[#fcfcfd] px-4 py-3">
                          <div className="flex items-start gap-2.5">
                            <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', visualTheme.bullet)} />
                            <p className="text-sm leading-7 text-gray-700">{point}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            ))}

            {detail.importantLinks.length ? (
              <div
                id="links"
                ref={(node) => {
                  sectionRefs.current.links = node;
                }}
                className="scroll-mt-[150px]"
              >
                <SectionCard title="Important Links" icon={<Link2 size={18} />} surfaceGlow={visualTheme.surfaceGlow}>
                  <div className="grid gap-3 md:grid-cols-2">
                    {detail.importantLinks.map((link) => (
                      <ImportantLinkCard key={`${link.label}-${link.href}`} link={link} />
                    ))}
                  </div>
                </SectionCard>
              </div>
            ) : null}

            <div className="rounded-[24px] border border-gray-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Reader Actions</div>
                  <div className="mt-1 text-lg font-extrabold text-gray-900">Like, copy, share, or print this page</div>
                </div>
                <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                  {detail.summaryMeta.orgShort} Public Detail
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleHelpfulToggle}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12px] font-semibold transition-colors',
                      helpful ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    <ThumbsUp size={14} className={helpful ? 'fill-current' : ''} />
                    {totalHelpfulLabel} Helpful
                  </button>
                  <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[12px] font-semibold text-gray-700">
                    <Eye size={14} />
                    {detail.engagement.views} Views
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[12px] font-semibold text-gray-700">
                    <MessageSquare size={14} />
                    {commentsLabel} Comments
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={handleCopyLink} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[12px] font-semibold text-gray-700 transition-colors hover:bg-gray-100">
                    <Copy size={14} />
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                  <button type="button" onClick={handleShare} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[12px] font-semibold text-gray-700 transition-colors hover:bg-gray-100">
                    <Share2 size={14} />
                    Share
                  </button>
                  <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[12px] font-semibold text-gray-700 transition-colors hover:bg-gray-100">
                    <Printer size={14} />
                    Print
                  </button>
                </div>
              </div>
            </div>

            <div
              id="qa"
              ref={(node) => {
                sectionRefs.current.qa = node;
              }}
              className="scroll-mt-[150px]"
            >
              <SectionCard title="Questions & Answers" eyebrow="Community Section" icon={<MessageSquare size={18} />} surfaceGlow={visualTheme.surfaceGlow}>
                <div className="space-y-4">
                  <div className="rounded-[22px] border border-blue-100 bg-[linear-gradient(135deg,#f4f7ff,#f8fbff)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-500">Community Desk</div>
                        <div className="mt-1 text-lg font-extrabold text-gray-900">Discuss the official update</div>
                        <p className="mt-1 text-sm leading-6 text-gray-600">
                          {qaSummary.questions} questions and {qaSummary.answers} answers are already on this page.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAskOpen((current) => !current)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#1565c0,#1d4ed8)] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_10px_24px_rgba(29,78,216,0.22)] transition-transform hover:-translate-y-0.5"
                      >
                        <MessageCircle size={14} />
                        {askOpen ? 'Close Question Box' : 'Ask a Question'}
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {askOpen ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 space-y-3 rounded-[20px] border border-blue-100 bg-white p-4">
                            <input
                              value={newQuestionAuthor}
                              onChange={(event) => setNewQuestionAuthor(event.target.value)}
                              placeholder="Your name (optional)"
                              className="w-full rounded-xl border border-blue-100 bg-[#fbfdff] px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-300"
                            />
                            <textarea
                              value={newQuestion}
                              onChange={(event) => setNewQuestion(event.target.value)}
                              placeholder={`Ask something about ${detail.summaryMeta.orgShort} ${meta.title.toLowerCase()}...`}
                              rows={3}
                              className="w-full resize-none rounded-xl border border-blue-100 bg-[#fbfdff] px-3 py-2.5 text-sm leading-7 text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-300"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={handleSubmitQuestion}
                                className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#e65100,#bf360c)] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_10px_22px_rgba(230,81,0,0.22)] transition-transform hover:-translate-y-0.5"
                              >
                                <Send size={13} />
                                Post Question
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-4">
                    {qaList.map((question, questionIndex) => {
                      const isExpanded = expandedQuestions.includes(question.id);
                      const isReplying = replyingTo === question.id;

                      return (
                        <div key={question.id} className="overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
                          <div className="border-b border-gray-100 bg-white px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white shadow-sm"
                                style={{ background: `linear-gradient(135deg, ${question.avatarColor}cc, ${question.avatarColor})` }}
                              >
                                {question.initials || getInitials(question.author)}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold text-gray-900">{question.author}</span>
                                  <span className="text-xs text-gray-400">{question.time}</span>
                                  {question.answers.length ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
                                      <MessageCircle size={10} />
                                      {question.answers.length} {question.answers.length === 1 ? 'Answer' : 'Answers'}
                                    </span>
                                  ) : null}
                                  <span className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-[10px] font-extrabold text-blue-700">
                                    Q{questionIndex + 1}
                                  </span>
                                </div>

                                <p className="mt-2 text-sm leading-7 text-gray-700">{question.text}</p>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleQuestionUpvote(question.id)}
                                    className={cn(
                                      'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors',
                                      question.liked
                                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
                                    )}
                                  >
                                    <ThumbsUp size={13} className={question.liked ? 'fill-current' : ''} />
                                    {formatCount(question.likes)} Helpful
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyingTo(isReplying ? null : question.id);
                                      setReplyText('');
                                      setReplyAuthor('');
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] font-semibold text-gray-600 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#bf360c]"
                                  >
                                    <CornerDownRight size={13} />
                                    Answer
                                  </button>
                                  {question.answers.length ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleQuestion(question.id)}
                                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 transition-colors hover:text-blue-800"
                                    >
                                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                      {isExpanded ? 'Hide Answers' : `View ${question.answers.length} Answers`}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>

                          <AnimatePresence initial={false}>
                            {isExpanded && question.answers.length ? (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="divide-y divide-gray-100 bg-[#fafcff]">
                                  {question.answers.map((answer, answerIndex) => (
                                    <div key={answer.id} className="flex items-start gap-3 px-5 py-4">
                                      <CornerDownRight size={14} className="mt-2 shrink-0 text-blue-300" />
                                      <div
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white shadow-sm"
                                        style={{ background: `linear-gradient(135deg, ${answer.avatarColor}cc, ${answer.avatarColor})` }}
                                      >
                                        {answer.initials || getInitials(answer.author)}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-sm font-bold text-gray-900">{answer.author}</span>
                                          {answer.isBest ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#2e7d32,#43a047)] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_8px_16px_rgba(46,125,50,0.2)]">
                                              <BadgeCheck size={10} />
                                              Best Answer
                                            </span>
                                          ) : null}
                                          <span className="text-xs text-gray-400">{answer.time}</span>
                                          <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">A{answerIndex + 1}</span>
                                        </div>
                                        <p className="mt-2 text-sm leading-7 text-gray-700">{answer.text}</p>
                                        <button
                                          type="button"
                                          onClick={() => handleAnswerUpvote(question.id, answer.id)}
                                          className={cn(
                                            'mt-3 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors',
                                            answer.liked
                                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                                              : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
                                          )}
                                        >
                                          <ThumbsUp size={12} className={answer.liked ? 'fill-current' : ''} />
                                          {formatCount(answer.likes)} Helpful
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>

                          <AnimatePresence initial={false}>
                            {isReplying ? (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-orange-100 bg-[linear-gradient(90deg,#fff8f5,#fffdfb)] px-5 py-4">
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffb74d,#e65100)] text-white">
                                      <User size={14} />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-3">
                                      <input
                                        value={replyAuthor}
                                        onChange={(event) => setReplyAuthor(event.target.value)}
                                        placeholder="Your name (optional)"
                                        className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-300"
                                      />
                                      <textarea
                                        value={replyText}
                                        onChange={(event) => setReplyText(event.target.value)}
                                        placeholder="Write your answer here..."
                                        rows={3}
                                        className="w-full resize-none rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm leading-7 text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-300"
                                      />
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setReplyingTo(null)}
                                          className="rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSubmitReply(question.id)}
                                          className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#e65100,#bf360c)] px-4 py-2 text-[12px] font-bold text-white shadow-[0_10px_22px_rgba(230,81,0,0.22)] transition-transform hover:-translate-y-0.5"
                                        >
                                          <Send size={13} />
                                          Post Answer
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-start gap-2 rounded-[20px] border border-blue-100 bg-[linear-gradient(135deg,#f3f7ff,#f8fbff)] px-4 py-3">
                    <Shield size={15} className="mt-0.5 shrink-0 text-blue-500" />
                    <p className="text-[12px] leading-6 text-blue-900">
                      Be respectful and helpful. Avoid sharing personal or confidential information. Community answers are guidance only and do not replace the official notice.
                    </p>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-[118px] xl:self-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="overflow-hidden rounded-[24px] shadow-[0_20px_48px_rgba(15,23,42,0.18)]"
              style={{ background: sidebarGradient }}
            >
              <div className="p-5">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/18 bg-white/14 text-yellow-300">
                  <Shield size={22} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-extrabold text-white">Do not miss the official update</h3>
                  <p className="mt-1 text-[12px] leading-6 text-white/75">
                    Track the primary link, download the notice, and verify the deadline from the authority source.
                  </p>
                </div>
                <div className="mt-4 rounded-[20px] border border-white/15 bg-white/10 px-4 py-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">Last tracked date</div>
                  <div className="mt-1 text-base font-extrabold text-yellow-300">{detail.summaryMeta.lastDate}</div>
                </div>
                <div className="mt-4 space-y-2">
                  {primaryAction ? (
                    <SmartLink
                      href={primaryAction.href}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ff8a3d,#bf360c)] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_26px_rgba(230,81,0,0.28)] transition-transform hover:-translate-y-0.5"
                    >
                      {primaryAction.label}
                      <ArrowRight size={15} />
                    </SmartLink>
                  ) : null}
                  {secondaryAction ? (
                    <SmartLink
                      href={secondaryAction.href}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                    >
                      {secondaryAction.label}
                      <ExternalLink size={14} />
                    </SmartLink>
                  ) : null}
                </div>
              </div>
            </motion.div>

            {detail.importantDates.length ? (
              <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
                <div className={cn('flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r px-5 py-4', visualTheme.surfaceGlow)}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${accent}, #bf360c)` }}>
                    <Calendar size={15} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Quick Timeline</div>
                    <div className="text-[15px] font-extrabold text-gray-900">Important Dates</div>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {detail.importantDates.map((row) => (
                    <div key={`${row.label}-${row.date}-sidebar`} className="flex items-start justify-between gap-3 px-5 py-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{row.label}</div>
                        <div className="mt-1 text-xs text-gray-500">{row.date}</div>
                      </div>
                      {row.status ? (
                        <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em]', statusConfig[row.status])}>
                          {row.status}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
              <div className="bg-[linear-gradient(135deg,#6a1b9a,#7b1fa2)] px-5 py-3.5">
                <div className="flex items-center gap-2 text-white">
                  <TrendingUp size={14} />
                  <span className="text-[12px] font-extrabold uppercase tracking-[0.14em]">Related Posts</span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {relatedPosts.map((post) => (
                  <SmartLink
                    key={`${post.href}-${post.title}`}
                    href={post.href}
                    className="group flex items-start gap-3 px-5 py-4 transition-colors hover:bg-purple-50/40"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-colors group-hover:bg-purple-100">
                      <Newspaper size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start gap-2">
                        <span className="text-sm font-semibold leading-6 text-gray-800 transition-colors group-hover:text-[#bf360c]">
                          {post.title}
                        </span>
                        {post.tag ? (
                          <span className={cn('rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em]', tagConfig[post.tag as keyof typeof tagConfig])}>
                            {post.tag.replace('-', ' ')}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400">
                        <Users size={10} />
                        <span>{post.posts} Posts</span>
                        <span>·</span>
                        <span>{post.date}</span>
                        <span>·</span>
                        <span>{post.category}</span>
                      </div>
                    </div>
                  </SmartLink>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-[#e65100]">
                  <Bell size={16} />
                </div>
                <div>
                  <div className="text-[15px] font-extrabold text-gray-900">Get Instant Alerts</div>
                  <div className="text-[11px] text-gray-400">Receive similar updates in your inbox</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Subscribe for {detail.summaryMeta.orgShort} and similar {meta.title.toLowerCase()} updates, or join the public Telegram channel.
              </p>
              <form onSubmit={handleSubscribe} className="mt-4 space-y-3">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-300"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#e65100,#bf360c)] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_10px_22px_rgba(230,81,0,0.18)] transition-transform hover:-translate-y-0.5"
                  >
                    <Send size={13} />
                    {isSubscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                  <Link
                    href={buildCommunityPath('telegram')}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[12px] font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    Telegram
                  </Link>
                </div>
              </form>
            </div>

            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-700" />
                <div>
                  <div className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-amber-800">Disclaimer</div>
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    {detail.sourceNote ?? 'All information is sourced from official websites. Verify the final details from the authority portal or PDF before applying, downloading, or taking any next step.'}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {mobileCtaVisible && primaryAction ? (
          <motion.div
            initial={{ y: 88 }}
            animate={{ y: 0 }}
            exit={{ y: 88 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-10px_28px_rgba(15,23,42,0.12)] backdrop-blur-md lg:hidden"
          >
            <div className="mx-auto flex max-w-6xl gap-3">
              <button
                type="button"
                onClick={() => setSaved((current) => !current)}
                className={cn(
                  'inline-flex items-center justify-center rounded-xl border px-4 py-3 transition-colors',
                  saved ? 'border-yellow-300 bg-yellow-50 text-yellow-700' : 'border-gray-200 bg-gray-50 text-gray-600',
                )}
              >
                {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              </button>
              <SmartLink
                href={primaryAction.href}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#e65100,#bf360c)] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_22px_rgba(230,81,0,0.22)]"
              >
                {primaryAction.label}
                <ArrowRight size={15} />
              </SmartLink>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600 transition-colors hover:bg-gray-100"
              >
                <Share2 size={16} />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function PublicAnnouncementDetailPage(props: PublicAnnouncementDetailPageProps) {
  const resetKey = `${props.item.slug}-${props.item.detail.engagement.likes}-${props.item.detail.qa.length}`;
  return <PublicAnnouncementDetailPageInner key={resetKey} {...props} />;
}
