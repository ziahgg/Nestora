/**
 * Search filters live in the results URL (/homes?q=…&type=…), so results are shareable and survive reloads.
 * Parsing is forgiving: unknown or invalid values are dropped rather than failing the page.
 */
import { z } from 'zod';

import type { PropertyType } from '@/types/database';
import { money } from './format';
import { TYPE_LABEL, TYPE_PLURAL } from './listing';

export const PROPERTY_TYPES = ['apartment', 'house', 'studio', 'townhouse'] as const satisfies readonly PropertyType[];
export const SORTS = { recommended: 'Recommended', newest: 'Newest', price_asc: 'Price: low to high', price_desc: 'Price: high to low' } as const;
export type Sort = keyof typeof SORTS;
export const BEDS = ['any', '0', '1', '2', '3'] as const; // '0' = studio, '3' = 3+
export type Beds = (typeof BEDS)[number];
export const PAGE_SIZE = 12;

export interface Filters {
  q: string;
  types: PropertyType[];
  min: number | null;
  max: number | null;
  beds: Beds;
  furnished: boolean;
  pets: boolean;
  parking: boolean;
  availableBy: string | null; // YYYY-MM-DD
  neighborhood: string | null; // slug
  sort: Sort;
  page: number;
}

export const EMPTY_FILTERS: Filters = { q: '', types: [], min: null, max: null, beds: 'any', furnished: false, pets: false, parking: false, availableBy: null, neighborhood: null, sort: 'recommended', page: 1 };

const rent = z.coerce.number().int().min(0).max(100_000);
const flag = (v: string | undefined) => v === '1' || v === 'true';

type Params = Record<string, string | string[] | undefined> | URLSearchParams;
const read = (p: Params, k: string): string | undefined => {
  if (p instanceof URLSearchParams) return p.get(k) ?? undefined;
  const v = p[k];
  return Array.isArray(v) ? v[0] : v;
};

export function parseFilters(p: Params): Filters {
  const q = (read(p, 'q') ?? '').trim().slice(0, 60);
  const types = (read(p, 'type') ?? '')
    .split(',')
    .filter((t): t is PropertyType => (PROPERTY_TYPES as readonly string[]).includes(t));
  let min = rent.safeParse(read(p, 'min')).data ?? null;
  let max = rent.safeParse(read(p, 'max')).data ?? null;
  if (read(p, 'min') === undefined || read(p, 'min') === '') min = null;
  if (read(p, 'max') === undefined || read(p, 'max') === '') max = null;
  if (min != null && max != null && min > max) [min, max] = [max, min];
  const bedsRaw = read(p, 'beds');
  const beds = (BEDS as readonly string[]).includes(bedsRaw ?? '') ? (bedsRaw as Beds) : 'any';
  const avail = read(p, 'available');
  const availableBy = avail && /^\d{4}-\d{2}-\d{2}$/.test(avail) && !Number.isNaN(Date.parse(avail)) ? avail : null;
  const n = read(p, 'n');
  const sortRaw = read(p, 'sort');
  const page = Math.min(50, Math.max(1, Number.parseInt(read(p, 'page') ?? '1', 10) || 1));
  return {
    q,
    types: [...new Set(types)],
    min,
    max,
    beds,
    furnished: flag(read(p, 'furnished')),
    pets: flag(read(p, 'pets')),
    parking: flag(read(p, 'parking')),
    availableBy,
    neighborhood: n && /^[a-z0-9-]{1,40}$/.test(n) ? n : null,
    sort: sortRaw && sortRaw in SORTS ? (sortRaw as Sort) : 'recommended',
    page,
  };
}

/** Canonical query string (stable key order, defaults omitted). `page` is dropped unless asked for. */
export function filtersToParams(f: Filters, opts: { page?: boolean; view?: 'map' } = {}): string {
  const s = new URLSearchParams();
  if (f.q) s.set('q', f.q);
  if (f.types.length) s.set('type', [...f.types].sort().join(','));
  if (f.min != null) s.set('min', String(f.min));
  if (f.max != null) s.set('max', String(f.max));
  if (f.beds !== 'any') s.set('beds', f.beds);
  if (f.furnished) s.set('furnished', '1');
  if (f.pets) s.set('pets', '1');
  if (f.parking) s.set('parking', '1');
  if (f.availableBy) s.set('available', f.availableBy);
  if (f.neighborhood) s.set('n', f.neighborhood);
  if (f.sort !== 'recommended') s.set('sort', f.sort);
  if (opts.page && f.page > 1) s.set('page', String(f.page));
  if (opts.view) s.set('view', opts.view);
  return s.toString();
}

export const homesHref = (f: Partial<Filters>, view?: 'map') => {
  const qs = filtersToParams({ ...EMPTY_FILTERS, ...f }, { view });
  return qs ? `/homes?${qs}` : '/homes';
};

/** Number of active filters (shown on the filter button) — the keyword and sort don't count. */
export function activeFilterCount(f: Filters): number {
  return [f.types.length > 0, f.min != null || f.max != null, f.beds !== 'any', f.furnished, f.pets, f.parking, !!f.availableBy, !!f.neighborhood].filter(Boolean).length;
}

const bedsText = (b: Beds) => (b === '0' ? 'Studio' : b === '3' ? '3+ beds' : `${b} bed`);

/** "Silver Lake · Houses" + "3+ beds · up to $6,000" — how a recent search is listed. */
export function describeSearch(f: Filters, neighborhoodName?: string | null): { label: string; detail: string } {
  const place = f.q || neighborhoodName || 'Los Angeles';
  const typeText = f.types.length === 1 ? TYPE_PLURAL[f.types[0]!] : f.types.length > 1 ? f.types.map((t) => TYPE_LABEL[t]).join(' / ') : null;
  const label = [place, f.q && typeText && f.types.length === 1 ? typeText : null].filter(Boolean).join(' · ');
  const parts = [
    !(f.q && f.types.length === 1) ? typeText : null,
    f.beds !== 'any' ? bedsText(f.beds) : null,
    f.min != null && f.max != null ? `${money(f.min)}–${money(f.max)}` : f.max != null ? `up to ${money(f.max)}` : f.min != null ? `from ${money(f.min)}` : null,
    f.furnished ? 'furnished' : null,
    f.pets ? 'pet-friendly' : null,
    f.parking ? 'with parking' : null,
    f.availableBy ? 'move-in by date' : null,
  ].filter(Boolean);
  return { label: label.slice(0, 80), detail: parts.join(' · ').slice(0, 120) || 'All homes' };
}

/** Escapes LIKE wildcards in user input (the value is still sent as a bound parameter). */
export const likePattern = (q: string) => `%${q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
