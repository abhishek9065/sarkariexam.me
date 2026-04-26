import type { AnnouncementItem } from './public-content';

export interface DetailFaqItem {
  answer: string;
  question: string;
}

export function buildDetailFaqItems(item: AnnouncementItem): DetailFaqItem[] {
  if (item.slug === 'upsc-civil-services-2025-final-result') {
    return [
      {
        question: 'What is the last date to apply for Union Public Service Commission?',
        answer:
          'The last date to apply is N/A. We strongly recommend applying at least 2-3 days before the deadline to avoid last-minute server congestion issues.',
      },
      {
        question: 'How to download the admit card?',
        answer:
          'Visit the official website, login with your registration number and date of birth, navigate to the Admit Card section, and download the PDF. Keep a print-out for the exam day.',
      },
      {
        question: 'What is the selection process?',
        answer:
          'The selection process for this recruitment includes the following stages: Prelims (CSAT) -> Mains (Written) -> Personality Test (Interview). Each stage is qualifying in nature.',
      },
      {
        question: 'What is the application fee?',
        answer:
          'General/OBC: Rs. 100, SC/ST: Rs. 0, Female (All Category): Rs. 0, Ex-Servicemen: Rs. 0. Fee is paid online via debit/credit card or net banking.',
      },
      {
        question: 'Is there negative marking?',
        answer:
          'Yes, for objective type papers there is a deduction of 0.25 marks for each wrong answer. Unattempted questions carry no penalty.',
      },
    ];
  }

  return [
    {
      question: `What is the last date for ${item.org}?`,
      answer: `The currently tracked last date is ${item.detail.summaryMeta.lastDate}. Verify the final deadline from the official notification before taking action.`,
    },
    {
      question: 'How to download the admit card?',
      answer:
        'Visit the official website, sign in with your registration details, open the admit card or document section, and download the PDF. Keep a printed copy for the relevant stage.',
    },
    {
      question: 'What is the selection process?',
      answer: `The selection process for this update includes the following stages: ${item.detail.selectionProcess?.join(' -> ') ?? 'Refer official notification for the complete stage-wise process.'}`,
    },
    {
      question: 'What is the application fee?',
      answer:
        item.detail.applicationFee?.rows.length
          ? `${item.detail.applicationFee.rows.map((row) => `${row.label}: ${row.value}`).join(', ')}.`
          : 'Refer the official notification for the category-wise application fee and payment mode.',
    },
    {
      question: 'Is there negative marking?',
      answer:
        'Check the exam scheme in the official notification. Negative marking varies by authority and paper, so use the official exam instructions as the final source.',
    },
  ];
}
