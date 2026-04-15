import type { InfoPageMeta } from '@/app/lib/public-content';
import { PublicPageHeader } from './PublicPageHeader';
import { PublicPanel } from './PublicPanel';
import { SafeLink } from './SafeLink';

export function PublicInfoPage({ meta }: { meta: InfoPageMeta }) {
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
          {meta.sections.map((section) => (
            <PublicPanel key={`${meta.slug}-${section.title}`} title={section.title} headerColor={meta.headerColor}>
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
                <SafeLink
                  key={`${meta.slug}-${link.href}-${link.label}`}
                  href={link.href}
                  className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]"
                >
                  {link.label}
                </SafeLink>
              ))}
            </div>
          </PublicPanel>

          <PublicPanel title="Reader Note" headerColor="bg-[#1a237e]">
            <div className="space-y-3 p-4 text-sm leading-7 text-gray-600">
              <p>This page is intentionally kept inside the same public shell as the homepage.</p>
              <p>Supporting pages should never feel like a second product or a generic placeholder screen.</p>
            </div>
          </PublicPanel>
        </div>
      </div>
    </div>
  );
}
