'use client';

import { ArrowUpRight, History, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { clearRecentSearches } from '@/app/actions/lists';
import { useToast } from './toast';
import { Chip } from './ui';

type Hood = { slug: string; name: string; city: string; count: number };
type Recent = { id: string; label: string; detail: string; params: string };

const POPULAR = [
  { label: 'Pet-friendly', href: '/homes?pets=1' },
  { label: 'Furnished', href: '/homes?furnished=1' },
  { label: 'Studios under $2,500', href: '/homes?type=studio&max=2500' },
  { label: 'With parking', href: '/homes?parking=1' },
  { label: 'Move in now', href: 'NOW' },
];

/** Figma "Search / Default": keyword box, recent searches, suggested locations, popular searches. */
export function SearchPanel({ hoods, recent, today, signedIn }: { hoods: Hood[]; recent: Recent[]; today: string; signedIn: boolean }) {
  const [q, setQ] = useState('');
  const [recents, setRecents] = useState(recent);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const term = q.trim().toLowerCase();
  const suggestions = (term ? hoods.filter((h) => h.name.toLowerCase().includes(term) || h.city.toLowerCase().includes(term)) : hoods).slice(0, 3);

  return (
    <>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(q.trim() ? `/homes?q=${encodeURIComponent(q.trim())}` : '/homes');
        }}
        className="flex h-14 items-center rounded-full border-[1.5px] border-ink bg-surface pr-1.5 pl-5"
      >
        <Search size={20} className="shrink-0" aria-hidden />
        <label htmlFor="q" className="sr-only">
          Search neighborhood, address or ZIP
        </label>
        <input
          id="q"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          maxLength={60}
          placeholder="Neighborhood, address or ZIP"
          className="min-w-0 flex-1 bg-transparent pl-3 t-item outline-none placeholder:text-text-muted"
          enterKeyHint="search"
        />
        {q ? (
          <button type="button" aria-label="Clear search" onClick={() => setQ('')} className="grid size-9 place-items-center text-text-muted">
            <X size={18} aria-hidden />
          </button>
        ) : null}
        <Link href={q.trim() ? `/homes?q=${encodeURIComponent(q.trim())}&filters=1` : '/homes?filters=1'} aria-label="Filters" className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-on-ink">
          <SlidersHorizontal size={20} aria-hidden />
        </Link>
      </form>

      {signedIn && recents.length ? (
        <section aria-labelledby="recent-h" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="recent-h" className="t-section">
              Recent searches
            </h2>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await clearRecentSearches();
                  if (r.ok) setRecents([]);
                  else toast({ kind: 'error', title: 'Couldn’t clear searches', message: r.error });
                })
              }
              className="t-body text-text-secondary hover:text-text"
            >
              Clear
            </button>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-[24px] bg-surface">
            {recents.map((r) => (
              <li key={r.id}>
                <Link href={`/homes?${r.params}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/60">
                  <History size={20} className="shrink-0 text-text-secondary" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate t-item">{r.label}</span>
                    <span className="block truncate t-caption text-text-muted">{r.detail}</span>
                  </span>
                  <ArrowUpRight size={18} className="shrink-0 text-text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="loc-h" className="flex flex-col gap-3">
        <h2 id="loc-h" className="t-section">
          Suggested locations
        </h2>
        {suggestions.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-[24px] bg-surface">
            {suggestions.map((h) => (
              <li key={h.slug}>
                <Link href={`/homes?n=${h.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/60">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-soft text-amber">
                    <MapPin size={18} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block t-item">
                      {h.name}, {h.city}
                    </span>
                    <span className="block t-caption text-text-muted">{h.count === 1 ? '1 home for rent' : `${h.count} homes for rent`}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[24px] bg-surface p-4 t-body text-text-secondary">No neighborhoods match “{q.trim()}”. Press search to look for it in addresses and ZIP codes.</p>
        )}
      </section>

      <section aria-labelledby="pop-h" className="flex flex-col gap-3">
        <h2 id="pop-h" className="t-section">
          Popular searches
        </h2>
        <div className="flex flex-wrap gap-2">
          {POPULAR.map((p) => (
            <Chip key={p.label} selected={false} href={p.href === 'NOW' ? `/homes?available=${today}` : p.href}>
              {p.label}
            </Chip>
          ))}
        </div>
      </section>
    </>
  );
}
