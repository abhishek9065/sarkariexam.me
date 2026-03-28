import type { PublicStat } from '@/app/lib/public-content';

interface PublicPageHeaderProps {
  description: string;
  eyebrow: string;
  headerColor: string;
  stats: PublicStat[];
  title: string;
}

export function PublicPageHeader({
  description,
  eyebrow,
  headerColor,
  stats,
  title,
}: PublicPageHeaderProps) {
  return (
    <section className={`${headerColor} overflow-hidden rounded-2xl px-5 py-6 text-white shadow-sm md:px-6 md:py-7`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">{description}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">{stat.label}</div>
            <div className="mt-1 text-xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
