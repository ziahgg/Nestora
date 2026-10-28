'use client';

import { Compass, Heart, House, MessageSquare, UserRound, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cx } from './ui';

const TABS: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: '/', label: 'Home', icon: House, match: (p) => p === '/' },
  { href: '/homes', label: 'Explore', icon: Compass, match: (p) => p.startsWith('/homes') || p.startsWith('/search') },
  { href: '/saved', label: 'Saved', icon: Heart, match: (p) => p.startsWith('/saved') || p.startsWith('/compare') || p.startsWith('/recently-viewed') },
  { href: '/inquiries', label: 'Inquiries', icon: MessageSquare, match: (p) => p.startsWith('/inquiries') },
  { href: '/profile', label: 'Profile', icon: UserRound, match: (p) => p.startsWith('/profile') || p.startsWith('/viewings') || p.startsWith('/notifications') || p.startsWith('/settings') || p.startsWith('/help') },
];

/** Figma "Bottom navigation": floating white pill, five labelled tabs; the active icon is filled ink. */
export function AppNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 px-5 pb-[max(14px,env(safe-area-inset-bottom))]">
      <ul className="mx-auto flex h-[62px] max-w-[560px] items-center justify-between rounded-full bg-surface px-2 shadow-[var(--shadow-nav)]">
        {TABS.map((t) => {
          const on = t.match(path);
          return (
            <li key={t.href} className="flex-1">
              <Link href={t.href} aria-current={on ? 'page' : undefined} className="flex min-h-11 flex-col items-center justify-center gap-1">
                <t.icon size={22} strokeWidth={on ? 2.2 : 1.6} fill={on && t.href !== '/homes' ? 'currentColor' : 'none'} className={on ? 'text-ink' : 'text-text-muted'} aria-hidden />
                <span className={cx('t-nav', on ? 'text-ink' : 'text-text-muted')}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
