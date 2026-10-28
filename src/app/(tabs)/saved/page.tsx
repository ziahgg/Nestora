import { ChevronRight, GitCompareArrows, Heart, History } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { HomeRow } from '@/components/cards';
import { UnsaveButton } from '@/components/list-actions';
import { Screen } from '@/components/screen';
import { ButtonLink, Chip, EmptyState, PageTitle } from '@/components/ui';
import { pluralize } from '@/lib/domain/format';
import { TYPE_PLURAL } from '@/lib/domain/listing';
import { PROPERTY_TYPES } from '@/lib/domain/search';
import { requestTime } from '@/lib/request-time';
import { myLists, profileStats, savedHomes } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Saved homes' };

/** Figma "Saved Properties" (default, remove confirm, updated, empty). */
export default async function SavedPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { userId } = await requireUser();
  const sp = await searchParams;
  const [homes, lists, stats] = await Promise.all([savedHomes(userId), myLists(), profileStats(userId, requestTime())]);
  const type = PROPERTY_TYPES.find((t) => t === sp.type) ?? null;
  const shown = type ? homes.filter((h) => h.property_type === type) : homes;
  const typeCounts = PROPERTY_TYPES.map((t) => ({ t, n: homes.filter((h) => h.property_type === t).length })).filter((x) => x.n > 0);

  return (
    <Screen>
      <PageTitle title="Saved homes" subtitle={`${pluralize(homes.length, 'home')} · ${lists.compare.size} in compare`}>
        <ButtonLink href="/compare" variant="secondary" size="sm" icon={GitCompareArrows} className="h-11">
          Compare
        </ButtonLink>
      </PageTitle>
      {homes.length ? (
        <>
          <nav aria-label="Filter saved homes" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            <Chip selected={!type} href="/saved">
              All · {homes.length}
            </Chip>
            {typeCounts.map(({ t, n }) => (
              <Chip key={t} selected={type === t} href={`/saved?type=${t}`}>
                {TYPE_PLURAL[t]} · {n}
              </Chip>
            ))}
          </nav>
          <ul className="flex flex-col gap-3">
            {shown.map((h) => (
              <li key={h.id}>
                <HomeRow home={h} signedIn trailing={<UnsaveButton propertyId={h.id} title={h.title} />} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState icon={Heart} title="No saved homes yet" message="Tap the heart on any home to keep it here and compare it later." action={<ButtonLink href="/homes" size="sm">Explore homes</ButtonLink>} />
      )}
      <Link href="/recently-viewed" className="flex items-center gap-3 rounded-[24px] bg-surface px-4 py-3.5 hover:bg-white/80">
        <History size={22} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block t-card-title">Recently viewed</span>
          <span className="block t-caption text-text-muted">{pluralize(stats.recentlyViewed, 'home')} in the last 7 days</span>
        </span>
        <ChevronRight size={18} className="text-text-muted" aria-hidden />
      </Link>
    </Screen>
  );
}
