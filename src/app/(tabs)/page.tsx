import { Bell, MapPin } from 'lucide-react';

import { FeaturedCard, furnishingChip, HomeRow, NeighborhoodTile } from '@/components/cards';
import { MenuDrawer } from '@/components/menu-drawer';
import { Screen } from '@/components/screen';
import { SearchBarLink } from '@/components/search-bar';
import { Chip, EmptyState, IconButton, SectionHeader } from '@/components/ui';
import { firstName, laToday } from '@/lib/domain/format';
import { requestTime } from '@/lib/request-time';
import { featuredHomes, getProfile, myAgent, neighborhoods, recentlyAdded, unreadCount, viewer } from '@/lib/services/data';

const TYPES = [
  { value: null, label: 'All' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'studio', label: 'Studio' },
] as const;

/** Figma "Discover / Default". */
export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const sp = await searchParams;
  const type = TYPES.find((t) => t.value === sp.type)?.value ?? null;
  const { userId } = await viewer();
  const today = laToday(requestTime());
  const [profile, unread, featured, recent, hoods, agent] = await Promise.all([
    userId ? getProfile(userId) : null,
    unreadCount(userId),
    featuredHomes(type),
    recentlyAdded(type),
    neighborhoods(),
    myAgent(),
  ]);
  const name = profile?.full_name ? firstName(profile.full_name) : null;

  return (
    <Screen wide>
      <header className="flex items-center justify-between">
        <MenuDrawer signedIn={!!userId} isAgent={!!agent} />
        <p className="inline-flex items-center gap-1.5 t-body-m">
          <MapPin size={16} className="text-amber" aria-hidden />
          Los Angeles, CA
        </p>
        <IconButton icon={Bell} label={unread ? `Notifications, ${unread} unread` : 'Notifications'} href={userId ? '/notifications' : '/login?next=/notifications'} badge={unread > 0} />
      </header>

      <div>
        <p className="t-greeting text-text-muted">{name ? `Hey ${name},` : 'Hey there,'}</p>
        <h1 className="t-display">Find your next home</h1>
      </div>

      <SearchBarLink />

      <nav aria-label="Property type" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {TYPES.map((t) => (
          <Chip key={t.label} selected={type === t.value} href={t.value ? `/?type=${t.value}` : '/'}>
            {t.label}
          </Chip>
        ))}
      </nav>

      <section aria-labelledby="featured" className="flex flex-col gap-3">
        <SectionHeader id="featured" title="Featured this week" href={type ? `/homes?type=${type}` : '/homes'} />
        {featured.length ? (
          <div className="no-scrollbar -mx-5 flex snap-x scroll-px-5 gap-4 overflow-x-auto px-5 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
            {featured.map((h, i) => (
              <div key={h.id} className="w-[calc(100vw-40px)] max-w-[480px] shrink-0 snap-start lg:w-auto lg:max-w-none">
                <FeaturedCard home={h} today={today} signedIn={!!userId} furnishing={furnishingChip(h.furnishing)} priority={i === 0} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={MapPin} title="Nothing featured" message="No featured homes of this type right now. Explore every listing instead." />
        )}
      </section>

      {hoods.length ? (
        <section aria-labelledby="hoods" className="flex flex-col gap-3">
          <SectionHeader id="hoods" title="Popular neighborhoods" />
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
            {hoods.map((n) => (
              <NeighborhoodTile key={n.slug} n={n} />
            ))}
          </div>
        </section>
      ) : null}

      {recent.length ? (
        <section aria-labelledby="recent" className="flex flex-col gap-3">
          <SectionHeader id="recent" title="Recently added" href="/homes?sort=newest" />
          <div className="grid gap-3 lg:grid-cols-2">
            {recent.map((h) => (
              <HomeRow key={h.id} home={h} signedIn={!!userId} />
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-center t-caption text-text-muted">All listings, agents and prices are illustrative sample data.</p>
    </Screen>
  );
}
