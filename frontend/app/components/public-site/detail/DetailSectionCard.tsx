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
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-orange-100 bg-[linear-gradient(90deg,#fff8f5_0%,#ffffff_100%)] px-5 py-3.5">
        <div className="flex items-center gap-3">
          {icon ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-[#e65100]">
              {icon}
            </div>
          ) : null}
          <div>
            {eyebrow ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#bf360c]/75">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="text-[15px] font-extrabold text-gray-800">{title}</h2>
          </div>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}
