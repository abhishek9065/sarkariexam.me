import type { AuxiliaryPageMeta } from '@/app/lib/public-content';
import { PublicPageHeader } from './PublicPageHeader';
import { PublicPanel } from './PublicPanel';
import { SafeLink } from './SafeLink';

export function PublicAuxiliaryPage({ meta }: { meta: AuxiliaryPageMeta }) {
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
          <PublicPanel title="Featured Actions" headerColor={meta.headerColor}>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {meta.cards.map((card) => (
                <SafeLink
                  key={`${meta.slug}-${card.label}`}
                  href={card.href}
                  className="rounded-xl border border-gray-100 px-4 py-4 transition-colors hover:border-orange-200 hover:bg-orange-50/60"
                >
                  <div className="text-[13px] font-semibold text-gray-800">{card.label}</div>
                  <p className="mt-2 text-[12px] leading-6 text-gray-500">{card.description}</p>
                </SafeLink>
              ))}
            </div>
          </PublicPanel>

          {meta.sections.map((section) => (
            <PublicPanel key={`${meta.slug}-${section.title}`} title={section.title} headerColor="bg-[#37474f]">
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
                  key={`${meta.slug}-${link.label}-${link.href}`}
                  href={link.href}
                  className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]"
                >
                  {link.label}
                </SafeLink>
              ))}
            </div>
          </PublicPanel>
        </div>
      </div>
    </div>
  );
}
