import { Bell, CalendarDays, CircleHelp, Heart, History, Inbox, MessageSquare, Pencil, Settings } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Avatar } from '@/components/photo';
import { Screen } from '@/components/screen';
import { IconButton, ListRow, PageTitle, ProgressBar } from '@/components/ui';
import { profileCompleteness } from '@/lib/domain/listing';
import { requestTime } from '@/lib/request-time';
import { getProfile, myAgent, profileStats, unreadCount } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Profile' };

/** Figma "Profile / Default". */
export default async function ProfilePage() {
  const { userId, email } = await requireUser();
  const [profile, stats, unread, agent] = await Promise.all([getProfile(userId), profileStats(userId, requestTime()), unreadCount(userId), myAgent()]);
  if (!profile) return null;
  const c = profileCompleteness(profile);
  return (
    <Screen>
      <PageTitle title="Profile" />
      <section className="flex flex-col gap-4 rounded-[28px] bg-surface p-4">
        <div className="flex items-center gap-3">
          <Avatar path={profile.avatar_path} name={profile.full_name || 'You'} size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate t-card-title">{profile.full_name || 'Add your name'}</p>
            <p className="truncate t-caption text-text-muted">{profile.contact_email ?? email}</p>
          </div>
          <IconButton icon={Pencil} label="Edit profile" href="/profile/edit" look="muted" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="t-label">Profile {c.percent}% complete</span>
            {c.nextHint ? (
              <Link href="/profile/edit" className="t-label text-amber">
                {c.nextHint}
              </Link>
            ) : null}
          </div>
          <ProgressBar value={c.percent / 100} label="Profile completeness" />
        </div>
      </section>
      <ul className="grid grid-cols-3 gap-2.5">
        {[
          { href: '/saved', icon: Heart, n: stats.saved, label: 'Saved' },
          { href: '/inquiries', icon: MessageSquare, n: stats.inquiries, label: 'Inquiries' },
          { href: '/viewings', icon: CalendarDays, n: stats.upcomingViewings, label: 'Viewings' },
        ].map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="flex flex-col gap-1 rounded-[24px] bg-surface p-4 hover:bg-white/80">
              <s.icon size={20} aria-hidden />
              <span className="mt-2 t-title-l num">{s.n}</span>
              <span className="t-caption text-text-muted">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="divide-y divide-border overflow-hidden rounded-[28px] bg-surface">
        <ListRow icon={CalendarDays} label="My viewings" value={`${stats.upcomingViewings} upcoming`} href="/viewings" />
        <ListRow icon={History} label="Recently viewed" value={String(stats.recentlyViewed)} href="/recently-viewed" />
        <ListRow icon={Bell} label="Notifications" value={unread ? `${unread} new` : undefined} href="/notifications" />
        <ListRow icon={Settings} label="Settings" href="/settings" />
        <ListRow icon={CircleHelp} label="Help & support" href="/help" />
        {agent ? <ListRow icon={Inbox} label="Agent queue" value={agent.full_name} href="/agent" /> : null}
      </div>
    </Screen>
  );
}
