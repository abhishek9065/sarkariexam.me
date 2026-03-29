import type { ReactNode } from 'react';

interface DetailSectionCardProps {
  children: ReactNode;
  eyebrow?: string;
  icon?: ReactNode;
  title: string;
}

export function DetailSectionCard({
  children,
  eyebrow,
  icon,
  title,
}: DetailSectionCardProps) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[#d7d7d7] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="border-b border-[#f1ccb6] bg-[linear-gradient(90deg,#fff3eb_0%,#fffaf6_52%,#ffffff_100%)] px-4 py-3.5 sm:px-5">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#efc1a4] bg-[#fff3eb] text-[#bf360c] shadow-sm">
              {icon}
            </div>
          ) : null}
          <div>
            {eyebrow ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#bf360c]/80">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="text-[15px] font-black text-[#1f2937] sm:text-base">{title}</h2>
          </div>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}
