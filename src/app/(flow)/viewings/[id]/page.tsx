import { CalendarPlus, CircleCheck, Info } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AgentCard } from '@/components/cards';
import { DateTile } from '@/components/date-tile';
import { MiniMap } from '@/components/mini-map';
import { Screen } from '@/components/screen';
import { ShareButton } from '@/components/share-button';
import { DetailTable, InfoNote, StatusBadge, TopBar } from '@/components/ui';
import { ViewingActions } from '@/components/viewing-actions';
import { dateTime, dayLong, time, weekdayShort } from '@/lib/domain/format';
import { canChangeViewing, VIEWING_STATUS, VIEWING_TYPE_LABEL } from '@/lib/domain/listing';
import { requestTime } from '@/lib/request-time';
import { getViewing } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Viewing appointment' };

/** Figma "Appointment / Details" (+ Rescheduled, Cancelled). */
export default async function ViewingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ rescheduled?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { userId } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const v = await getViewing(id);
  if (!v || v.user_id !== userId) notFound();
  const now = requestTime();
  const s = VIEWING_STATUS[v.status];
  const changeable = canChangeViewing(v, now);
  const past = v.status !== 'cancelled' && Date.parse(v.ends_at) <= now;

  return (
    <Screen footer={changeable ? <ViewingActions viewingId={v.id} when={dateTime(v.starts_at)} /> : undefined} tabs={false}>
      <TopBar title="Viewing appointment" back="/viewings" right={<ShareButton text={`Viewing · ${v.property.title} · ${dateTime(v.starts_at)}`} path={`/homes/${v.property.slug}`} label="Share the home" />} />
      {sp.rescheduled && v.status !== 'cancelled' ? (
        <InfoNote icon={CircleCheck} tone="amber">
          Rescheduled to {dateTime(v.starts_at)}. {v.agent.full_name} sees the new time in their queue.
        </InfoNote>
      ) : null}
      <Link href={`/homes/${v.property.slug}`} className="flex items-center gap-3 rounded-[24px] bg-surface p-3.5 hover:bg-white/80">
        <DateTile at={v.starts_at} muted={v.status === 'cancelled' || past} />
        <div className="min-w-0">
          <p className="t-caption text-text-secondary">
            {weekdayShort(v.starts_at)} · {time(v.starts_at)} · {VIEWING_TYPE_LABEL[v.viewing_type]}
          </p>
          <p className="truncate t-card-title">{v.property.title}</p>
          <StatusBadge tone={past ? 'neutral' : s.tone} className="mt-1">
            {past ? 'Past' : s.label}
          </StatusBadge>
        </div>
      </Link>
      {v.viewing_type === 'in_person' ? <MiniMap label={`Illustrative map of ${v.property.title}`} x={Number(v.property.map_x)} y={Number(v.property.map_y)} /> : null}
      <DetailTable
        rows={[
          { label: 'Date', value: dayLong(v.starts_at) },
          { label: 'Time', value: `${time(v.starts_at)} – ${time(v.ends_at)}` },
          { label: 'Type', value: VIEWING_TYPE_LABEL[v.viewing_type] },
          { label: 'Address', value: `${v.property.address_line}, ${v.property.city} ${v.property.postal_code}` },
          { label: 'Reference', value: v.reference },
        ]}
      />
      {v.status === 'cancelled' ? (
        <InfoNote icon={Info}>
          Cancelled {v.cancelled_at ? `on ${dateTime(v.cancelled_at)}` : ''} by {v.cancelled_by === 'agent' ? v.agent.full_name : 'you'}.{v.cancel_reason ? ` ${v.cancel_reason}` : ''} The time has been released.
        </InfoNote>
      ) : null}
      <AgentCard agent={v.agent} subtitle={v.agent.email} />
      {v.status !== 'cancelled' ? (
        <a href={`/viewings/${v.id}/ics`} download className="flex items-center gap-3 rounded-[20px] bg-surface px-4 py-3.5 t-item hover:bg-white/80">
          <CalendarPlus size={20} aria-hidden />
          <span className="flex-1">Add to calendar</span>
          <span className="t-caption text-text-muted">.ics</span>
        </a>
      ) : null}
    </Screen>
  );
}
