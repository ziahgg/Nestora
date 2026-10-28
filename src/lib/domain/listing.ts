/**
 * Listing, inquiry and viewing rules that the UI and tests share. The database enforces the same
 * rules; these functions decide what to show and which actions to offer.
 */
import type { Furnishing, InquiryStatus, ListingStatus, PetsPolicy, PropertyRow, PropertyType, ViewingStatus } from '@/types/database';
import { calendarDate, money, sqft } from './format';

export const NOT_SPECIFIED = 'Not specified';

export const TYPE_LABEL: Record<PropertyType, string> = { apartment: 'Apartment', house: 'House', studio: 'Studio', townhouse: 'Townhouse' };
export const TYPE_PLURAL: Record<PropertyType, string> = { apartment: 'Apartments', house: 'Houses', studio: 'Studios', townhouse: 'Townhouses' };
export const FURNISHING_LABEL: Record<Furnishing, string> = { furnished: 'Furnished', partly_furnished: 'Partly furnished', unfurnished: 'Unfurnished' };
export const PETS_LABEL: Record<PetsPolicy, string> = { none: 'No pets', cats: 'Cats only', dogs: 'Dogs only', cats_and_dogs: 'Dogs & cats' };

/** Public listings that renters can contact or book. */
export const isContactable = (status: ListingStatus) => status === 'available' || status === 'coming_soon';

/** "Available" / "Coming soon" / "Leased" — the short status in list rows. */
export function statusLabel(status: ListingStatus): string {
  return status === 'available' ? 'Available' : status === 'coming_soon' ? 'Coming soon' : status === 'leased' ? 'Leased' : 'Draft';
}

/** "Available Nov 15" / "Available now" / "Leased" for the green badge. */
export function availabilityLabel(p: Pick<PropertyRow, 'status' | 'available_from'>, today: string): string {
  if (p.status === 'leased') return 'Leased';
  if (!p.available_from || p.available_from <= today) return p.status === 'available' ? 'Available now' : 'Coming soon';
  return `Available ${calendarDate(p.available_from)}`;
}

export const bedsLabel = (beds: number) => (beds === 0 ? 'Studio' : `${beds} bd`);
export const bathsLabel = (baths: number) => `${Number(baths)} ba`;

/** "3 bd · 2 ba · 1,820 sq ft" */
export function specLine(p: Pick<PropertyRow, 'bedrooms' | 'bathrooms' | 'area_sqft'>): string {
  return [bedsLabel(p.bedrooms), bathsLabel(p.bathrooms), sqft(p.area_sqft)].filter(Boolean).join(' · ');
}

export function petsTerms(p: Pick<PropertyRow, 'pets' | 'pet_deposit'>): string {
  if (!p.pets) return NOT_SPECIFIED;
  const base = PETS_LABEL[p.pets];
  return p.pets !== 'none' && p.pet_deposit != null ? `${base} · ${money(p.pet_deposit)} pet deposit` : base;
}

export function depositTerms(p: Pick<PropertyRow, 'security_deposit' | 'monthly_rent'>): string {
  if (p.security_deposit == null) return NOT_SPECIFIED;
  const months = Number(p.security_deposit) / Number(p.monthly_rent);
  const note = Number.isInteger(months) && months > 0 ? ` (${months} month${months === 1 ? '' : 's'})` : '';
  return `${money(p.security_deposit)}${note}`;
}

/** Rental terms rows on the details page — unknown values read "Not specified", never a guess. */
export function rentalTerms(p: PropertyRow): { label: string; value: string }[] {
  return [
    { label: 'Monthly rent', value: money(p.monthly_rent) },
    { label: 'Security deposit', value: depositTerms(p) },
    { label: 'Lease length', value: p.lease_months ? `${p.lease_months} months` : NOT_SPECIFIED },
    { label: 'Furnishing', value: p.furnishing ? FURNISHING_LABEL[p.furnishing] : NOT_SPECIFIED },
    { label: 'Pets', value: petsTerms(p) },
    { label: 'Utilities', value: p.utilities ?? NOT_SPECIFIED },
  ];
}

// ───────────── Compare ─────────────

export const COMPARE_MAX = 3;

/** Index of the single best value (lowest rent / largest area), or null when there's no clear winner. */
export function bestIndex(values: (number | null)[], prefer: 'min' | 'max'): number | null {
  const known = values.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v != null);
  if (known.length < 2) return null;
  const target = prefer === 'min' ? Math.min(...known.map((x) => x.v)) : Math.max(...known.map((x) => x.v));
  const hits = known.filter((x) => x.v === target);
  return hits.length === 1 ? hits[0]!.i : null;
}

// ───────────── Inquiries ─────────────

export const TOPICS = [
  { value: 'availability', label: 'Is it still available?' },
  { value: 'viewing', label: 'Request a viewing' },
  { value: 'pets_deposit', label: 'Pets & deposit' },
  { value: 'other', label: 'Other' },
] as const;
export type Topic = (typeof TOPICS)[number]['value'];
export const TOPIC_SHORT: Record<Topic, string> = { availability: 'Availability', viewing: 'Viewing', pets_deposit: 'Pets & deposit', other: 'Other' };

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'ink';

export const INQUIRY_STATUS: Record<InquiryStatus, { label: string; tone: Tone; open: boolean }> = {
  awaiting_response: { label: 'Awaiting response', tone: 'warning', open: true },
  responded: { label: 'Responded', tone: 'success', open: true },
  viewing_scheduled: { label: 'Viewing scheduled', tone: 'ink', open: true },
  withdrawn: { label: 'Withdrawn', tone: 'neutral', open: false },
  closed: { label: 'Closed', tone: 'neutral', open: false },
};

export const canWithdraw = (s: InquiryStatus) => INQUIRY_STATUS[s].open;
export const canMessage = (s: InquiryStatus) => INQUIRY_STATUS[s].open;

export type TimelineEvent = { kind: string; actor: string; body: string | null; created_at: string };
export type TimelineStep = { key: string; title: string; detail: string; at: string | null; state: 'done' | 'current' | 'todo' | 'stopped' };

/**
 * The Figma status timeline: Submitted → Awaiting response → Responded → Viewing scheduled → Closed.
 * Withdrawn replaces the remaining steps. Built from real events; future steps are explanatory text.
 */
export function inquiryTimeline(
  status: InquiryStatus,
  events: TimelineEvent[],
  ctx: { agentName: string; replyHint: string; submittedAt: string },
): TimelineStep[] {
  const first = (k: string) => events.find((e) => e.kind === k);
  const last = (k: string) => [...events].reverse().find((e) => e.kind === k);
  const responded = first('responded');
  const viewing = last('viewing_scheduled');
  const end = first('withdrawn') ?? first('closed');
  const quote = (b: string | null) => (b ? `“${b.length > 90 ? `${b.slice(0, 88)}…` : b}”` : '');

  const steps: TimelineStep[] = [
    { key: 'submitted', title: 'Submitted', detail: '', at: ctx.submittedAt, state: 'done' },
    { key: 'awaiting', title: 'Awaiting response', detail: responded || end ? `Delivered to ${ctx.agentName}` : ctx.replyHint, at: null, state: responded || end ? 'done' : 'current' },
  ];
  if (status === 'withdrawn') {
    steps.push({ key: 'withdrawn', title: 'Withdrawn', detail: 'by you', at: end?.created_at ?? null, state: 'stopped' });
    return steps;
  }
  steps.push({ key: 'responded', title: 'Responded', detail: responded ? quote(responded.body) : 'You’ll be notified', at: responded?.created_at ?? null, state: responded ? (status === 'responded' ? 'current' : 'done') : 'todo' });
  steps.push({
    key: 'viewing',
    title: 'Viewing scheduled',
    detail: viewing ? (viewing.body ?? 'Viewing booked') : 'Optional — book a time when you’re ready',
    at: viewing?.created_at ?? null,
    state: status === 'viewing_scheduled' ? 'current' : viewing && status === 'closed' ? 'done' : 'todo',
  });
  steps.push({ key: 'closed', title: 'Closed', detail: status === 'closed' ? (end?.body ?? 'Closed by the agent') : 'When the listing is filled or you finish', at: status === 'closed' ? (end?.created_at ?? null) : null, state: status === 'closed' ? 'current' : 'todo' });
  return steps;
}

// ───────────── Viewings ─────────────

export const VIEWING_TYPE_LABEL = { in_person: 'In person', video: 'Video tour' } as const;
export const VIEWING_STATUS: Record<ViewingStatus, { label: string; tone: Tone }> = {
  confirmed: { label: 'Confirmed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'error' },
};

/** Upcoming = not cancelled and not yet finished. */
export const isUpcomingViewing = (v: { status: ViewingStatus; ends_at: string }, now: number) => v.status !== 'cancelled' && Date.parse(v.ends_at) > now;
export const canChangeViewing = (v: { status: ViewingStatus; starts_at: string }, now: number) => v.status !== 'cancelled' && Date.parse(v.starts_at) > now;

// ───────────── Profile ─────────────

/** Profile completeness: name, contact email, phone, photo, move-in date — each 20 %. */
export function profileCompleteness(p: { full_name: string; contact_email: string | null; phone: string | null; avatar_path: string | null; preferred_move_in: string | null }) {
  const parts = [
    { done: !!p.full_name.trim(), hint: 'Add your name' },
    { done: !!p.contact_email, hint: 'Add an email' },
    { done: !!p.phone, hint: 'Add a phone number' },
    { done: !!p.avatar_path, hint: 'Add a photo' },
    { done: !!p.preferred_move_in, hint: 'Add move-in date' },
  ];
  const done = parts.filter((x) => x.done).length;
  return { percent: done * 20, nextHint: parts.find((x) => !x.done)?.hint ?? null };
}
