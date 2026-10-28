import { SearchX } from 'lucide-react';
import type { Metadata } from 'next';

import { HomeRow } from '@/components/cards';
import { ListingMap } from '@/components/listing-map';
import { ResultsControls } from '@/components/results-controls';
import { Screen } from '@/components/screen';
import { ButtonLink, EmptyState } from '@/components/ui';
import { filtersToParams, parseFilters } from '@/lib/domain/search';
import { neighborhoods, searchHomes, viewer } from '@/lib/services/data';

export const metadata: Metadata = { title: 'Homes for rent' };

/** Figma "Search Results" (list and map). Filters come from the URL and run as one database query. */
export default async function HomesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const view = sp.view === 'map' ? 'map' : 'list';
  const { userId } = await viewer();
  const [{ items, total, pages }, hoods] = await Promise.all([searchHomes(filters), neighborhoods()]);
  const neighborhoodName = filters.neighborhood ? (hoods.find((h) => h.slug === filters.neighborhood)?.name ?? null) : null;
  const controls = <ResultsControls key={filtersToParams(filters)} filters={filters} view={view} total={total} openFilters={sp.filters === '1'} neighborhoodName={neighborhoodName} signedIn={!!userId} />;
  const pageHref = (p: number) => {
    const qs = filtersToParams({ ...filters, page: p }, { page: true });
    return qs ? `/homes?${qs}` : '/homes';
  };

  if (view === 'map')
    return (
      <ListingMap homes={items} signedIn={!!userId}>
        {controls}
      </ListingMap>
    );

  return (
    <Screen wide>
      {controls}
      {items.length ? (
        <>
          <ul className="grid gap-3 lg:grid-cols-2">
            {items.map((h) => (
              <li key={h.id}>
                <HomeRow home={h} signedIn={!!userId} />
              </li>
            ))}
          </ul>
          {pages > 1 ? (
            <nav aria-label="Pages" className="flex items-center justify-center gap-3">
              {filters.page > 1 ? (
                <ButtonLink href={pageHref(filters.page - 1)} variant="secondary" size="sm">
                  Previous
                </ButtonLink>
              ) : null}
              <span className="t-label text-text-secondary">
                Page {filters.page} of {pages}
              </span>
              {filters.page < pages ? (
                <ButtonLink href={pageHref(filters.page + 1)} variant="secondary" size="sm">
                  Next
                </ButtonLink>
              ) : null}
            </nav>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No homes match"
          message={filters.q ? `Nothing for “${filters.q}” with these filters. Try a nearby neighborhood or fewer filters.` : 'Try widening the rent range or removing a filter.'}
          action={
            <ButtonLink href="/homes" variant="secondary" size="sm">
              Reset search
            </ButtonLink>
          }
        />
      )}
    </Screen>
  );
}
