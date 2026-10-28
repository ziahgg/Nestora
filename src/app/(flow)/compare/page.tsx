import { GitCompareArrows } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { RemoveFromCompare } from '@/components/list-actions';
import { firstImage, Photo } from '@/components/photo';
import { Screen } from '@/components/screen';
import { ShareButton } from '@/components/share-button';
import { ButtonLink, EmptyState, StatusBadge, TopBar, cx } from '@/components/ui';
import { calendarDate, laToday, money } from '@/lib/domain/format';
import { bestIndex, COMPARE_MAX, depositTerms, FURNISHING_LABEL, NOT_SPECIFIED, PETS_LABEL } from '@/lib/domain/listing';
import { requestTime } from '@/lib/request-time';
import { compareHomes } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Compare homes' };

/** Figma "Comparison" (three homes, after remove, empty). "Best" marks a single lowest rent / largest size. */
export default async function ComparePage() {
  const { userId } = await requireUser();
  const homes = await compareHomes(userId);
  const today = laToday(requestTime());
  const bestRent = bestIndex(homes.map((h) => Number(h.monthly_rent)), 'min');
  const bestSize = bestIndex(homes.map((h) => h.area_sqft), 'max');
  const Best = () => (
    <StatusBadge tone="success" className="ml-1">
      Best
    </StatusBadge>
  );
  const rows: { label: string; cell: (i: number) => React.ReactNode; muted?: (i: number) => boolean }[] = [
    { label: 'Monthly rent', cell: (i) => <>{money(homes[i]!.monthly_rent)}{bestRent === i ? <Best /> : null}</> },
    { label: 'Location', cell: (i) => homes[i]!.neighborhood.name },
    { label: 'Bedrooms', cell: (i) => (homes[i]!.bedrooms === 0 ? 'Studio' : homes[i]!.bedrooms) },
    { label: 'Bathrooms', cell: (i) => Number(homes[i]!.bathrooms) },
    { label: 'Size', cell: (i) => <>{homes[i]!.area_sqft ? `${homes[i]!.area_sqft!.toLocaleString('en-US')} sq ft` : NOT_SPECIFIED}{bestSize === i ? <Best /> : null}</>, muted: (i) => !homes[i]!.area_sqft },
    { label: 'Furnishing', cell: (i) => (homes[i]!.furnishing ? FURNISHING_LABEL[homes[i]!.furnishing!] : NOT_SPECIFIED), muted: (i) => !homes[i]!.furnishing },
    { label: 'Available', cell: (i) => (homes[i]!.status === 'leased' ? 'Leased' : !homes[i]!.available_from || homes[i]!.available_from! <= today ? 'Now' : calendarDate(homes[i]!.available_from!)) },
    { label: 'Deposit', cell: (i) => depositTerms(homes[i]!), muted: (i) => homes[i]!.security_deposit == null },
    { label: 'Pets', cell: (i) => (homes[i]!.pets ? PETS_LABEL[homes[i]!.pets!] : NOT_SPECIFIED), muted: (i) => !homes[i]!.pets },
    { label: 'Parking', cell: (i) => (homes[i]!.parking == null ? NOT_SPECIFIED : homes[i]!.parking === 0 ? 'None' : homes[i]!.parking), muted: (i) => homes[i]!.parking == null },
    { label: 'Lease', cell: (i) => (homes[i]!.lease_months ? `${homes[i]!.lease_months} months` : NOT_SPECIFIED), muted: (i) => !homes[i]!.lease_months },
  ];
  const cols = { gridTemplateColumns: `repeat(${homes.length}, minmax(112px, 1fr))` };

  return (
    <Screen tabs={false}>
      <TopBar title="Compare homes" back="/saved" right={homes.length ? <ShareButton text={`Comparing ${homes.map((h) => h.title).join(', ')} on Nestora`} path="/saved" label="Share comparison" /> : undefined} />
      {homes.length ? (
        <>
          <p className="t-caption text-text-muted">
            {homes.length} of {COMPARE_MAX} selected{homes.length > 2 ? ' · scroll sideways on small screens' : ''}
          </p>
          <div className="no-scrollbar -mx-5 overflow-x-auto px-5">
            <div className="min-w-max">
              <ul className="mb-3 grid gap-2.5" style={cols}>
                {homes.map((h) => (
                  <li key={h.id} className="relative">
                    <Link href={`/homes/${h.slug}`} className="block">
                      <Photo image={firstImage(h.images)} sizes="140px" className="aspect-[108/84] rounded-[18px]" />
                      <p className="mt-1.5 truncate t-caption-m">{h.title}</p>
                    </Link>
                    <RemoveFromCompare propertyId={h.id} title={h.title} />
                  </li>
                ))}
              </ul>
              <dl className="rounded-[28px] bg-surface px-4">
                {rows.map((r) => (
                  <div key={r.label} className="border-b border-border py-3 last:border-0">
                    <dt className="t-caption text-text-muted">{r.label}</dt>
                    <div className="mt-1 grid gap-2.5" style={cols}>
                      {homes.map((h, i) => (
                        <dd key={h.id} className={cx('flex flex-wrap items-center t-item', r.muted?.(i) && 'text-text-muted')}>
                          {r.cell(i)}
                        </dd>
                      ))}
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          {homes.length < COMPARE_MAX ? (
            <ButtonLink href="/saved" variant="secondary" full>
              Add from Saved
            </ButtonLink>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={GitCompareArrows}
          title="Nothing to compare"
          message={`Tick “Compare” on up to ${COMPARE_MAX} homes to see rent, size, deposit and pets side by side.`}
          action={<ButtonLink href="/saved" size="sm">Go to Saved</ButtonLink>}
        />
      )}
    </Screen>
  );
}
