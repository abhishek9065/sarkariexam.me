import Link from 'next/link';
import type { CommunityPageMeta } from '@/app/lib/public-content';
import { PublicPageHeader } from './PublicPageHeader';
import { PublicPanel } from './PublicPanel';

export function PublicCommunityPage({ meta }: { meta: CommunityPageMeta }) {
  return (
    <div className="mx-auto max-w-6xl px-3 py-4">
      <PublicPageHeader
        title={meta.title}
        eyebrow={meta.eyebrow}
        description={meta.description}
        headerColor={meta.headerColor}
        stats={meta.stats}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.65fr_0.95fr]">
        <div className="space-y-4">
          <PublicPanel title="Community Route Status" headerColor={meta.headerColor}>
            <div className="space-y-4 p-4 text-sm leading-7 text-gray-700">
              <p>No external {meta.title.toLowerCase()} URL is configured right now.</p>
              <p>This fallback page keeps the route alive so footer, join buttons, and shared layout links never dead-end.</p>
            </div>
          </PublicPanel>

          {meta.sections.map((section) => (
            <PublicPanel key={`${meta.channel}-${section.title}`} title={section.title} headerColor="bg-[#37474f]">
              <div className="space-y-4 p-4 text-sm leading-7 text-gray-700">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </PublicPanel>
          ))}
        </div>

        <div className="space-y-4">
          <PublicPanel title="Quick Access" headerColor="bg-[#37474f]">
            <div className="space-y-2 p-4">
              {meta.quickLinks.map((link) => (
                <Link
                  key={`${meta.channel}-${link.label}-${link.href}`}
                  href={link.href}
                  className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </PublicPanel>
        </div>
      </div>
    </div>
  );
}
