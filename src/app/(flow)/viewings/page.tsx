import { CalendarDays } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { DateTile } from '@/components/date-tile';
import { Screen } from '@/components/screen';
import { ButtonLink, Chip, EmptyState, StatusBadge, TopBar } from '@/components/ui';
import { time, weekdayShort } from '@/lib/domain/format';
import { isUpcomingViewing, VIEWING_STATUS, VIEWING_TYPE_LABEL } from '@/lib/domain/listing';
import { requestTime } from '@/lib/request-time';
import { myViewings, type ViewingItem } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'My viewings' };

function Row({ v, past }: { v: ViewingItem; past: boolean }) {
  const s = v.status === 'cancelled' ? VIEWING_STATUS.cancelled : past ? { label: 'Past', tone: 'neutral' as const } : VIEWING_STATUS[v.status];
  return (
    <li>
      <Link href={`/viewings/${v.id}`} className="flex items-center gap-3 rounded-[24px] bg-surface p-3.5 hover:bg-white/80">
        <DateTile at={v.starts_at} muted={past} />
        <div className="min-w-0">
          <p className="t-caption text-text-secondary">
            {weekdayShort(v.starts_at)} · {time(v.starts_at)} · {VIEWING_TYPE_LABEL[v.viewing_type]}
          </p>
          <p className="truncate t-card-title">{v.property.title}</p>
          <StatusBadge tone={s.tone} className="mt-1">
            {s.label}
          </StatusBadge>
        </div>
      </Link>
    </li>
  );
}

/** Figma "My Viewings / Default". */
export default async function ViewingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { userId } = await requireUser();
  const tab = (await searchParams).tab === 'past' ? 'past' : 'upcoming';
  const now = requestTime();
  const all = await myViewings(userId);
  const upcoming = all.filter((v) => isUpcomingViewing(v, now));
  const past = all.filter((v) => !isUpcomingViewing(v, now)).reverse();
  return (
    <Screen tabs={false}>
      <TopBar title="My viewings" back="/profile" />
      <nav aria-label="Viewings" className="flex gap-2">
        <Chip selected={tab === 'upcoming'} href="/viewings">
          Upcoming · {upcoming.length}
        </Chip>
        <Chip selected={tab === 'past'} href="/viewings?tab=past">
          Past · {past.length}
        </Chip>
      </nav>
      {tab === 'upcoming' ? (
        upcoming.length ? (
          <ul className="flex flex-col gap-3">
            {upcoming.map((v) => (
              <Row key={v.id} v={v} past={false} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={CalendarDays} title="No upcoming viewings" message="Book an in-person or video viewing from any home’s page." action={<ButtonLink href="/homes" size="sm">Explore homes</ButtonLink>} />
        )
      ) : null}
      {(tab === 'past' || upcoming.length > 0) && past.length ? (
        <section aria-labelledby="past-h" className="flex flex-col gap-2">
          <h2 id="past-h" className="t-caption text-text-muted">
            Past
          </h2>
          <ul className="flex flex-col gap-3">
            {past.map((v) => (
              <Row key={v.id} v={v} past />
            ))}
          </ul>
        </section>
      ) : tab === 'past' ? (
        <EmptyState icon={CalendarDays} title="No past viewings" message="Viewings you’ve had or cancelled show up here." />
      ) : null}
    </Screen>
  );
}
