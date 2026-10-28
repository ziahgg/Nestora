import { addDays, laToday } from '@/lib/domain/format';

/** Week navigation for the slot picker (`?from=YYYY-MM-DD`), clamped to today … 8 weeks ahead. */
export function slotWeek(requested: string | undefined, now: number, base: string) {
  const today = laToday(now);
  const from = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested > today && requested <= addDays(today, 56) ? requested : today;
  const prev = from > today ? (addDays(from, -7) < today ? today : addDays(from, -7)) : null;
  return {
    from,
    prevHref: prev ? (prev === today ? base : `${base}?from=${prev}`) : null,
    nextHref: addDays(from, 7) <= addDays(today, 56) ? `${base}?from=${addDays(from, 7)}` : `${base}?from=${from}`,
  };
}
