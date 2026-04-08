'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Sunset } from 'lucide-react';
import { useTheme } from 'next-themes';

const THEMES = [
  { key: 'light',   label: 'Day',     Icon: Sun,    gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)', glow: 'rgba(251,191,36,0.5)' },
  { key: 'evening', label: 'Evening', Icon: Sunset, gradient: 'linear-gradient(135deg, #f97316, #dc2626)', glow: 'rgba(249,115,22,0.5)' },
  { key: 'dark',    label: 'Night',   Icon: Moon,   gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', glow: 'rgba(99,102,241,0.5)' },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8 w-[104px] rounded-full bg-muted animate-pulse" />;
  }

  const currentIndex = THEMES.findIndex(t => t.key === theme);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div
      className="relative flex items-center gap-0.5 rounded-full p-[3px] transition-colors duration-300"
      style={{
        background: theme === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : theme === 'evening'
            ? 'rgba(180,83,9,0.12)'
            : 'rgba(0,0,0,0.06)',
      }}
    >
      {/* Sliding pill indicator */}
      <div
        className="absolute top-[3px] h-[26px] w-[32px] rounded-full transition-all duration-300 ease-out"
        style={{
          left: `${3 + activeIndex * 34}px`,
          background: THEMES[activeIndex].gradient,
          boxShadow: `0 2px 10px ${THEMES[activeIndex].glow}`,
        }}
      />

      {THEMES.map((t, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setTheme(t.key)}
            className="relative z-10 flex h-[26px] w-[32px] items-center justify-center rounded-full transition-all duration-200"
            title={t.label}
          >
            <t.Icon
              className="transition-all duration-300"
              size={13}
              style={{
                color: isActive ? '#fff' : theme === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
                transform: isActive ? 'scale(1.15)' : 'scale(1)',
                filter: isActive ? 'drop-shadow(0 0 3px rgba(255,255,255,0.5))' : 'none',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
