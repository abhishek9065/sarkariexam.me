interface DetailStickyNavItem {
  href: string;
  label: string;
}

export function DetailStickyNav({ items }: { items: DetailStickyNavItem[] }) {
  return (
    <nav className="sticky top-[106px] z-20 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex min-w-max items-center gap-1 px-2 py-2">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-xl px-3 py-2 text-[12px] font-bold text-gray-600 transition-colors hover:bg-orange-50 hover:text-[#e65100]"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
