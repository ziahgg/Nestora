import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PropertyMini } from '@/components/cards';
import { MarkRead } from '@/components/notification-bits';
import { KIND_ICON } from '@/components/notification-icons';
import { firstImage } from '@/components/photo';
import { Screen } from '@/components/screen';
import { ButtonLink, TopBar } from '@/components/ui';
import { dayShort, money, stamp, time } from '@/lib/domain/format';
import { requestTime } from '@/lib/request-time';
import { getNotification } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Notification' };

/** Figma "Notification Details" (viewing reminder, inquiry reply). */
export default async function NotificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const n = await getNotification(id);
  if (!n || n.user_id !== userId) notFound();
  const Icon = KIND_ICON[n.kind];
  const now = requestTime();
  const action = n.viewing_id
    ? { href: `/viewings/${n.viewing_id}`, label: 'View appointment' }
    : n.inquiry_id
      ? { href: `/inquiries/${n.inquiry_id}`, label: 'View inquiry' }
      : n.property
        ? { href: `/homes/${n.property.slug}`, label: 'View home' }
        : null;
  return (
    <Screen tabs={false}>
      <MarkRead id={n.id} unread={!n.read_at} />
      <TopBar title="Notification" back="/notifications" />
      <div className="flex flex-col items-center gap-3 rounded-[28px] bg-surface p-6 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-amber-soft text-amber">
          <Icon size={28} aria-hidden />
        </span>
        <h1 className="t-title-l">{n.title}</h1>
        <p className="t-caption text-text-muted">
          {stamp(n.created_at, now) === time(n.created_at) ? 'Today' : dayShort(n.created_at)} · {time(n.created_at)}
        </p>
        <p className="t-body text-text-secondary">{n.body}</p>
      </div>
      {n.property ? <PropertyMini title={n.property.title} city={n.property.city} line={`${money(n.property.monthly_rent)} / month`} image={firstImage(n.property.images)} href={`/homes/${n.property.slug}`} /> : null}
      {action ? (
        <ButtonLink href={action.href} full>
          {action.label}
        </ButtonLink>
      ) : null}
    </Screen>
  );
}
