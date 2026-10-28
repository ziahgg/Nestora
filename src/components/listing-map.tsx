'use client';

import { House } from 'lucide-react';
import { useState } from 'react';

import { shortMoney } from '@/lib/domain/format';
import type { HomeCard } from '@/lib/services/data';
import { HomeRow } from './cards';
import { cx } from './ui';

/**
 * Figma "Search Results / Map": an illustrative street map (not a real map SDK) with a price pin per home,
 * positioned from each listing's stored map point. Selecting a pin shows its card.
 */
export function ListingMap({ homes, signedIn, children }: { homes: HomeCard[]; signedIn: boolean; children: React.ReactNode }) {
  const [selected, setSelected] = useState(homes[0]?.id ?? null);
  const home = homes.find((h) => h.id === selected) ?? null;
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-map">
      <svg className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
        <rect x="8" y="30" width="20" height="18" rx="2" fill="var(--map-park)" />
        <path d="M70 70 Q90 64 100 74 L100 100 L62 100 Z" fill="var(--map-water)" />
        {[14, 30, 52, 72].map((y) => (
          <rect key={`h${y}`} x="0" y={y} width="100" height="1.6" fill="var(--map-road)" />
        ))}
        {[10, 36, 64, 88].map((x) => (
          <rect key={`v${x}`} x={x} y="0" width="2.4" height="100" fill="var(--map-road)" />
        ))}
        <path d="M0 66 L100 40" stroke="var(--map-road)" strokeWidth="2" />
      </svg>
      <div className="pointer-events-none absolute inset-0 t-caption text-text-muted uppercase">
        <span className="absolute top-[24%] left-[40%]">Silver Lake</span>
        <span className="absolute top-[40%] left-[12%] normal-case">Elysian Park</span>
        <span className="absolute top-[55%] left-[48%] normal-case">Sunset Blvd</span>
        <span className="absolute top-[63%] left-[6%]">Echo Park</span>
      </div>
      <p className="absolute right-5 bottom-[calc(240px+env(safe-area-inset-bottom))] rounded-full bg-surface/90 px-3 py-1 t-caption text-text-secondary">Illustrative map · approximate areas</p>

      <div className="relative z-10 mx-auto max-w-[640px] px-5 pt-[max(16px,env(safe-area-inset-top))]">{children}</div>

      {homes.map((h) => (
        <button
          key={h.id}
          type="button"
          onClick={() => setSelected(h.id)}
          aria-pressed={selected === h.id}
          aria-label={`${h.title}, ${shortMoney(h.monthly_rent)} a month`}
          style={{ left: `${8 + Number(h.map_x) * 0.84}%`, top: `${26 + Number(h.map_y) * 0.42}%` }}
          className={cx('absolute z-[5] inline-flex h-8 -translate-x-1/2 items-center gap-1 rounded-full px-3 t-label shadow-sm', selected === h.id ? 'bg-ink text-on-ink' : 'bg-surface text-text')}
        >
          {selected === h.id ? <House size={14} className="text-amber" aria-hidden /> : null}
          {shortMoney(h.monthly_rent)}
        </button>
      ))}

      {home ? (
        <div className="absolute inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-10 mx-auto max-w-[640px] px-5">
          <HomeRow home={home} signedIn={signedIn} />
        </div>
      ) : null}
    </div>
  );
}
