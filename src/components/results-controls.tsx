'use client';

import { ArrowDownUp, ArrowLeft, ChevronDown, List, Map as MapIcon, Search, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { rememberSearch } from '@/app/actions/lists';
import { activeFilterCount, filtersToParams, SORTS, type Filters } from '@/lib/domain/search';
import { TYPE_LABEL } from '@/lib/domain/listing';
import { FiltersSheet } from './filters-sheet';
import { Chip, cx } from './ui';

/** Search box, filter sheet, list/map switch and quick-filter chips above the results. */
export function ResultsControls({ filters, view, total, openFilters, neighborhoodName, signedIn }: { filters: Filters; view: 'list' | 'map'; total: number; openFilters: boolean; neighborhoodName: string | null; signedIn: boolean }) {
  const [open, setOpen] = useState(openFilters);
  const [q, setQ] = useState(filters.q);
  const router = useRouter();
  const qs = filtersToParams(filters);
  const go = (f: Filters, v: 'list' | 'map' = view) => {
    const s = filtersToParams(f, { view: v === 'map' ? 'map' : undefined });
    router.push(s ? `/homes?${s}` : '/homes');
  };

  // Signed-in renters get this search in "Recent searches" (stored once per distinct filter set).
  useEffect(() => {
    if (signedIn && qs) void rememberSearch(qs, neighborhoodName);
  }, [signedIn, qs, neighborhoodName]);

  const n = activeFilterCount(filters);
  const quick: { label: string; on: boolean; toggle: () => void }[] = [
    { label: 'House', on: filters.types.includes('house'), toggle: () => go({ ...filters, page: 1, types: filters.types.includes('house') ? filters.types.filter((t) => t !== 'house') : [...filters.types, 'house'] }) },
    { label: 'Apartment', on: filters.types.includes('apartment'), toggle: () => go({ ...filters, page: 1, types: filters.types.includes('apartment') ? filters.types.filter((t) => t !== 'apartment') : [...filters.types, 'apartment'] }) },
    { label: 'Pet-friendly', on: filters.pets, toggle: () => go({ ...filters, page: 1, pets: !filters.pets }) },
    { label: 'Furnished', on: filters.furnished, toggle: () => go({ ...filters, page: 1, furnished: !filters.furnished }) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className={cx('flex items-center gap-2.5', view === 'map' && 'relative z-10')}>
        {view === 'list' ? (
          <Link href="/" aria-label="Back to Discover" className="grid size-14 shrink-0 place-items-center rounded-full bg-surface">
            <ArrowLeft size={20} aria-hidden />
          </Link>
        ) : null}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            go({ ...filters, q: q.trim(), page: 1 });
          }}
          className="flex h-14 min-w-0 flex-1 items-center rounded-full border-[1.5px] border-ink bg-surface pr-1.5 pl-4"
        >
          <Search size={20} className="shrink-0" aria-hidden />
          <label htmlFor="results-q" className="sr-only">
            Search homes
          </label>
          <input id="results-q" value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} placeholder={neighborhoodName ?? 'Los Angeles'} enterKeyHint="search" className="min-w-0 flex-1 bg-transparent pl-2.5 t-item outline-none placeholder:text-text" />
          {q ? (
            <button type="button" aria-label="Clear search" onClick={() => go({ ...filters, q: '', page: 1 })} className="grid size-9 shrink-0 place-items-center text-text-muted">
              <X size={18} aria-hidden />
            </button>
          ) : null}
          <button type="button" onClick={() => setOpen(true)} aria-label={n ? `Filters, ${n} active` : 'Filters'} className="relative grid size-11 shrink-0 place-items-center rounded-full bg-ink text-on-ink">
            <SlidersHorizontal size={20} aria-hidden />
            {n ? <span className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-amber t-caption-m text-ink">{n}</span> : null}
          </button>
        </form>
      </div>

      <div className={cx('flex items-center justify-between gap-3', view === 'map' && 'relative z-10')}>
        <p className={cx('t-item', view === 'map' && 'rounded-full bg-surface px-3 py-1.5')} aria-live="polite">
          {total === 1 ? '1 home for rent' : `${total} homes for rent`}
        </p>
        <div className="flex rounded-full bg-surface p-1" role="group" aria-label="View">
          {(['list', 'map'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => go(filters, v)} className={cx('inline-flex h-8 items-center gap-1.5 rounded-full px-3 t-label', view === v ? 'bg-ink text-on-ink' : 'text-text')}>
              {v === 'list' ? <List size={16} aria-hidden /> : <MapIcon size={16} aria-hidden />}
              {v === 'list' ? 'List' : 'Map'}
            </button>
          ))}
        </div>
      </div>

      {view === 'list' ? (
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          <Chip selected={false} onClick={() => setOpen(true)}>
            <ArrowDownUp size={16} aria-hidden />
            {SORTS[filters.sort]}
            <ChevronDown size={16} aria-hidden />
          </Chip>
          {filters.neighborhood ? (
            <Chip selected onClick={() => go({ ...filters, neighborhood: null, page: 1 })}>
              {neighborhoodName ?? filters.neighborhood}
              <X size={14} aria-label="Remove neighborhood filter" />
            </Chip>
          ) : null}
          {quick.map((c) => (
            <Chip key={c.label} selected={c.on} onClick={c.toggle}>
              {c.label}
            </Chip>
          ))}
          {filters.types
            .filter((t) => t !== 'house' && t !== 'apartment')
            .map((t) => (
              <Chip key={t} selected onClick={() => go({ ...filters, types: filters.types.filter((x) => x !== t), page: 1 })}>
                {TYPE_LABEL[t]}
                <X size={14} aria-hidden />
              </Chip>
            ))}
        </div>
      ) : null}

      {/* Mounted only while open, so it always starts from the current URL filters. */}
      {open ? <FiltersSheet open onClose={() => setOpen(false)} initial={filters} view={view} /> : null}
    </div>
  );
}
