interface DetailStickyNavItem {
  href: string;
  label: string;
}

export function DetailStickyNav({ items }: { items: DetailStickyNavItem[] }) {
  return (
    <nav className="sticky top-[106px] z-20 overflow-x-auto rounded-[18px] border border-[#d7d7d7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="flex min-w-max items-center gap-1 px-2 py-2">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-xl border border-transparent px-3 py-2 text-[12px] font-bold text-[#4b5563] transition-colors hover:border-[#f1ccb6] hover:bg-[#fff7f1] hover:text-[#bf360c]"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
