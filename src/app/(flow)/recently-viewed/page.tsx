import { History } from 'lucide-react';
import type { Metadata } from 'next';

import { HomeRow } from '@/components/cards';
import { ClearHistoryButton } from '@/components/list-actions';
import { Screen } from '@/components/screen';
import { ButtonLink, EmptyState, TopBar } from '@/components/ui';
import { dayGroup } from '@/lib/domain/format';
import { requestTime } from '@/lib/request-time';
import { recentlyViewed } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Recently viewed' };

/** Figma "Recently Viewed" (default, clear confirm, empty) — the last 7 days. */
export default async function RecentlyViewedPage() {
  const { userId } = await requireUser();
  const now = requestTime();
  const homes = await recentlyViewed(userId, now);
  const groups = (['Today', 'Yesterday', 'Earlier'] as const).map((g) => ({ g, items: homes.filter((h) => dayGroup(h.viewed_at, now) === g) })).filter((x) => x.items.length);
  return (
    <Screen tabs={false}>
      <TopBar title="Recently viewed" back="/saved" />
      {homes.length ? (
        <>
          <div className="flex items-center justify-between">
            <p className="t-body text-text-secondary">Last 7 days</p>
            <ClearHistoryButton />
          </div>
          {groups.map(({ g, items }) => (
            <section key={g} aria-label={g} className="flex flex-col gap-3">
              <h2 className="t-caption text-text-muted">{g}</h2>
              {items.map((h) => (
                <HomeRow key={h.id} home={h} signedIn />
              ))}
            </section>
          ))}
        </>
      ) : (
        <EmptyState icon={History} title="Nothing viewed lately" message="Homes you open will show up here for 7 days." action={<ButtonLink href="/homes" size="sm">Explore homes</ButtonLink>} />
      )}
    </Screen>
  );
}
