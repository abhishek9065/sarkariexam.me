'use client';

import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  CircleHelp,
  Copy,
  CornerDownRight,
  Download,
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
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { buildDetailFaqItems } from '@/app/lib/detail-faq';
import type {
  AnnouncementItem,
  CategoryPageMeta,
  DetailQaQuestion,
  DetailRelatedPost,
  PortalListEntry,
} from '@/app/lib/public-content';
import { subscribeToAlerts } from '@/lib/alert-subscriptions';
import { cn } from '@/lib/utils';
import { SafeLink } from './SafeLink';

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
  hot: { className: 'border-red-400 bg-red-500 text-white', label: '🔥 HOT' },
  new: { className: 'border-emerald-400 bg-emerald-500 text-white', label: 'NEW' },
  update: { className: 'border-blue-400 bg-blue-500 text-white', label: 'UPDATE' },
  'last-date': { className: 'border-amber-400 bg-amber-500 text-white', label: '⏰ LAST DATE' },
} as const;

const sectionCategoryLabel: Record<AnnouncementItem['section'], string> = {
  jobs: 'Latest Jobs',
  results: 'Latest Result',
  'admit-cards': 'Latest Admit Card',
  'answer-keys': 'Answer Key',
  admissions: 'Latest Admission',
};

function SmartLink({
  href,
  className,
  children,
  style,
}: {
  children: ReactNode;
  className: string;
  href: string;
  style?: CSSProperties;
}) {
  return (
    <SafeLink href={href} className={className} style={style}>
      {children}
    </SafeLink>
  );
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

function getShortInfoTitle(item: AnnouncementItem) {
  return item.title.split(' — ')[0].split(' - ')[0].trim();
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
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
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

function PublicAnnouncementDetailPageInner({
  item,
  meta,
  relatedEntries,
}: PublicAnnouncementDetailPageProps) {
  const detail = item.detail;
  const visualTheme = sectionVisualTheme[item.section];
  const sidebarGradient = `linear-gradient(145deg, ${detail.theme?.sidebarFrom ?? detail.theme?.gradientFrom ?? '#1a237e'} 0%, ${detail.theme?.sidebarTo ?? detail.theme?.gradientTo ?? '#bf360c'} 100%)`;
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeSection, setActiveSection] = useState('shortinfo');
  const [readProgress, setReadProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(() => Number(detail.engagement.likes.replace(/,/g, '')));
  const [copied, setCopied] = useState(false);
  const [mobileCtaVisible, setMobileCtaVisible] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState(0);
  const [showAllVacancies, setShowAllVacancies] = useState(false);
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
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  const subscribeInputRef = useRef<HTMLInputElement | null>(null);
  const primaryAction =
    detail.importantLinks.find((link) => link.emphasis === 'primary') ??
    (detail.cta ? { href: detail.cta.primaryHref, label: detail.cta.primaryLabel, emphasis: 'primary' as const } : null);
  const secondaryAction =
    detail.importantLinks.find((link) => link.href !== primaryAction?.href && link.emphasis !== 'primary') ??
    (detail.cta?.secondaryHref && detail.cta.secondaryLabel
      ? { href: detail.cta.secondaryHref, label: detail.cta.secondaryLabel, emphasis: 'secondary' as const }
      : null);
  const notificationAction =
    detail.importantLinks.find((link) => /notification/i.test(link.label)) ??
    detail.importantLinks.find((link) => link.icon === 'pdf') ??
    secondaryAction;
  const relatedPosts = detail.relatedPosts.length ? detail.relatedPosts : buildFallbackRelatedPosts(meta, relatedEntries);
  const faqItems = buildDetailFaqItems(item);
  const categoryLabel = sectionCategoryLabel[item.section];
  const shortInfoTitle = getShortInfoTitle(item);
  const shortInfoRowsLeft = [
    { label: 'Post Name:', value: shortInfoTitle, tone: 'default' as const, weight: 'font-bold' },
    { label: 'Organization:', value: item.org, tone: 'default' as const, weight: 'font-semibold' },
    { label: 'Total Vacancy:', value: item.postCount ?? 'Refer notice', tone: 'accent' as const, weight: 'font-bold' },
    { label: 'Salary / Pay Scale:', value: detail.summaryMeta.salary, tone: 'default' as const, weight: 'font-semibold' },
  ];
  const shortInfoRowsRight = [
    { label: 'Application Begin:', value: detail.summaryMeta.applicationStartDate },
    { label: 'Last Date:', value: detail.summaryMeta.lastDate },
    { label: 'Application Fee (Gen):', value: detail.applicationFee?.rows[0]?.value ?? 'Refer notice' },
    { label: 'Job Location:', value: detail.summaryMeta.location },
  ];
  const visibleVacancyRows = showAllVacancies ? detail.vacancyTable?.rows ?? [] : (detail.vacancyTable?.rows ?? []).slice(0, 5);
  const navSections: NavSection[] = [
    { id: 'shortinfo', label: 'Short Info', icon: Info },
    { id: 'overview', label: 'Overview', icon: FileText },
    ...(detail.eligibility.length ? [{ id: 'eligibility', label: 'Eligibility', icon: GraduationCap }] : []),
    ...(detail.vacancyTable?.rows.length ? [{ id: 'vacancy', label: 'Vacancy', icon: Briefcase }] : []),
    ...(detail.importantLinks.length ? [{ id: 'links', label: 'Imp. Links', icon: Link2 }] : []),
    { id: 'faq', label: 'FAQ', icon: MessageSquare },
  ];
  const navKey = navSections.map((section) => section.id).join('|');
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
    setShowShareModal(false);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function handleShare() {
    setShowShareModal(true);
  }

  async function handleNativeShare() {
    if (navigator.share) {
      await navigator.share({
        title: item.title,
        url: window.location.href,
      });
      setShowShareModal(false);
      return;
    }

    await handleCopyLink();
  }

  function handlePrint() {
    setShowShareModal(false);
    window.print();
  }

  function handleAlert() {
    subscribeInputRef.current?.focus();
    subscribeInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handleLike() {
    setLiked((current) => {
      setLikeCount((count) => (current ? count - 1 : count + 1));
      return !current;
    });
  }

  function toggleQuestion(questionId: number) {
    setExpandedQuestions((current) =>
      current.includes(questionId) ? current.filter((value) => value !== questionId) : [...current, questionId],
    );
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

  async function handleSubscribe() {
    if (!email.trim()) {
      return;
    }

    try {
      setIsSubscribing(true);
      const sectionToType = {
        jobs: 'job',
        results: 'result',
        'admit-cards': 'admit-card',
        admissions: 'admission',
        'answer-keys': 'answer-key',
      } as const;

      const response = await subscribeToAlerts({
        email,
        organizations: item.org ? [item.org] : [],
        postTypes: [sectionToType[item.section]],
        frequency: 'instant',
        source: 'detail-page',
      });
      setIsSubscribed(true);
      setSubscriptionMessage(response.message || 'Subscription saved.');
      setEmail('');
    } catch (error) {
      setIsSubscribed(false);
      setSubscriptionMessage(error instanceof Error ? error.message : 'Failed to subscribe.');
    } finally {
      setIsSubscribing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f2f7] font-[family-name:var(--font-inter)]">
      <div className="fixed left-0 right-0 top-0 z-[100] h-0.5 bg-transparent">
        <div
          className="h-full"
          style={{
            width: `${readProgress}%`,
            background: `linear-gradient(90deg, ${detail.theme?.gradientFrom ?? '#b71c1c'}, ${detail.theme?.gradientTo ?? '#c62828'})`,
          }}
        />
      </div>

      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1.5 px-4 py-2.5">
          <Link href="/" className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 transition-colors hover:text-[#e65100]">
            <Home size={11} />
            Home
          </Link>
          <ChevronRight size={10} className="text-gray-300" />
          <span className="text-[11px] font-medium text-gray-500">{categoryLabel}</span>
          <ChevronRight size={10} className="text-gray-300" />
          <span className="max-w-[200px] truncate text-[11px] text-gray-400 sm:max-w-xs">{shortInfoTitle}</span>
        </div>
      </div>

      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${detail.theme?.gradientFrom ?? '#b71c1c'} 0%, ${detail.theme?.gradientTo ?? '#c62828'} 50%, #1a237e 100%)`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-5">
          <div className="absolute right-0 top-0 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          <div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/2 translate-y-1/2 rounded-full bg-white" />
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-8 lg:py-10">
          <div className="flex flex-col items-start gap-6 lg:flex-row">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-white backdrop-blur-sm lg:h-20 lg:w-20">
              <span className="text-[20px] font-black tracking-[-0.03em]">{detail.summaryMeta.orgShort}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-white backdrop-blur-sm">
                  {categoryLabel.toUpperCase()}
                </span>
                {item.tag ? (
                  <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold', tagConfig[item.tag].className)}>
                    {tagConfig[item.tag].label}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 text-[11px] text-white/60">
                  <Eye size={11} />
                  {detail.engagement.views} views
                </span>
              </div>

              <h1 className="mb-3 text-white" style={{ fontSize: 'clamp(17px, 2.5vw, 24px)', fontWeight: 800, lineHeight: 1.3 }}>
                {item.title}
              </h1>

              <div className="mb-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
                  <Building2 size={11} className="text-white/60" />
                  {item.org}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
                  <MapPin size={11} className="text-white/60" />
                  {detail.summaryMeta.location}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
                  <Calendar size={11} className="text-white/60" />
                  Published: {detail.summaryMeta.publishedDate}
                </span>
                {item.postCount ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
                    <Users size={11} className="text-white/60" />
                    {item.postCount} Posts
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSaved((current) => !current)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-white/25"
                >
                  {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-white/25"
                >
                  <Share2 size={14} />
                  Share
                </button>
                <button
                  type="button"
                  onClick={handleAlert}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[12px] font-semibold text-white transition-colors',
                    isSubscribed ? 'border-yellow-300/70 bg-white/22' : 'border-white/25 bg-white/15 hover:bg-white/25',
                  )}
                >
                  <Bell size={14} />
                  Alert
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-white/25"
                >
                  <Printer size={14} />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'POSTS', value: item.postCount ?? 'N/A', icon: Users, tone: 'text-[#a855f7]' },
              { label: 'LAST DATE', value: detail.summaryMeta.lastDate, icon: Clock, tone: 'text-[#ef4444]' },
              { label: 'SALARY', value: detail.summaryMeta.salary.split(' — ')[0], icon: IndianRupee, tone: 'text-[#16a34a]' },
              { label: 'QUALIFICATION', value: item.qualification ?? 'Refer notice', icon: GraduationCap, tone: 'text-[#2563eb]' },
            ].map((stat) => {
              const Icon = stat.icon;

              return (
                <div key={stat.label} className="rounded-2xl border border-gray-100 bg-[#fbfcfe] px-4 py-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={stat.tone} />
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">{stat.label}</div>
                  </div>
                  <div className="mt-1.5 text-[12px] font-bold text-gray-800">{stat.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4 pb-24 lg:pb-0">
        <nav className="sticky top-[57px] z-20 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-6xl min-w-max items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navSections.map((section) => {
              const Icon = section.icon;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    'inline-flex items-center gap-2 border-b-2 px-3.5 py-4 text-[12px] font-semibold transition-colors',
                    activeSection === section.id
                      ? 'border-[#e65100] text-[#e65100]'
                      : 'border-transparent text-gray-500 hover:text-gray-800',
                  )}
                >
                  <Icon size={13} className={activeSection === section.id ? 'text-[#e65100]' : 'text-gray-400'} />
                  {section.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.78fr)_360px]">
          <div className="space-y-4">
            <div
              id="shortinfo"
              ref={(node) => {
                sectionRefs.current.shortinfo = node;
              }}
              className="scroll-mt-[110px]"
            >
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-orange-100 px-5 py-3.5" style={{ background: 'linear-gradient(90deg, #fff8f5 0%, #ffffff 100%)' }}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', boxShadow: '0 3px 10px rgba(230,81,0,0.3)' }}>
                    <Info size={15} className="text-white" />
                  </div>
                  <h2 className="text-[14px] font-bold text-gray-800">Short Information</h2>
                </div>
                <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <div className="divide-y divide-gray-100">
                    {shortInfoRowsLeft.map((row) => (
                      <div key={row.label} className="flex items-start gap-0">
                        <div className="w-36 shrink-0 px-4 py-3 sm:w-40">
                          <span className="text-[12px] font-medium text-gray-500">{row.label}</span>
                        </div>
                        <div className="flex-1 border-l border-gray-100 px-4 py-3">
                          <span className={cn('text-[12px]', row.weight, row.tone === 'accent' ? 'text-[#e65100]' : 'text-gray-800')}>
                            {row.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {shortInfoRowsRight.map((row) => (
                      <div key={row.label} className="flex items-start">
                        <div className="w-40 shrink-0 px-4 py-3 sm:w-44">
                          <span className="text-[12px] font-medium text-gray-500">{row.label}</span>
                        </div>
                        <div className="flex-1 border-l border-gray-100 px-4 py-3">
                          <span className="text-[12px] font-semibold text-gray-800">{row.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              id="overview"
              ref={(node) => {
                sectionRefs.current.overview = node;
              }}
              className="scroll-mt-[110px]"
            >
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3.5" style={{ background: 'linear-gradient(90deg, #fff8f5 0%, #ffffff 100%)' }}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#e65100]/20" style={{ background: 'linear-gradient(135deg, rgba(230,81,0,0.13), rgba(230,81,0,0.07))' }}>
                    <FileText size={15} className="text-[#e65100]" />
                  </div>
                  <h2 className="text-[13px] font-bold text-gray-800">About This Post</h2>
                </div>
                <div className="p-5">
                  <p className="text-[13px] leading-[1.85] text-gray-600">{item.summary}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[
                      { label: 'QUALIFICATION', value: item.qualification ?? 'Refer notice', icon: GraduationCap, tone: 'bg-blue-50 border-blue-100 text-blue-600' },
                      { label: 'AGE LIMIT', value: detail.summaryMeta.ageLimit ?? detail.ageLimit?.summary ?? 'Refer notice', icon: Users, tone: 'bg-purple-50 border-purple-100 text-purple-600' },
                      { label: 'SALARY RANGE', value: detail.summaryMeta.salary, icon: IndianRupee, tone: 'bg-green-50 border-green-100 text-green-600' },
                      { label: 'LAST DATE', value: detail.summaryMeta.lastDate, icon: Clock, tone: 'bg-red-50 border-red-100 text-red-600' },
                    ].map((card) => {
                      const Icon = card.icon;
                      return (
                        <div key={card.label} className={cn('flex items-start gap-3 rounded-xl border p-3.5', card.tone)}>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70">
                            <Icon size={15} />
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold tracking-[0.04em] text-gray-500">{card.label}</div>
                            <div className="mt-0.5 text-[12px] font-bold text-gray-800">{card.value}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {detail.applicationFee ? (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-orange-100 px-5 py-3.5" style={{ background: 'linear-gradient(90deg, #fff8f5 0%, #ffffff 100%)' }}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', boxShadow: '0 3px 10px rgba(230,81,0,0.3)' }}>
                    <IndianRupee size={15} className="text-white" />
                  </div>
                  <h2 className="text-[14px] font-bold text-gray-800">{detail.applicationFee.title ?? 'Application Fee'}</h2>
                </div>
                <div className="grid grid-cols-2 border-b border-orange-100 px-5 py-2.5" style={{ background: 'linear-gradient(90deg, #fff8f5 0%, #fff3f0 100%)' }}>
                  <span className="text-[12px] font-bold text-[#e65100]">Category</span>
                  <span className="text-right text-[12px] font-bold text-[#e65100]">Application Fee</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {detail.applicationFee.rows.map((row) => (
                    <div key={`${row.label}-${row.value}`} className="grid grid-cols-2 items-center px-5 py-3.5 transition-colors hover:bg-gray-50/50">
                      <span className="text-[12px] font-medium text-gray-700">{row.label}</span>
                      <span className={cn('text-right text-[13px] font-bold', /₹0/.test(row.value) ? 'text-green-600' : 'text-gray-800')}>{row.value}</span>
                    </div>
                  ))}
                </div>
                {detail.applicationFee.note ? (
                  <div className="border-t border-gray-100 px-5 py-3" style={{ background: '#fafafa' }}>
                    <span className="text-[11px] font-medium text-gray-500">
                      <span className="font-bold">Payment Mode:</span> {detail.applicationFee.note}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {detail.eligibility.length ? (
              <div
                id="eligibility"
                ref={(node) => {
                  sectionRefs.current.eligibility = node;
                }}
                className="scroll-mt-[110px]"
              >
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3.5" style={{ background: 'linear-gradient(90deg, #fff8f5 0%, #ffffff 100%)' }}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#e65100]/20" style={{ background: 'linear-gradient(135deg, rgba(230,81,0,0.13), rgba(230,81,0,0.07))' }}>
                      <GraduationCap size={15} className="text-[#e65100]" />
                    </div>
                    <h2 className="text-[13px] font-bold text-gray-800">Eligibility Criteria</h2>
                  </div>
                  <div className="grid gap-3 p-5 md:grid-cols-2">
                    {detail.eligibility.map((block) => (
                      <div key={block.title} className="rounded-xl border border-gray-200 bg-[#fcfcfd] px-4 py-4">
                        <h3 className="text-[13px] font-bold text-gray-900">
                          {{
                            Education: 'Educational Qualification',
                            Age: 'Age Limit & Relaxation',
                          }[block.title] ?? block.title}
                        </h3>
                        <p className="mt-2 text-[12px] leading-[1.8] text-gray-700">{block.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            
            {detail.vacancyTable?.rows.length ? (
              <div
                id="vacancy"
                ref={(node) => {
                  sectionRefs.current.vacancy = node;
                }}
                className="scroll-mt-[110px]"
              >
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5" style={{ background: 'linear-gradient(90deg, #fff8f5 0%, #ffffff 100%)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#e65100]/20" style={{ background: 'linear-gradient(135deg, rgba(230,81,0,0.13), rgba(230,81,0,0.07))' }}>
                        <Briefcase size={15} className="text-[#e65100]" />
                      </div>
                      <div>
                        <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-gray-800">VACANCY BREAKDOWN</h2>
                        <p className="mt-0.5 text-[10px] text-gray-400">Total: {item.postCount ?? detail.vacancyTable.rows.length} Posts</p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-gray-100 bg-[#fcfcfd]">
                          {['#', 'POST NAME', 'DEPT', 'VACANCIES', 'PAY LEVEL'].map((column) => (
                            <th key={column} className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {visibleVacancyRows.map((row, index) => (
                          <tr key={`${row.post}-${row.department}`}>
                            <td className="px-4 py-3 text-[12px] font-semibold text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 text-[12px] font-semibold text-gray-800">{row.post}</td>
                            <td className="px-4 py-3 text-[12px] text-gray-700">{row.department}</td>
                            <td className="px-4 py-3 text-[12px] font-bold text-gray-800">{row.vacancies}</td>
                            <td className="px-4 py-3 text-[12px] text-gray-700">{row.payLevel ?? 'Refer notice'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {detail.vacancyTable.rows.length > 5 ? (
                    <div className="border-t border-gray-100 px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setShowAllVacancies((current) => !current)}
                        className="text-[12px] font-semibold text-[#e65100] transition-colors hover:text-[#bf360c]"
                      >
                        {showAllVacancies ? 'Show Fewer Posts' : `View All ${detail.vacancyTable.rows.length} Posts`}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {detail.selectionProcess?.length ? (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3.5" style={{ background: 'linear-gradient(90deg, #fff8f5 0%, #ffffff 100%)' }}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#e65100]/20" style={{ background: 'linear-gradient(135deg, rgba(230,81,0,0.13), rgba(230,81,0,0.07))' }}>
                    <BadgeCheck size={15} className="text-[#e65100]" />
                  </div>
                  <h2 className="text-[13px] font-bold text-gray-800">Selection Process</h2>
                </div>
                <div className="grid gap-3 p-5 md:grid-cols-3">
                  {detail.selectionProcess.map((step, index) => (
                    <div key={step} className="rounded-2xl border border-gray-200 bg-[#fcfcfd] px-4 py-4 text-center">
                      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[13px] font-extrabold text-[#e65100]">
                        {index + 1}
                      </div>
                      <div className="mt-3 text-[13px] font-bold text-gray-800">{step}</div>
                      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">{`STAGE ${index + 1}`}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {detail.importantLinks.length ? (
              <div
                id="links"
                ref={(node) => {
                  sectionRefs.current.links = node;
                }}
                className="scroll-mt-[110px]"
              >
                <div className="overflow-hidden rounded-2xl" style={{ border: '1.5px solid #ffe0cc', boxShadow: '0 4px 16px rgba(230,81,0,0.1), 0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div className="relative flex items-center gap-3 overflow-hidden px-5 py-4" style={{ background: 'linear-gradient(105deg, #e65100 0%, #bf360c 55%, #8b1a00 100%)' }}>
                    <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
                    <div className="absolute bottom-0 right-10 h-12 w-12 rounded-full bg-white/10" />
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/30 bg-white/20 text-white backdrop-blur-sm">
                      <Link2 size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-extrabold text-white">Important Links</div>
                      <div className="mt-0.5 text-[10px] text-orange-200">Official government &amp; board portals</div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-300" />
                      <span className="text-[10px] font-semibold text-white">{detail.importantLinks.length} Active</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center border-b border-[#ffe0cc] px-5 py-2.5" style={{ background: 'linear-gradient(90deg, #fff8f5, #fff3ed)' }}>
                    <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#e65100]">Link Description</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#e65100]">Action</span>
                  </div>
                  <div className="divide-y divide-gray-100 bg-white">
                    {detail.importantLinks.map((link, index) => (
                      <div key={`${link.label}-${link.href}`} className="group grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 transition-all duration-150 hover:bg-orange-50/50" style={{ background: index % 2 === 1 ? '#fffdfa' : '#ffffff' }}>
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg text-[9px] font-extrabold text-white" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 2px 6px rgba(22,163,74,0.35)' }}>
                            {index + 1}
                          </span>
                          <span className="text-[13px] font-medium leading-snug text-gray-700 transition-colors group-hover:text-gray-900">{link.label}</span>
                        </div>
                        <SmartLink
                          href={link.href}
                          className="inline-flex min-w-[118px] items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 3px 12px rgba(22,163,74,0.28)', letterSpacing: '0.3px' }}
                        >
                          <ArrowUpRight size={11} />
                          Click Here
                        </SmartLink>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#ffe0cc] px-5 py-3 text-[11px] text-gray-500" style={{ background: '#fffaf7' }}>
                    All links redirect to official government / board websites. Always verify URLs before submitting personal information.
                  </div>
                </div>
              </div>
            ) : null}

            <div
              id="faq"
              ref={(node) => {
                sectionRefs.current.faq = node;
              }}
                className="scroll-mt-[110px]"
            >
              <SectionCard title="Frequently Asked Questions" icon={<CircleHelp size={18} />} surfaceGlow={visualTheme.surfaceGlow}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    {faqItems.map((faq, index) => {
                      const isOpen = faqOpenIndex === index;

                      return (
                        <div key={faq.question} className={cn('overflow-hidden rounded-xl border transition-all', isOpen ? 'border-orange-200 shadow-sm' : 'border-gray-100')}>
                          <button
                            type="button"
                            onClick={() => setFaqOpenIndex(isOpen ? -1 : index)}
                            className={cn('flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors', isOpen ? 'bg-orange-50' : 'hover:bg-gray-50')}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-extrabold text-orange-700">
                                {index + 1}
                              </span>
                              <span className="text-[13px] font-semibold text-gray-800">{faq.question}</span>
                            </div>
                            <div className={cn('ml-2 shrink-0 transition-transform', isOpen && 'rotate-180')}>
                              <ChevronDown size={15} className="text-gray-400" />
                            </div>
                          </button>
                          {isOpen ? (
                            <div className="overflow-hidden">
                              <div className="border-t border-orange-100 px-4 pb-4 pt-2">
                                <p className="text-[12px] leading-[1.8] text-gray-600">{faq.answer}</p>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-[linear-gradient(135deg,#f4f7ff,#f8fbff)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold tracking-[0.04em] text-blue-500">Community Q&A</div>
                        <div className="mt-1 text-lg font-extrabold text-gray-900">Ask questions · Get answers from the community</div>
                        <p className="mt-1 text-sm leading-6 text-gray-600">
                          {qaSummary.questions} Questions
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAskOpen((current) => !current)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#1565c0,#1d4ed8)] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_10px_24px_rgba(29,78,216,0.22)] transition-transform hover:-translate-y-0.5"
                      >
                        <MessageCircle size={14} />
                        {askOpen ? 'Close Question' : 'Ask Question'}
                      </button>
                    </div>

                    {askOpen ? (
                      <div className="overflow-hidden">
                        <div className="mt-4 space-y-3 rounded-2xl border border-blue-100 bg-white p-4">
                          <input
                            value={newQuestionAuthor}
                            onChange={(event) => setNewQuestionAuthor(event.target.value)}
                            placeholder="Your name (optional)"
                            className="w-full rounded-xl border border-blue-100 bg-[#fbfdff] px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-300"
                          />
                          <textarea
                            value={newQuestion}
                            onChange={(event) => setNewQuestion(event.target.value)}
                            placeholder={`Ask something about ${detail.summaryMeta.orgShort} ${categoryLabel.toLowerCase()}...`}
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
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    {qaList.map((question, questionIndex) => {
                      const isExpanded = expandedQuestions.includes(question.id);
                      const isReplying = replyingTo === question.id;

                      return (
                        <div key={question.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
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
                                  <span className="text-xs text-gray-400">· {question.time}</span>
                                  {question.answers.length ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600">
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
                                      {isExpanded
                                        ? 'Hide Answers'
                                        : `View ${question.answers.length} ${question.answers.length === 1 ? 'Answer' : 'Answers'}`}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>

                          {isExpanded && question.answers.length ? (
                            <div className="overflow-hidden">
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
                                            <span className="inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#2e7d32,#43a047)] px-2 py-1 text-[10px] font-extrabold text-white shadow-[0_8px_16px_rgba(46,125,50,0.2)]">
                                              <BadgeCheck size={10} />
                                              Best Answer
                                            </span>
                                          ) : null}
                                          <span className="text-xs text-gray-400">· {answer.time}</span>
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
                            </div>
                          ) : null}

                          {isReplying ? (
                            <div className="overflow-hidden">
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
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-start gap-2 rounded-2xl border border-blue-100 bg-[linear-gradient(135deg,#f3f7ff,#f8fbff)] px-4 py-3">
                    <Shield size={15} className="mt-0.5 shrink-0 text-blue-500" />
                    <p className="text-[12px] leading-6 text-blue-900">
                      Be respectful and helpful. Avoid sharing personal or confidential information. Answers are from the community and not official advice.
                    </p>
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleLike}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[12px] font-semibold transition-all',
                      liked
                        ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100',
                    )}
                  >
                    <ThumbsUp size={14} className={liked ? 'fill-current text-blue-600' : ''} />
                    {likeCount.toLocaleString('en-IN')} Helpful
                  </button>
                  <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[12px] font-semibold text-gray-700">
                    <MessageSquare size={14} />
                    {detail.engagement.comments.toLocaleString('en-IN')} Comments
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[12px] font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <Copy size={14} />
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)' }}
                  >
                    <Share2 size={14} />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-[57px] xl:self-start">
            <div
              className="overflow-hidden rounded-2xl shadow-lg"
              style={{ background: sidebarGradient }}
            >
              <div className="p-5">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/18 bg-white/14 text-yellow-300">
                  <Shield size={22} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-extrabold text-white">Don&apos;t Miss Out!</h3>
                  <p className="mt-1 text-[12px] leading-6 text-blue-200">
                    Last date: <span className="font-bold text-yellow-300">{detail.summaryMeta.lastDate}</span>
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  {primaryAction ? (
                    <SmartLink
                      href={primaryAction.href}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ff8a3d,#bf360c)] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_26px_rgba(230,81,0,0.28)] transition-transform hover:-translate-y-0.5"
                    >
                      Apply Now
                      <ArrowRight size={15} />
                    </SmartLink>
                  ) : null}
                  {notificationAction ? (
                    <SmartLink
                      href={notificationAction.href}
                      className="inline-flex w-full items-center justify-center gap-2 text-[11px] font-semibold text-blue-300 transition-colors hover:text-white"
                    >
                      <Download size={12} />
                      Download Notification PDF
                    </SmartLink>
                  ) : null}
                </div>
              </div>
            </div>

            {detail.importantDates.length ? (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-orange-100 px-5 py-3.5" style={{ background: 'linear-gradient(90deg, #fff8f5 0%, #ffffff 100%)' }}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', boxShadow: '0 3px 10px rgba(230,81,0,0.3)' }}>
                    <Calendar size={14} className="text-white" />
                  </div>
                  <h3 className="text-[13px] font-bold text-gray-800">Important Dates</h3>
                </div>
                <div className="grid grid-cols-2 border-b border-orange-100 px-4 py-2" style={{ background: 'linear-gradient(90deg, #fff8f5 0%, #fff3f0 100%)' }}>
                  <span className="text-[11px] font-bold text-[#e65100]">Event / Activity</span>
                  <span className="text-right text-[11px] font-bold text-[#e65100]">Date</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {detail.importantDates.map((row) => (
                    <div
                      key={`${row.label}-${row.date}-sidebar`}
                      className={cn('grid grid-cols-2 items-center px-4 py-3 transition-colors', row.status === 'active' ? 'bg-orange-50/60' : 'hover:bg-gray-50/50')}
                    >
                      <span
                        className={cn(
                          'text-[12px]',
                          row.status === 'active' ? 'font-bold text-[#e65100]' : row.status === 'done' ? 'font-medium text-gray-400' : 'font-medium text-gray-700',
                        )}
                      >
                        {row.label}
                      </span>
                      <div className="flex items-center justify-end gap-1.5">
                        <Calendar size={11} className={cn(row.status === 'active' ? 'text-orange-400' : row.status === 'done' ? 'text-gray-300' : 'text-orange-300')} />
                        <span
                          className={cn(
                            'text-[12px]',
                            row.status === 'active' ? 'font-bold text-[#e65100]' : row.status === 'done' ? 'font-semibold text-gray-400' : 'font-semibold text-gray-600',
                          )}
                        >
                          {row.date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 px-4 py-2.5" style={{ background: '#fafafa' }}>
                  <p className="text-[10px] text-gray-400">* All dates are tentative and subject to change by the authority.</p>
                </div>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
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
                          <span className={cn('rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em]', tagConfig[post.tag as keyof typeof tagConfig].className)}>
                            {tagConfig[post.tag as keyof typeof tagConfig].label}
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

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#e65100]">
                  <Bell size={14} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-gray-800">Get Job Alerts</div>
                  <div className="text-[10px] text-gray-400">Instant notification to your inbox</div>
                </div>
              </div>
              <p className="mb-3 text-[11px] leading-[1.6] text-gray-500">
                Receive updates for {item.org} and similar exams directly to your inbox.
              </p>
              <div className="flex gap-2">
                <input
                  ref={subscribeInputRef}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-300"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSubscribe();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={isSubscribing}
                  onClick={handleSubscribe}
                  className="shrink-0 rounded-xl px-3 py-2 text-white transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', fontSize: 12, fontWeight: 700 }}
                >
                  {isSubscribing ? '...' : <Send size={14} />}
                </button>
              </div>
              {subscriptionMessage ? (
                <p className={`mt-2 text-[11px] ${isSubscribed ? 'text-green-600' : 'text-amber-700'}`}>{subscriptionMessage}</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-700" />
                <div>
                  <div className="text-[12px] font-extrabold text-amber-800">⚠️ Disclaimer</div>
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    All information is sourced from official websites. Please verify details on the official portal before applying. <span className="font-bold">SarkariExams.me</span> is not a government website.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      </div>

      <>
        {showShareModal ? (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-[#020617]/55 p-4 backdrop-blur-sm"
            onClick={() => setShowShareModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Share Update</div>
                  <div className="mt-1 text-lg font-extrabold text-gray-900">Share this detail page</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="space-y-3 px-5 py-5">
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Share2 size={15} />
                    Share using device options
                  </span>
                  <ChevronRight size={15} className="text-gray-400" />
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Copy size={15} />
                    {copied ? 'Link copied' : 'Copy page link'}
                  </span>
                  <ChevronRight size={15} className="text-gray-400" />
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Printer size={15} />
                    Print this page
                  </span>
                  <ChevronRight size={15} className="text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {mobileCtaVisible && primaryAction ? (
          <div
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
                Apply Now
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
          </div>
        ) : null}
      </>
    </div>
  );
}

export function PublicAnnouncementDetailPage(props: PublicAnnouncementDetailPageProps) {
  const resetKey = `${props.item.slug}-${props.item.detail.engagement.likes}-${props.item.detail.qa.length}`;
  return <PublicAnnouncementDetailPageInner key={resetKey} {...props} />;
}
