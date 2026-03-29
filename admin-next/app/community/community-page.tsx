'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  CornerDownRight,
  MessageCircle,
  Search,
  Shield,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

type QAAnswer = {
  id: number;
  author: string;
  initials: string;
  avatarColor: string;
  text: string;
  time: string;
  likes: number;
  isBest: boolean;
  approved: boolean;
};

type QAQuestion = {
  id: number;
  author: string;
  initials: string;
  avatarColor: string;
  text: string;
  time: string;
  likes: number;
  approved: boolean;
  postTitle: string;
  answers: QAAnswer[];
};

const INITIAL_QA: QAQuestion[] = [
  {
    id: 1,
    author: 'Rahul Sharma',
    initials: 'RS',
    avatarColor: '#1565c0',
    text: "Can final year students apply for SSC CGL 2026? I'm currently in my last semester and haven't received my degree yet.",
    time: '2 days ago',
    likes: 24,
    approved: true,
    postTitle: 'SSC CGL 2026',
    answers: [
      {
        id: 1,
        author: 'SarkariExams Team',
        initials: 'SE',
        avatarColor: '#e65100',
        text: 'Yes. Final year students can apply provisionally. You must submit the degree certificate during document verification.',
        time: '2 days ago',
        likes: 18,
        isBest: true,
        approved: true,
      },
      {
        id: 2,
        author: 'Neha Gupta',
        initials: 'NG',
        avatarColor: '#00695c',
        text: 'I applied in the last cycle as a final year student. Keep a provisional certificate ready.',
        time: '1 day ago',
        likes: 9,
        isBest: false,
        approved: true,
      },
    ],
  },
  {
    id: 2,
    author: 'Priya Verma',
    initials: 'PV',
    avatarColor: '#2e7d32',
    text: 'Is there any application fee waiver for female candidates in General category for SSC CGL?',
    time: '1 day ago',
    likes: 15,
    approved: true,
    postTitle: 'SSC CGL 2026',
    answers: [
      {
        id: 1,
        author: 'Amit Kumar',
        initials: 'AK',
        avatarColor: '#6a1b9a',
        text: 'Yes. Female candidates are exempted from the application fee regardless of category.',
        time: '1 day ago',
        likes: 12,
        isBest: true,
        approved: true,
      },
    ],
  },
  {
    id: 3,
    author: 'Anjali Mishra',
    initials: 'AM',
    avatarColor: '#37474f',
    text: 'What documents are required for UP Police Constable document verification?',
    time: '5 hours ago',
    likes: 3,
    approved: false,
    postTitle: 'UP Police Constable 2026',
    answers: [],
  },
  {
    id: 4,
    author: 'Suresh Kumar',
    initials: 'SK',
    avatarColor: '#00695c',
    text: 'Can I apply for IBPS PO 2026 if I have a gap year after graduation?',
    time: '3 hours ago',
    likes: 1,
    approved: false,
    postTitle: 'IBPS PO 2026',
    answers: [
      {
        id: 1,
        author: 'Anonymous',
        initials: 'AN',
        avatarColor: '#9e9e9e',
        text: "Yes. A gap year doesn't affect eligibility if you meet the qualification and age criteria.",
        time: '2 hours ago',
        likes: 0,
        isBest: false,
        approved: false,
      },
    ],
  },
];

export function CommunityPage() {
  const [questions, setQuestions] = useState<QAQuestion[]>(INITIAL_QA);
  const [expanded, setExpanded] = useState<number[]>([1, 2]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'question' | 'answer'; qId: number; aId?: number } | null>(null);

  const filtered = useMemo(() => questions.filter(question => {
    const matchSearch =
      question.text.toLowerCase().includes(search.toLowerCase()) ||
      question.postTitle.toLowerCase().includes(search.toLowerCase()) ||
      question.author.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'pending' && !question.approved) ||
      (filter === 'approved' && question.approved);
    return matchSearch && matchFilter;
  }), [filter, questions, search]);

  const pendingCount =
    questions.filter(question => !question.approved).length +
    questions.flatMap(question => question.answers).filter(answer => !answer.approved).length;

  function toggleExpand(id: number) {
    setExpanded(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  function approveQuestion(id: number) {
    setQuestions(current => current.map(question => question.id === id ? { ...question, approved: true } : question));
    toast.success('Question approved and published.');
  }

  function approveAnswer(qId: number, aId: number) {
    setQuestions(current => current.map(question => (
      question.id === qId
        ? { ...question, answers: question.answers.map(answer => answer.id === aId ? { ...answer, approved: true } : answer) }
        : question
    )));
    toast.success('Answer approved.');
  }

  function markBestAnswer(qId: number, aId: number) {
    setQuestions(current => current.map(question => (
      question.id === qId
        ? { ...question, answers: question.answers.map(answer => ({ ...answer, isBest: answer.id === aId })) }
        : question
    )));
    toast.success('Marked as best answer.');
  }

  function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'question') {
      setQuestions(current => current.filter(question => question.id !== deleteTarget.qId));
      toast.success('Question deleted.');
    } else {
      setQuestions(current => current.map(question => (
        question.id === deleteTarget.qId
          ? { ...question, answers: question.answers.filter(answer => answer.id !== deleteTarget.aId) }
          : question
      )));
      toast.success('Answer deleted.');
    }
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c2d9ff] bg-[#eff4ff]">
            <MessageCircle className="h-4.5 w-4.5 text-blue-700" />
          </div>
          <div>
            <h2 className="text-[18px] font-extrabold text-gray-800">Q&A Moderation</h2>
            <p className="text-[11px] text-gray-400">{pendingCount} items pending review</p>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-[12px] font-bold text-amber-700">{pendingCount} pending moderation</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Questions', value: '156', color: '#1565c0' },
          { label: 'Approved', value: '139', color: '#2e7d32' },
          { label: 'Pending Review', value: '17', color: '#f57f17' },
          { label: 'Best Answers', value: '98', color: '#e65100' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <div className="text-[20px] font-extrabold" style={{ color: item.color }}>{item.value}</div>
            <div className="mt-0.5 text-[11px] text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-48 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search questions, posts, authors..."
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="flex rounded-xl bg-gray-100 p-1">
            {(['all', 'pending', 'approved'] as const).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px] font-semibold capitalize transition-all',
                  filter === item ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-[22px] border border-gray-100 bg-white py-12 text-center text-[13px] text-gray-400 shadow-sm">
            No questions found matching your filters.
          </div>
        ) : (
          filtered.map(question => {
            const isExpanded = expanded.includes(question.id);

            return (
              <div key={question.id} className="overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-sm">
                <div className={cn('border-l-4 p-4', question.approved ? 'border-green-400' : 'border-amber-400')}>
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                      style={{ background: `linear-gradient(135deg, ${question.avatarColor}cc, ${question.avatarColor})` }}
                    >
                      {question.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-bold text-gray-800">{question.author}</span>
                        <span className="text-[10px] text-gray-400">· {question.time}</span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700">📌 {question.postTitle}</span>
                        <span
                          className={cn(
                            'flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold',
                            question.approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          )}
                        >
                          {question.approved ? <CheckCircle className="h-2 w-2" /> : <Clock className="h-2 w-2" />}
                          {question.approved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-700">{question.text}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <ThumbsUp className="h-2.5 w-2.5" />
                          {question.likes}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <MessageCircle className="h-2.5 w-2.5" />
                          {question.answers.length} answers
                        </span>
                        {!question.approved && (
                          <button
                            type="button"
                            onClick={() => approveQuestion(question.id)}
                            className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700 transition-colors hover:bg-green-100"
                          >
                            <CheckCircle className="h-2.5 w-2.5" />
                            Approve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ type: 'question', qId: question.id })}
                          className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600 transition-colors hover:bg-red-100"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                          Delete
                        </button>
                        {question.answers.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(question.id)}
                            className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-blue-600 transition-colors hover:text-blue-800"
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {isExpanded ? 'Hide Answers' : 'View Answers'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="divide-y divide-gray-50 border-t border-gray-100">
                    {question.answers.map(answer => (
                      <div key={answer.id} className={cn('flex items-start gap-3 pl-10 pr-4 py-3.5', !answer.approved ? 'bg-amber-50/40' : 'bg-gray-50/30')}>
                        <CornerDownRight className="mt-2 h-3 w-3 shrink-0 text-gray-300" />
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
                          style={{ background: `linear-gradient(135deg, ${answer.avatarColor}cc, ${answer.avatarColor})` }}
                        >
                          {answer.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-[12px] font-bold text-gray-800">{answer.author}</span>
                            {answer.isBest && (
                              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-green-700 to-green-500 px-2 py-0.5 text-[9px] font-extrabold text-white">
                                <BadgeCheck className="h-2.5 w-2.5" />
                                Best Answer
                              </span>
                            )}
                            {!answer.approved && (
                              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                                <Clock className="h-2 w-2" />
                                Pending
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400">· {answer.time}</span>
                          </div>
                          <p className="text-[12.5px] text-gray-700">{answer.text}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <ThumbsUp className="h-2.5 w-2.5" />
                              {answer.likes}
                            </span>
                            {!answer.approved && (
                              <button
                                type="button"
                                onClick={() => approveAnswer(question.id, answer.id)}
                                className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700 transition-colors hover:bg-green-100"
                              >
                                <CheckCircle className="h-2.5 w-2.5" />
                                Approve
                              </button>
                            )}
                            {!answer.isBest && answer.approved && (
                              <button
                                type="button"
                                onClick={() => markBestAnswer(question.id, answer.id)}
                                className="flex items-center gap-1 rounded-lg border border-yellow-200 bg-yellow-50 px-2 py-1 text-[10px] font-bold text-yellow-700 transition-colors hover:bg-yellow-100"
                              >
                                <BadgeCheck className="h-2.5 w-2.5" />
                                Mark Best
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ type: 'answer', qId: question.id, aId: answer.id })}
                              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600 transition-colors hover:bg-red-100"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-[22px] border border-blue-100 bg-blue-50 p-4">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <div>
          <div className="text-[12px] font-bold text-blue-800">Moderation Guidelines</div>
          <p className="mt-1 text-[11px] leading-6 text-blue-700">
            Approve questions and answers that are relevant, helpful, and follow community guidelines. Delete spam,
            offensive content, or irrelevant posts. Mark the most accurate response as the best answer.
          </p>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[rgba(10,20,60,0.55)] p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-sm rounded-[22px] bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-red-100">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="mb-2 text-[16px] font-extrabold text-gray-800">
              Delete {deleteTarget.type === 'question' ? 'Question' : 'Answer'}?
            </h3>
            <p className="mb-5 text-[13px] text-gray-500">This will permanently remove the selected item.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #c62828, #b71c1c)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
