import { BellOff, Settings } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { MarkAllRead } from '@/components/notification-bits';
import { KIND_ICON } from '@/components/notification-icons';
import { Screen } from '@/components/screen';
import { EmptyState, IconButton, TopBar, cx } from '@/components/ui';
import { dayGroup, stamp } from '@/lib/domain/format';
import { requestTime } from '@/lib/request-time';
import { myNotifications } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Notifications' };

/** Figma "Notifications" (default, all read, empty). */
export default async function NotificationsPage() {
  const { userId } = await requireUser();
  const now = requestTime();
  const items = await myNotifications(userId);
  const unread = items.filter((n) => !n.read_at).length;
  const groups = [
    { label: 'Today', items: items.filter((n) => dayGroup(n.created_at, now) === 'Today') },
    { label: 'Earlier', items: items.filter((n) => dayGroup(n.created_at, now) !== 'Today') },
  ].filter((g) => g.items.length);
  return (
    <Screen tabs={false}>
      <TopBar title="Notifications" back="/profile" right={<IconButton icon={Settings} label="Notification settings" href="/settings" />} />
      {items.length ? (
        <>
          <div className="flex items-center justify-between">
            <p className="t-body text-text-secondary">{unread ? `${unread} unread` : 'All caught up'}</p>
            <MarkAllRead disabled={!unread} />
          </div>
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label} className="flex flex-col gap-2">
              <h2 className="t-caption text-text-muted">{g.label}</h2>
              <ul className="divide-y divide-border overflow-hidden rounded-[28px] bg-surface">
                {g.items.map((n) => {
                  const Icon = KIND_ICON[n.kind];
                  return (
                    <li key={n.id} className={cx(!n.read_at && 'bg-amber-soft')}>
                      <Link href={`/notifications/${n.id}`} className="flex gap-3 p-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface">
                          <Icon size={20} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block t-card-title">
                            {n.title}
                            {!n.read_at ? <span className="sr-only"> (unread)</span> : null}
                          </span>
                          <span className="block t-caption text-text-secondary">{n.body}</span>
                          <span className="mt-1 block t-caption text-text-muted">{stamp(n.created_at, now)}</span>
                        </span>
                        {!n.read_at ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber" aria-hidden /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <p className="t-caption text-text-muted">Notifications appear in the app only — no email, SMS or push messages are sent.</p>
        </>
      ) : (
        <EmptyState icon={BellOff} title="No notifications" message="Agent replies, viewing updates and price changes on saved homes appear here." />
      )}
    </Screen>
  );
}
