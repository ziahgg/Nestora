'use client';

import { Bell, CalendarDays, Compass, GitCompareArrows, Heart, History, LifeBuoy, LogIn, LogOut, Menu, MessageSquare, Settings, Inbox } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { signOut } from '@/app/actions/auth';
import { Sheet } from './overlays';
import { IconButton } from './ui';

/** The Discover menu button: shortcuts to every area of the app. */
export function MenuDrawer({ signedIn, isAgent }: { signedIn: boolean; isAgent: boolean }) {
  const [open, setOpen] = useState(false);
  const links = [
    { href: '/homes', label: 'Explore homes', icon: Compass },
    { href: '/saved', label: 'Saved homes', icon: Heart },
    { href: '/compare', label: 'Compare', icon: GitCompareArrows },
    { href: '/recently-viewed', label: 'Recently viewed', icon: History },
    { href: '/inquiries', label: 'My inquiries', icon: MessageSquare },
    { href: '/viewings', label: 'My viewings', icon: CalendarDays },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/help', label: 'Help & support', icon: LifeBuoy },
    ...(isAgent ? [{ href: '/agent', label: 'Agent queue', icon: Inbox }] : []),
  ];
  return (
    <>
      <IconButton icon={Menu} label="Open menu" onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title="Menu">
        <nav aria-label="Menu">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-[14px] px-2 t-item hover:bg-surface-muted">
                  <l.icon size={20} aria-hidden />
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-border pt-2">
              {signedIn ? (
                <form action={signOut}>
                  <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-[14px] px-2 t-item text-error hover:bg-error-soft">
                    <LogOut size={20} aria-hidden />
                    Sign out
                  </button>
                </form>
              ) : (
                <Link href="/login" className="flex min-h-12 items-center gap-3 rounded-[14px] px-2 t-item hover:bg-surface-muted">
                  <LogIn size={20} aria-hidden />
                  Sign in
                </Link>
              )}
            </li>
          </ul>
        </nav>
      </Sheet>
    </>
  );
}
