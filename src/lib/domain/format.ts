/**
 * Formatting shared by server and client. Listings are in Los Angeles, so dates and times are shown in
 * America/Los_Angeles regardless of the visitor's own time zone.
 */
export const TZ = 'America/Los_Angeles';

/** "$5,850" — whole dollars, the way rents are quoted. */
export function money(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);
}

/** "$12.5k" for map pins. */
export function shortMoney(value: number | string): string {
  const n = Number(value);
  if (n < 10_000) return money(n);
  const k = n / 1000;
  return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

export const sqft = (n: number | null) => (n == null ? null : `${n.toLocaleString('en-US')} sq ft`);

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts });

/** Calendar dates (YYYY-MM-DD) are formatted as UTC so they never shift by a day. */
export function calendarDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts }).format(new Date(`${iso}T00:00:00Z`));
}

export const time = (iso: string | Date) => fmt({ hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
export const dayLong = (iso: string | Date) => fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(iso));
export const dayShort = (iso: string | Date) => fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso));
export const weekdayShort = (iso: string | Date) => fmt({ weekday: 'short' }).format(new Date(iso));
export const monthShort = (iso: string | Date) => fmt({ month: 'short' }).format(new Date(iso)).toUpperCase();
export const dayOfMonth = (iso: string | Date) => fmt({ day: 'numeric' }).format(new Date(iso));
/** "Mon, Oct 26 · 9:12 AM" */
export const dateTime = (iso: string | Date) => `${dayShort(iso)} · ${time(iso)}`;
/** "Mon, Oct 26, 2026 · 9:12 AM" */
export const dateTimeYear = (iso: string | Date) => `${fmt({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))} · ${time(iso)}`;

/** Today's date in Los Angeles as YYYY-MM-DD. */
export function laToday(now: number = Date.now()): string {
  const p = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now));
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The LA calendar day (YYYY-MM-DD) an instant falls on. */
export const laDay = (iso: string | Date) => laToday(new Date(iso).getTime());

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Notification grouping: "Today" / "Yesterday" / "Earlier" relative to LA today. */
export function dayGroup(iso: string, now: number): 'Today' | 'Yesterday' | 'Earlier' {
  const d = laDay(iso);
  const today = laToday(now);
  if (d === today) return 'Today';
  if (d === addDays(today, -1)) return 'Yesterday';
  return 'Earlier';
}

/** Short stamp for list rows: time today, otherwise the date. */
export const stamp = (iso: string, now: number) => (laDay(iso) === laToday(now) ? time(iso) : dayShort(iso));

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';
