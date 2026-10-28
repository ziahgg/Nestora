import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { PropertyMini } from '@/components/cards';
import { Screen } from '@/components/screen';
import { SlotPicker } from '@/components/slot-picker';
import { TopBar } from '@/components/ui';
import { firstName, money } from '@/lib/domain/format';
import { isContactable } from '@/lib/domain/listing';
import { requestTime } from '@/lib/request-time';
import { getProfile, getProperty, myActivityFor, viewingSlots } from '@/lib/services/data';
import { slotWeek } from '@/lib/slot-window';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Schedule viewing' };

/** Figma "Schedule Viewing / Default". */
export default async function SchedulePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const { userId } = await requireUser();
  const p = await getProperty(slug);
  if (!p) notFound();
  if (!isContactable(p.status)) redirect(`/homes/${p.slug}`);
  const activity = await myActivityFor(p.id);
  if (activity.viewingId) redirect(`/viewings/${activity.viewingId}`);
  const week = slotWeek(sp.from, requestTime(), `/homes/${p.slug}/schedule`);
  const [profile, slots] = await Promise.all([getProfile(userId), viewingSlots(p.id, week.from, 7)]);
  const cover = p.images[0] ? { key: p.images[0].image_key, alt: p.images[0].alt } : null;
  return (
    <Screen bottomBar>
      <TopBar title="Schedule viewing" close={`/homes/${p.slug}`} />
      <PropertyMini title={p.title} city={`${p.neighborhood.name}, ${p.neighborhood.city}`} line={`${money(p.monthly_rent)} / month · with ${p.agent.full_name}`} image={cover} href={`/homes/${p.slug}`} />
      <SlotPicker key={week.from} mode="book" propertyId={p.id} slots={slots} weekFrom={week.from} prevHref={week.prevHref} nextHref={week.nextHref} agentFirstName={firstName(p.agent.full_name)} defaultPhone={profile?.phone ?? ''} />
    </Screen>
  );
}
