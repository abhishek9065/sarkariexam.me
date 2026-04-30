import type { Metadata } from "next";

const siteUrl = "https://sarkariexams.me";

export const siteConfig = {
  name: "SarkariExam.me",
  description: "Trusted government jobs and exam update platform for latest jobs, results, admit cards, answer keys, syllabus, admissions, scholarships, and official notices.",
  url: siteUrl,
  ogImage: `${siteUrl}/opengraph-image`,
  links: {
    twitter: "https://twitter.com/sarkariexams",
    facebook: "https://facebook.com/sarkariexams",
  },
};

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: `${siteConfig.name} - Government Jobs, Results, Admit Cards, Answer Keys`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: '/',
  },
  keywords: [
    "sarkari result",
    "government jobs",
    "sarkari naukri",
    "latest govt jobs",
    "railway jobs",
    "bank jobs",
    "SSC jobs",
    "UPSC recruitment",
    "admit card",
    "exam results",
    "answer key",
    "syllabus",
    "scholarship",
    "admissions",
    "govt jobs",
  ],
  authors: [
    {
      name: "SarkariExam",
      url: siteConfig.url,
    },
  ],
  creator: "SarkariExam",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteConfig.url,
    title: `${siteConfig.name} - Government Jobs, Results, Admit Cards, Answer Keys`,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} - Government Jobs, Results, Admit Cards, Answer Keys`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@sarkariexams",
    site: "@sarkariexams",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/file.svg",
    shortcut: "/file.svg",
  },
  manifest: "/manifest.json",
  category: "education",
};

export function generateJobMetadata(job: {
  title: string;
  organization: string;
  department: string;
  location: string;
  posts: number;
}): Metadata {
  return {
    title: `${job.title} - ${job.posts} Posts`,
    description: `Apply for ${job.title} at ${job.organization}. ${job.posts} vacancies in ${job.location}. Last date, eligibility, salary details available.`,
    keywords: [
      job.title.toLowerCase(),
      job.organization.toLowerCase(),
      job.department.toLowerCase(),
      "sarkari result",
      "government jobs",
      "sarkari naukri",
    ],
    openGraph: {
      title: `${job.title} - ${job.posts} Posts`,
      description: `Apply for ${job.title} at ${job.organization}. ${job.posts} vacancies in ${job.location}.`,
      type: "article",
    },
  };
}
