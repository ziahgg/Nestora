import type { Metadata } from 'next';

import { Screen } from '@/components/screen';
import { SearchPanel } from '@/components/search-panel';
import { TopBar } from '@/components/ui';
import { laToday } from '@/lib/domain/format';
import { requestTime } from '@/lib/request-time';
import { neighborhoods, recentSearches, viewer } from '@/lib/services/data';

export const metadata: Metadata = { title: 'Search' };

export default async function SearchPage() {
  const { userId } = await viewer();
  const [hoods, recent] = await Promise.all([neighborhoods(), recentSearches()]);
  return (
    <Screen tabs={false}>
      <TopBar title="Search" back="/" />
      <SearchPanel
        hoods={hoods.map(({ slug, name, city, count }) => ({ slug, name, city, count }))}
        recent={recent.map(({ id, label, detail, params }) => ({ id, label, detail, params }))}
        today={laToday(requestTime())}
        signedIn={!!userId}
      />
    </Screen>
  );
}
