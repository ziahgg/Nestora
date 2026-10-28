import { describe, expect, it } from 'vitest';

import { inquirySchema, passwordSchema, profileSchema, viewingSchema } from '@/lib/validations';
import { slotWeek } from '@/lib/slot-window';
import { addDays, calendarDate, dayGroup, laToday, money, shortMoney } from './format';
import { availabilityLabel, bestIndex, depositTerms, inquiryTimeline, NOT_SPECIFIED, petsTerms, profileCompleteness, rentalTerms, specLine } from './listing';
import { activeFilterCount, describeSearch, EMPTY_FILTERS, filtersToParams, likePattern, parseFilters } from './search';
import type { PropertyRow } from '@/types/database';

const property = (over: Partial<PropertyRow> = {}): PropertyRow => ({
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'home',
  agent_id: 'a',
  neighborhood_id: 'n',
  title: 'Home',
  description: '',
  property_type: 'house',
  status: 'available',
  address_line: '1 Main St',
  city: 'Los Angeles',
  region: 'CA',
  postal_code: '90001',
  bedrooms: 3,
  bathrooms: 2,
  area_sqft: 1820,
  parking: 2,
  monthly_rent: 5850,
  currency: 'USD',
  security_deposit: 5850,
  pets: 'cats_and_dogs',
  pet_deposit: 500,
  lease_months: 12,
  furnishing: 'unfurnished',
  utilities: null,
  available_from: '2026-11-15',
  featured: false,
  map_x: 50,
  map_y: 50,
  search_text: '',
  published_at: null,
  created_at: '',
  updated_at: '',
  ...over,
});

describe('format', () => {
  it('formats rents in whole dollars and map pins in thousands', () => {
    expect(money(5850)).toBe('$5,850');
    expect(money('3950.00')).toBe('$3,950');
    expect(shortMoney(12500)).toBe('$12.5k');
    expect(shortMoney(4600)).toBe('$4,600');
  });

  it('uses the Los Angeles calendar day, not UTC', () => {
    // 06:30 UTC on Oct 29 is still Oct 28 in Los Angeles (UTC−7).
    expect(laToday(Date.parse('2026-10-29T06:30:00Z'))).toBe('2026-10-28');
    expect(calendarDate('2026-11-15')).toBe('Nov 15');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(dayGroup('2026-10-28T20:00:00Z', Date.parse('2026-10-28T22:00:00Z'))).toBe('Today');
    expect(dayGroup('2026-10-27T20:00:00Z', Date.parse('2026-10-28T22:00:00Z'))).toBe('Yesterday');
  });
});

describe('listing rules', () => {
  it('labels availability from status and date', () => {
    expect(availabilityLabel(property(), '2026-10-28')).toBe('Available Nov 15');
    expect(availabilityLabel(property({ available_from: '2026-10-01' }), '2026-10-28')).toBe('Available now');
    expect(availabilityLabel(property({ status: 'coming_soon', available_from: null }), '2026-10-28')).toBe('Coming soon');
    expect(availabilityLabel(property({ status: 'leased' }), '2026-10-28')).toBe('Leased');
  });

  it('never invents rental terms', () => {
    const terms = rentalTerms(property({ security_deposit: null, lease_months: null, furnishing: null, pets: null }));
    expect(terms.find((t) => t.label === 'Security deposit')?.value).toBe(NOT_SPECIFIED);
    expect(terms.find((t) => t.label === 'Lease length')?.value).toBe(NOT_SPECIFIED);
    expect(terms.find((t) => t.label === 'Pets')?.value).toBe(NOT_SPECIFIED);
    expect(terms.find((t) => t.label === 'Utilities')?.value).toBe(NOT_SPECIFIED);
  });

  it('describes deposits and pets', () => {
    expect(depositTerms(property())).toBe('$5,850 (1 month)');
    expect(depositTerms(property({ security_deposit: 25000, monthly_rent: 12500 }))).toBe('$25,000 (2 months)');
    expect(depositTerms(property({ security_deposit: 1000 }))).toBe('$1,000');
    expect(petsTerms(property())).toBe('Dogs & cats · $500 pet deposit');
    expect(petsTerms(property({ pets: 'none', pet_deposit: 300 }))).toBe('No pets');
    expect(specLine(property({ bedrooms: 0, bathrooms: 1, area_sqft: 560 }))).toBe('Studio · 1 ba · 560 sq ft');
  });

  it('marks a single best value only', () => {
    expect(bestIndex([5850, 4600, 3950], 'min')).toBe(2);
    expect(bestIndex([1820, 1650, null], 'max')).toBe(0);
    expect(bestIndex([4600, 4600], 'min')).toBeNull();
    expect(bestIndex([4600, null], 'min')).toBeNull();
  });

  it('computes profile completeness in 20 % steps', () => {
    const c = profileCompleteness({ full_name: 'Ziah', contact_email: 'z@example.com', phone: '+1 213 555 0186', avatar_path: 'x', preferred_move_in: null });
    expect(c).toEqual({ percent: 80, nextHint: 'Add move-in date' });
    expect(profileCompleteness({ full_name: '', contact_email: null, phone: null, avatar_path: null, preferred_move_in: null }).percent).toBe(0);
  });
});

describe('inquiry timeline', () => {
  const ctx = { agentName: 'Maya Chen', replyHint: 'Usually replies within 4 hours', submittedAt: '2026-10-26T16:12:00Z' };
  const submitted = { kind: 'submitted', actor: 'renter', body: null, created_at: '2026-10-26T16:12:00Z' };

  it('shows awaiting response as the current step', () => {
    const steps = inquiryTimeline('awaiting_response', [submitted], ctx);
    expect(steps.map((s) => s.state)).toEqual(['done', 'current', 'todo', 'todo', 'todo']);
    expect(steps[1]!.detail).toBe('Usually replies within 4 hours');
  });

  it('quotes the agent’s reply when responded', () => {
    const steps = inquiryTimeline('responded', [submitted, { kind: 'responded', actor: 'agent', body: 'Cats are welcome', created_at: '2026-10-27T17:15:00Z' }], ctx);
    expect(steps[2]).toMatchObject({ title: 'Responded', state: 'current', detail: '“Cats are welcome”' });
    expect(steps[1]!.detail).toBe('Delivered to Maya Chen');
  });

  it('stops at Withdrawn', () => {
    const steps = inquiryTimeline('withdrawn', [submitted, { kind: 'withdrawn', actor: 'renter', body: null, created_at: '2026-10-26T18:05:00Z' }], ctx);
    expect(steps.map((s) => s.key)).toEqual(['submitted', 'awaiting', 'withdrawn']);
    expect(steps[2]!.state).toBe('stopped');
  });
});

describe('search filters', () => {
  it('parses and normalises the URL', () => {
    const f = parseFilters({ q: '  Silver Lake ', type: 'house,castle,house', min: '7000', max: '2000', beds: '3', pets: '1', sort: 'bogus', page: '-4', available: '2026-13-45' });
    expect(f).toMatchObject({ q: 'Silver Lake', types: ['house'], min: 2000, max: 7000, beds: '3', pets: true, sort: 'recommended', page: 1, availableBy: null });
  });

  it('round-trips through the canonical query string', () => {
    const qs = filtersToParams({ ...EMPTY_FILTERS, q: 'Venice', types: ['apartment'], pets: true, max: 4000 });
    expect(qs).toBe('q=Venice&type=apartment&max=4000&pets=1');
    expect(parseFilters(new URLSearchParams(qs))).toMatchObject({ q: 'Venice', types: ['apartment'], pets: true, max: 4000 });
    expect(filtersToParams(EMPTY_FILTERS)).toBe('');
  });

  it('counts active filters and describes searches', () => {
    const f = parseFilters({ q: 'Silver Lake', type: 'house', beds: '3', max: '6000' });
    expect(activeFilterCount(f)).toBe(3);
    expect(describeSearch(f)).toEqual({ label: 'Silver Lake · Houses', detail: '3+ beds · up to $6,000' });
  });

  it('escapes LIKE wildcards in keywords', () => {
    expect(likePattern('50%_off')).toBe('%50\\%\\_off%');
  });
});

describe('validation', () => {
  const base = { propertyId: '00000000-0000-0000-0000-000000000001', topics: ['availability'], fullName: 'Ziah', email: 'Z@Example.com', phone: '', message: 'Hi, is the home still available?', preferredContact: 'email' as const, idempotencyKey: crypto.randomUUID() };

  it('accepts a complete inquiry and lowercases the email', () => {
    const r = inquirySchema.safeParse(base);
    expect(r.success && r.data.email).toBe('z@example.com');
    expect(r.success && r.data.phone).toBeNull();
  });

  it('matches the design’s validation messages', () => {
    const r = inquirySchema.safeParse({ ...base, topics: [], message: 'Too short', email: 'nope' });
    const msgs = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(msgs).toContain('Choose at least one topic');
    expect(msgs).toContain('Write a short message (at least 20 characters)');
    expect(msgs).toContain('Enter a valid email address');
  });

  it('requires a phone when contact by phone is chosen', () => {
    const r = inquirySchema.safeParse({ ...base, preferredContact: 'phone' });
    expect(r.success).toBe(false);
  });

  it('checks viewing input', () => {
    const v = { propertyId: base.propertyId, type: 'in_person', startsAt: '2026-11-07T19:00:00Z', phone: '+1 (213) 555-0186', guests: 2, note: '', idempotencyKey: crypto.randomUUID() };
    expect(viewingSchema.safeParse(v).success).toBe(true);
    expect(viewingSchema.safeParse({ ...v, guests: 9 }).success).toBe(false);
    expect(viewingSchema.safeParse({ ...v, startsAt: 'Saturday' }).success).toBe(false);
  });

  it('requires a number in passwords and valid profile dates', () => {
    expect(passwordSchema.safeParse('longpassword').success).toBe(false);
    expect(passwordSchema.safeParse('longpassw0rd').success).toBe(true);
    expect(profileSchema.safeParse({ fullName: 'Z', contactEmail: 'z@example.com', phone: '', preferredMoveIn: '' }).success).toBe(true);
    expect(profileSchema.safeParse({ fullName: '', contactEmail: 'z@example.com', phone: 'abc', preferredMoveIn: '' }).success).toBe(false);
  });
});

describe('slot week navigation', () => {
  const now = Date.parse('2026-10-28T18:00:00Z'); // Oct 28 in LA
  it('starts today and clamps out-of-range weeks', () => {
    expect(slotWeek(undefined, now, '/s')).toEqual({ from: '2026-10-28', prevHref: null, nextHref: '/s?from=2026-11-04' });
    expect(slotWeek('2026-01-01', now, '/s').from).toBe('2026-10-28');
    expect(slotWeek('2026-11-04', now, '/s')).toMatchObject({ from: '2026-11-04', prevHref: '/s' });
  });
});
