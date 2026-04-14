import type { Metadata } from "next";

export const siteConfig = {
  name: "SarkariExams.me",
  description: "India-focused government opportunities platform for latest jobs, results, admit cards, admissions, and official notices.",
  url: "https://sarkariexams.me",
  ogImage: "https://sarkariexams.me/file.svg",
  links: {
    twitter: "https://twitter.com/sarkariexams",
    facebook: "https://facebook.com/sarkariexams",
  },
};

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - Government Jobs, Results, Admit Cards 2026`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "sarkari result",
    "government jobs",
    "sarkari naukri",
    "railway jobs",
    "bank jobs",
    "SSC jobs",
    "UPSC recruitment",
    "admit card",
    "exam results",
    "govt jobs 2026",
  ],
  authors: [
    {
      name: "SarkariExams",
      url: siteConfig.url,
    },
  ],
  creator: "SarkariExams",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteConfig.url,
    title: siteConfig.name,
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
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@sarkariexams",
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
  },
  manifest: "/manifest.json",
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
