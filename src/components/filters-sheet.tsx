'use client';

import { Armchair, CalendarDays, Car, PawPrint } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, useTransition } from 'react';

import { countHomes } from '@/app/actions/search';
import { BEDS, EMPTY_FILTERS, filtersToParams, PROPERTY_TYPES, SORTS, type Filters, type Sort } from '@/lib/domain/search';
import { TYPE_LABEL } from '@/lib/domain/listing';
import { Sheet, Toggle } from './overlays';
import { Button, Chip } from './ui';

const BED_LABEL: Record<(typeof BEDS)[number], string> = { any: 'Any', '0': 'Studio', '1': '1', '2': '2', '3': '3+' };

/** Figma "Filters & sort" sheet. Changes are applied together with "Show N homes" (a live count). */
export function FiltersSheet({ open, onClose, initial, view }: { open: boolean; onClose: () => void; initial: Filters; view: 'list' | 'map' }) {
  const [f, setF] = useState<Filters>(initial);
  const [count, setCount] = useState<number | null>(null);
  const [, start] = useTransition();
  const router = useRouter();
  const id = useId();

  const qs = filtersToParams(f);
  useEffect(() => {
    if (!open) return;
    let live = true;
    start(async () => {
      const n = await countHomes(qs);
      if (live) setCount(n);
    });
    return () => {
      live = false;
    };
  }, [qs, open]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((p) => ({ ...p, [k]: v }));
  const rent = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.min(100_000, Math.round(Number(v.replace(/[^0-9]/g, '')) || 0))));
  const apply = () => {
    const s = filtersToParams(f, { view: view === 'map' ? 'map' : undefined });
    router.push(s ? `/homes?${s}` : '/homes');
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filters & sort"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setF({ ...EMPTY_FILTERS, q: f.q })} className="px-6">
            Reset all
          </Button>
          <Button full onClick={apply} disabled={count === 0}>
            {count == null ? 'Show homes' : count === 0 ? 'No homes match' : `Show ${count} ${count === 1 ? 'home' : 'homes'}`}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 t-item">Sort by</legend>
          <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6">
            {(Object.keys(SORTS) as Sort[]).map((s) => (
              <Chip key={s} selected={f.sort === s} onClick={() => set('sort', s)} className="border border-border">
                {SORTS[s]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2.5 t-item">Property type</legend>
          <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6">
            {PROPERTY_TYPES.map((t) => (
              <Chip key={t} selected={f.types.includes(t)} onClick={() => set('types', f.types.includes(t) ? f.types.filter((x) => x !== t) : [...f.types, t])} className="border border-border">
                {TYPE_LABEL[t]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <div className="mb-2.5 flex items-baseline justify-between">
            <legend className="t-item">Monthly rent</legend>
            <span className="t-caption text-text-muted">USD / month</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <label htmlFor={`${id}-min`} className="flex flex-col rounded-[16px] bg-surface-muted px-3 py-2">
              <span className="t-caption text-text-muted">Min</span>
              <input id={`${id}-min`} inputMode="numeric" placeholder="No min" value={f.min ?? ''} onChange={(e) => set('min', rent(e.target.value))} className="bg-transparent t-item outline-none placeholder:text-text" />
            </label>
            <label htmlFor={`${id}-max`} className="flex flex-col rounded-[16px] bg-surface-muted px-3 py-2">
              <span className="t-caption text-text-muted">Max</span>
              <input id={`${id}-max`} inputMode="numeric" placeholder="No max" value={f.max ?? ''} onChange={(e) => set('max', rent(e.target.value))} className="bg-transparent t-item outline-none placeholder:text-text" />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2.5 t-item">Bedrooms</legend>
          <div className="flex flex-wrap gap-2">
            {BEDS.map((b) => (
              <Chip key={b} selected={f.beds === b} onClick={() => set('beds', b)} className="min-w-12 justify-center border border-border">
                {BED_LABEL[b]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <div className="divide-y divide-border rounded-[24px] bg-surface-muted px-4">
          {(
            [
              ['furnished', 'Furnished only', Armchair],
              ['pets', 'Pet-friendly', PawPrint],
              ['parking', 'Parking included', Car],
            ] as const
          ).map(([k, label, Icon]) => (
            <div key={k} className="flex min-h-[58px] items-center gap-3">
              <Icon size={20} aria-hidden />
              <span className="flex-1 t-item">{label}</span>
              <Toggle checked={f[k]} onChange={(v) => set(k, v)} label={label} />
            </div>
          ))}
          <label htmlFor={`${id}-avail`} className="flex min-h-[58px] items-center gap-3">
            <CalendarDays size={20} aria-hidden />
            <span className="flex-1 t-item">Available by</span>
            <input id={`${id}-avail`} type="date" value={f.availableBy ?? ''} onChange={(e) => set('availableBy', e.target.value || null)} className="bg-transparent text-right t-body text-text-secondary outline-none" />
          </label>
        </div>
      </div>
    </Sheet>
  );
}
