import type { ReactNode } from 'react';

export function DetailSidebarCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <aside className="overflow-hidden rounded-[18px] border border-[#d7d7d7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="border-b border-[#f1ccb6] bg-[linear-gradient(90deg,#fff3eb_0%,#fffaf6_52%,#ffffff_100%)] px-4 py-3">
        <h3 className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#1f2937]">
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </aside>
  );
}
