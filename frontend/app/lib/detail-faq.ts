import type { AnnouncementItem } from './public-content';

export interface DetailFaqItem {
  answer: string;
  question: string;
}

const sectionActionCopy: Record<AnnouncementItem['section'], { answer: string; question: string }> = {
  jobs: {
    question: 'How do I apply or use the official link?',
    answer:
      'Open the official link on this page, read the notification carefully, complete the form with your registration details, and keep a copy of the final submission or receipt.',
  },
  results: {
    question: 'How do I check the result?',
    answer:
      'Open the official result link on this page, enter the required roll number or registration details if asked, and save the result PDF or scorecard for later reference.',
  },
  'admit-cards': {
    question: 'How do I download the admit card?',
    answer:
      'Open the official admit card link, log in with your registration details, download the PDF, and keep a printed copy for the relevant exam or document-verification stage.',
  },
  'answer-keys': {
    question: 'How do I check the answer key?',
    answer:
      'Open the official answer key link, select the relevant exam or paper, and compare the published answers with your response sheet before the objection deadline.',
  },
  admissions: {
    question: 'How do I complete the admission form?',
    answer:
      'Open the official admission link, read the prospectus or notice, complete the form with accurate academic details, and keep a copy of the confirmation page.',
  },
};

function buildLastDateAnswer(item: AnnouncementItem) {
  const lastDate = item.detail.summaryMeta.lastDate;
  if (!lastDate || lastDate === 'Check notice' || lastDate === 'Check official notice') {
    return 'The deadline is not available in this summary. Verify the current deadline from the official notification before taking action.';
  }
  return `The currently tracked last date is ${lastDate}. Verify the final deadline from the official notification before taking action.`;
}

function buildProcessAnswer(item: AnnouncementItem) {
  const stages = item.detail.selectionProcess?.filter(Boolean) ?? [];
  if (stages.length > 0) {
    return `The selection or next-step process for this update includes: ${stages.join(' -> ')}.`;
  }
  return 'Refer to the official notification for the complete stage-wise process, document requirements, and final instructions.';
}

function buildFeeAnswer(item: AnnouncementItem) {
  const rows = item.detail.applicationFee?.rows ?? [];
  if (rows.length > 0) {
    return `${rows.map((row) => `${row.label}: ${row.value}`).join(', ')}.`;
  }
  return 'Refer to the official notification for the category-wise fee, payment mode, and any exemption rules.';
}

export function buildDetailFaqItems(item: AnnouncementItem): DetailFaqItem[] {
  if (item.slug === 'upsc-civil-services-2025-final-result') {
    return [
      {
        question: 'What is the current status of the UPSC Civil Services 2025 update?',
        answer:
          'This page tracks the UPSC Civil Services 2025 final result update. Use the official UPSC source link on the page for roll numbers, marks, and follow-up notices.',
      },
      {
        question: 'How do I check the UPSC Civil Services 2025 final result?',
        answer:
          'Visit the official UPSC result link, open the final result notice or PDF, search your roll number carefully, and save a copy for document verification or future reference.',
      },
      {
        question: 'What is the selection process?',
        answer:
          'The selection process for this recruitment includes the following stages: Prelims (CSAT) -> Mains (Written) -> Personality Test (Interview). Each stage is qualifying in nature.',
      },
      {
        question: 'What is the application fee?',
        answer:
          'For the original application, General/OBC candidates paid Rs. 100, while SC/ST, female candidates, and ex-servicemen were exempt. Always verify fee details from the official notice.',
      },
      {
        question: 'Where can I verify exam rules such as negative marking?',
        answer:
          'Check the official UPSC exam rules and question-paper instructions. Marking rules can vary by paper, so the official notice is the final source.',
      },
    ];
  }

  return [
    {
      question: 'What is the last date for this update?',
      answer: buildLastDateAnswer(item),
    },
    {
      question: sectionActionCopy[item.section].question,
      answer: sectionActionCopy[item.section].answer,
    },
    {
      question: 'What is the selection or next-step process?',
      answer: buildProcessAnswer(item),
    },
    {
      question: 'What is the application fee?',
      answer: buildFeeAnswer(item),
    },
    {
      question: 'Where can I verify exam rules such as negative marking?',
      answer:
        'Check the exam scheme in the official notification. Negative marking and evaluation rules vary by authority and paper, so use the official instructions as the final source.',
    },
  ];
}
