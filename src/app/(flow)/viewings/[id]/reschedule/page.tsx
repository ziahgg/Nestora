import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { DateTile } from '@/components/date-tile';
import { Screen } from '@/components/screen';
import { SlotPicker } from '@/components/slot-picker';
import { TopBar } from '@/components/ui';
import { firstName, time, weekdayShort } from '@/lib/domain/format';
import { canChangeViewing, VIEWING_TYPE_LABEL } from '@/lib/domain/listing';
import { requestTime } from '@/lib/request-time';
import { getViewing, viewingSlots } from '@/lib/services/data';
import { slotWeek } from '@/lib/slot-window';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Reschedule viewing' };

/** Figma "Appointment / Reschedule". */
export default async function ReschedulePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { userId } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const v = await getViewing(id);
  if (!v || v.user_id !== userId) notFound();
  const now = requestTime();
  if (!canChangeViewing(v, now)) redirect(`/viewings/${v.id}`);
  const week = slotWeek(sp.from, now, `/viewings/${v.id}/reschedule`);
  const slots = await viewingSlots(v.property_id, week.from, 7);
  return (
    <Screen bottomBar>
      <TopBar title="Reschedule" close={`/viewings/${v.id}`} />
      <div className="flex items-center gap-3 rounded-[24px] bg-surface p-3.5">
        <DateTile at={v.starts_at} muted />
        <div className="min-w-0">
          <p className="t-caption text-text-secondary">
            Currently {weekdayShort(v.starts_at)} · {time(v.starts_at)} · {VIEWING_TYPE_LABEL[v.viewing_type]}
          </p>
          <p className="truncate t-card-title">{v.property.title}</p>
        </div>
      </div>
      <SlotPicker key={week.from} mode="reschedule" viewingId={v.id} currentStartsAt={v.starts_at} slots={slots} weekFrom={week.from} prevHref={week.prevHref} nextHref={week.nextHref} agentFirstName={firstName(v.agent.full_name)} />
    </Screen>
  );
}
