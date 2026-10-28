import { CalendarCheck, CalendarPlus } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DateTile } from '@/components/date-tile';
import { Screen } from '@/components/screen';
import { ButtonLink, DetailTable, StatusBadge } from '@/components/ui';
import { time, weekdayShort } from '@/lib/domain/format';
import { VIEWING_STATUS, VIEWING_TYPE_LABEL } from '@/lib/domain/listing';
import { getViewing } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Viewing booked' };

/** Figma "Appointment / Confirmed". */
export default async function ViewingBookedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const v = await getViewing(id);
  if (!v || v.user_id !== userId) notFound();
  const s = VIEWING_STATUS[v.status];
  return (
    <Screen tabs={false}>
      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        <span className="grid size-[104px] place-items-center rounded-full bg-success-soft">
          <span className="grid size-[72px] place-items-center rounded-full bg-success text-white">
            <CalendarCheck size={30} aria-hidden />
          </span>
        </span>
        <h1 className="t-title-xl">Viewing booked</h1>
        <p className="t-body text-text-secondary">It’s in {v.agent.full_name}’s Nestora queue (sample app — no email is sent).</p>
      </div>
      <div className="flex items-center gap-3 rounded-[24px] bg-surface p-3.5">
        <DateTile at={v.starts_at} />
        <div className="min-w-0">
          <p className="t-caption text-text-secondary">
            {weekdayShort(v.starts_at)} · {time(v.starts_at)} · {VIEWING_TYPE_LABEL[v.viewing_type]}
          </p>
          <p className="truncate t-card-title">{v.property.title}</p>
          <StatusBadge tone={s.tone} className="mt-1">
            {s.label}
          </StatusBadge>
        </div>
      </div>
      <DetailTable
        rows={[
          { label: 'Reference', value: v.reference },
          { label: v.viewing_type === 'video' ? 'Format' : 'Address', value: v.viewing_type === 'video' ? 'Video call — the agent calls your phone' : `${v.property.address_line}, ${v.property.city}` },
          { label: 'Agent', value: `${v.agent.full_name} · ${v.agent.phone}` },
          { label: 'Guests', value: v.guests === 1 ? '1 person' : `${v.guests} people` },
        ]}
      />
      <a href={`/viewings/${v.id}/ics`} download className="flex items-center gap-3 rounded-[20px] bg-surface px-4 py-3.5 t-item hover:bg-white/80">
        <CalendarPlus size={20} aria-hidden />
        <span className="flex-1">Add to calendar</span>
        <span className="t-caption text-text-muted">.ics</span>
      </a>
      <div className="flex flex-col gap-3">
        <ButtonLink href={`/viewings/${v.id}`} full>
          View appointment details
        </ButtonLink>
        <ButtonLink href={`/homes/${v.property.slug}`} variant="secondary" full>
          Back to property
        </ButtonLink>
      </div>
    </Screen>
  );
}
