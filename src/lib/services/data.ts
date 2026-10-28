import 'server-only';

import { cache } from 'react';

import { likePattern, PAGE_SIZE, type Filters } from '@/lib/domain/search';
import { createClient, type ServerClient } from '@/lib/supabase/server';
import type { AgentRow, InquiryEventRow, InquiryRow, NotificationRow, ProfileRow, PropertyRow, RecentSearchRow, ViewingRow } from '@/types/database';

/**
 * Read services. Queries run as the visitor: anonymous users see only public listings; signed-in
 * users additionally see their own rows (RLS). Errors are logged without row data.
 */
export class DataError extends Error {}

function check<T>(res: { data: T | null; error: { message: string; code?: string } | null }, what: string): T {
  if (res.error) {
    console.error(`[nestora] ${what} failed: ${res.error.code ?? ''} ${res.error.message}`);
    throw new DataError(`Couldn’t load ${what}.`);
  }
  return res.data as T;
}

/** Visitor for public pages: a client plus the user id when signed in (JWT verified by getClaims). */
export const viewer = cache(async (): Promise<{ db: ServerClient; userId: string | null }> => {
  const db = await createClient();
  const { data } = await db.auth.getClaims();
  const sub = data?.claims?.sub;
  return { db, userId: typeof sub === 'string' ? sub : null };
});

// agents.user_id isn't readable by browser roles, so agent columns are always listed explicitly.
export const AGENT_COLS = 'id, full_name, title, agency, phone, email, verified, reply_hint, created_at';

const CARD_COLS =
  'id, slug, title, property_type, status, city, address_line, bedrooms, bathrooms, area_sqft, monthly_rent, furnishing, available_from, featured, map_x, map_y, published_at, neighborhood:neighborhoods!inner(name, slug), images:property_images(image_key, alt, sort_order)';

type CardQueryRow = Pick<
  PropertyRow,
  'id' | 'slug' | 'title' | 'property_type' | 'status' | 'city' | 'address_line' | 'bedrooms' | 'bathrooms' | 'area_sqft' | 'monthly_rent' | 'furnishing' | 'available_from' | 'featured' | 'map_x' | 'map_y' | 'published_at'
> & { neighborhood: { name: string; slug: string }; images: { image_key: string; alt: string; sort_order: number }[] };

export type HomeCard = Omit<CardQueryRow, 'images'> & { image: { key: string; alt: string } | null; saved: boolean; inCompare: boolean };

/** Ids of the user's saved and compared homes (empty when signed out). */
export const myLists = cache(async (): Promise<{ saved: Set<string>; compare: Set<string> }> => {
  const { db, userId } = await viewer();
  if (!userId) return { saved: new Set(), compare: new Set() };
  const [f, c] = await Promise.all([db.from('favorites').select('property_id'), db.from('compare_items').select('property_id')]);
  return { saved: new Set(check(f, 'saved homes').map((r) => r.property_id)), compare: new Set(check(c, 'compare list').map((r) => r.property_id)) };
});

async function toCards(rows: CardQueryRow[]): Promise<HomeCard[]> {
  const lists = await myLists();
  return rows.map(({ images, ...p }) => {
    const first = [...images].sort((a, b) => a.sort_order - b.sort_order)[0];
    return { ...p, image: first ? { key: first.image_key, alt: first.alt } : null, saved: lists.saved.has(p.id), inCompare: lists.compare.has(p.id) };
  });
}

// ───────────── Discovery ─────────────

export async function searchHomes(f: Filters): Promise<{ items: HomeCard[]; total: number; pages: number }> {
  const { db } = await viewer();
  let q = db.from('properties').select(CARD_COLS, { count: 'exact' }).in('status', ['available', 'coming_soon']);
  if (f.q) q = q.ilike('search_text', likePattern(f.q));
  if (f.types.length) q = q.in('property_type', f.types);
  if (f.min != null) q = q.gte('monthly_rent', f.min);
  if (f.max != null) q = q.lte('monthly_rent', f.max);
  if (f.beds === '3') q = q.gte('bedrooms', 3);
  else if (f.beds !== 'any') q = q.eq('bedrooms', Number(f.beds));
  if (f.furnished) q = q.in('furnishing', ['furnished', 'partly_furnished']);
  if (f.pets) q = q.in('pets', ['cats', 'dogs', 'cats_and_dogs']);
  if (f.parking) q = q.gte('parking', 1);
  if (f.availableBy) q = q.or(`available_from.is.null,available_from.lte.${f.availableBy}`);
  if (f.neighborhood) q = q.eq('neighborhood.slug', f.neighborhood);
  if (f.sort === 'price_asc') q = q.order('monthly_rent', { ascending: true });
  else if (f.sort === 'price_desc') q = q.order('monthly_rent', { ascending: false });
  else if (f.sort === 'newest') q = q.order('published_at', { ascending: false });
  else q = q.order('featured', { ascending: false }).order('published_at', { ascending: false });
  q = q.order('id');
  const from = (f.page - 1) * PAGE_SIZE;
  const res = await q.range(from, from + PAGE_SIZE - 1);
  const rows = check(res, 'homes') as unknown as CardQueryRow[];
  const total = res.count ?? rows.length;
  return { items: await toCards(rows), total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function featuredHomes(type: string | null): Promise<HomeCard[]> {
  const { db } = await viewer();
  let q = db.from('properties').select(CARD_COLS).in('status', ['available', 'coming_soon']).eq('featured', true);
  if (type) q = q.eq('property_type', type as PropertyRow['property_type']);
  const res = await q.order('published_at', { ascending: false }).limit(6);
  return toCards(check(res, 'featured homes') as unknown as CardQueryRow[]);
}

export async function recentlyAdded(type: string | null, limit = 4): Promise<HomeCard[]> {
  const { db } = await viewer();
  let q = db.from('properties').select(CARD_COLS).in('status', ['available', 'coming_soon']);
  if (type) q = q.eq('property_type', type as PropertyRow['property_type']);
  const res = await q.order('published_at', { ascending: false }).limit(limit);
  return toCards(check(res, 'recent homes') as unknown as CardQueryRow[]);
}

export type NeighborhoodCard = { slug: string; name: string; city: string; count: number; image: { key: string; alt: string } | null };

/** Neighborhoods with their real count of public homes (and one photo); empty neighborhoods are left out. */
export async function neighborhoods(): Promise<NeighborhoodCard[]> {
  const { db } = await viewer();
  const res = await db
    .from('neighborhoods')
    .select('slug, name, city, sort_order, properties(id, status, images:property_images(image_key, alt, sort_order))')
    .order('sort_order');
  const rows = check(res, 'neighborhoods');
  return rows
    .map((n) => {
      const live = n.properties.filter((p) => p.status === 'available' || p.status === 'coming_soon');
      const img = live.flatMap((p) => p.images).sort((a, b) => a.sort_order - b.sort_order)[0];
      return { slug: n.slug, name: n.name, city: n.city, count: live.length, image: img ? { key: img.image_key, alt: img.alt } : null };
    })
    .filter((n) => n.count > 0);
}

export async function recentSearches(): Promise<RecentSearchRow[]> {
  const { db, userId } = await viewer();
  if (!userId) return [];
  return check(await db.from('recent_searches').select('*').order('created_at', { ascending: false }).limit(5), 'recent searches');
}

// ───────────── Property details ─────────────

export type PropertyDetail = PropertyRow & {
  neighborhood: { name: string; slug: string; city: string };
  agent: AgentRow;
  images: { image_key: string; alt: string; caption: string | null; sort_order: number }[];
  amenities: { name: string; icon: string }[];
};

export async function getProperty(slug: string): Promise<PropertyDetail | null> {
  const { db } = await viewer();
  const res = await db
    .from('properties')
    .select(`*, neighborhood:neighborhoods!inner(name, slug, city), agent:agents!inner(${AGENT_COLS}), images:property_images(image_key, alt, caption, sort_order), amenities:property_amenities(amenity:amenities(name, icon))`)
    .eq('slug', slug)
    .maybeSingle();
  const row = check(res, 'home');
  if (!row) return null;
  const r = row as unknown as Omit<PropertyDetail, 'amenities'> & { amenities: { amenity: { name: string; icon: string } }[] };
  return { ...r, images: [...r.images].sort((a, b) => a.sort_order - b.sort_order), amenities: r.amenities.map((a) => a.amenity).sort((a, b) => a.name.localeCompare(b.name)) };
}

/** Same type or neighborhood, closest in rent. */
export async function similarHomes(p: PropertyRow): Promise<HomeCard[]> {
  const { db } = await viewer();
  const res = await db
    .from('properties')
    .select(CARD_COLS)
    .in('status', ['available', 'coming_soon'])
    .neq('id', p.id)
    .or(`property_type.eq.${p.property_type},neighborhood_id.eq.${p.neighborhood_id}`)
    .limit(12);
  const rows = (check(res, 'similar homes') as unknown as CardQueryRow[]).sort((a, b) => Math.abs(a.monthly_rent - p.monthly_rent) - Math.abs(b.monthly_rent - p.monthly_rent));
  return toCards(rows.slice(0, 4));
}

/** The renter's open inquiry and active viewing for a home, if any (drives the details page actions). */
export async function myActivityFor(propertyId: string): Promise<{ inquiryId: string | null; viewingId: string | null }> {
  const { db, userId } = await viewer();
  if (!userId) return { inquiryId: null, viewingId: null };
  const [i, v] = await Promise.all([
    db.from('inquiries').select('id').eq('user_id', userId).eq('property_id', propertyId).in('status', ['awaiting_response', 'responded', 'viewing_scheduled']).maybeSingle(),
    db.from('viewings').select('id').eq('user_id', userId).eq('property_id', propertyId).eq('status', 'confirmed').maybeSingle(),
  ]);
  return { inquiryId: check(i, 'inquiry')?.id ?? null, viewingId: check(v, 'viewing')?.id ?? null };
}

// ───────────── Renter lists ─────────────

async function cardsByIds(ids: string[]): Promise<HomeCard[]> {
  if (!ids.length) return [];
  const { db } = await viewer();
  const rows = check(await db.from('properties').select(CARD_COLS).in('id', ids), 'homes') as unknown as CardQueryRow[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return toCards(ids.map((id) => byId.get(id)).filter((r): r is CardQueryRow => !!r));
}

export async function savedHomes(userId: string): Promise<HomeCard[]> {
  const { db } = await viewer();
  const f = check(await db.from('favorites').select('property_id').eq('user_id', userId).order('created_at', { ascending: false }), 'saved homes');
  return cardsByIds(f.map((r) => r.property_id));
}

export async function recentlyViewed(userId: string, now: number): Promise<(HomeCard & { viewed_at: string })[]> {
  const { db } = await viewer();
  const since = new Date(now - 7 * 86_400_000).toISOString();
  const rv = check(await db.from('recently_viewed').select('property_id, viewed_at').eq('user_id', userId).gte('viewed_at', since).order('viewed_at', { ascending: false }).limit(30), 'recently viewed');
  const cards = await cardsByIds(rv.map((r) => r.property_id));
  const at = new Map(rv.map((r) => [r.property_id, r.viewed_at]));
  return cards.map((c) => ({ ...c, viewed_at: at.get(c.id)! }));
}

export type CompareHome = PropertyRow & { neighborhood: { name: string }; images: { image_key: string; alt: string; sort_order: number }[] };

export async function compareHomes(userId: string): Promise<CompareHome[]> {
  const { db } = await viewer();
  const c = check(await db.from('compare_items').select('property_id').eq('user_id', userId).order('created_at'), 'compare list');
  if (!c.length) return [];
  const rows = check(await db.from('properties').select('*, neighborhood:neighborhoods!inner(name), images:property_images(image_key, alt, sort_order)').in('id', c.map((r) => r.property_id)), 'compared homes') as unknown as CompareHome[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return c.map((r) => byId.get(r.property_id)).filter((r): r is CompareHome => !!r);
}

// ───────────── Inquiries ─────────────

type PropertyMini = { id: string; slug: string; title: string; city: string; monthly_rent: number; status: PropertyRow['status']; bedrooms: number; bathrooms: number; images: { image_key: string; alt: string; sort_order: number }[] };
const PROPERTY_MINI = 'property:properties!inner(id, slug, title, city, monthly_rent, status, bedrooms, bathrooms, images:property_images(image_key, alt, sort_order))';

export type InquiryListItem = InquiryRow & { property: PropertyMini; agent: Pick<AgentRow, 'full_name' | 'reply_hint'>; events: Pick<InquiryEventRow, 'kind' | 'actor' | 'body' | 'created_at'>[]; viewings: Pick<ViewingRow, 'starts_at' | 'status'>[] };

export async function myInquiries(userId: string): Promise<InquiryListItem[]> {
  const { db } = await viewer();
  const res = await db
    .from('inquiries')
    .select(`*, ${PROPERTY_MINI}, agent:agents!inner(full_name, reply_hint), events:inquiry_events(kind, actor, body, created_at), viewings(starts_at, status)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return check(res, 'inquiries') as unknown as InquiryListItem[];
}

export type InquiryDetail = InquiryRow & { property: PropertyMini; agent: AgentRow; events: InquiryEventRow[]; viewings: ViewingRow[] };

export async function getInquiry(id: string): Promise<InquiryDetail | null> {
  const { db } = await viewer();
  const res = await db
    .from('inquiries')
    .select(`*, ${PROPERTY_MINI}, agent:agents!inner(${AGENT_COLS}), events:inquiry_events(*), viewings(*)`)
    .eq('id', id)
    .maybeSingle();
  const row = check(res, 'inquiry') as unknown as InquiryDetail | null;
  if (!row) return null;
  row.events.sort((a, b) => a.created_at.localeCompare(b.created_at));
  row.viewings.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return row;
}

// ───────────── Viewings ─────────────

export type ViewingItem = ViewingRow & { property: PropertyMini & { address_line: string; postal_code: string; map_x: number; map_y: number }; agent: AgentRow };

const VIEWING_SELECT = `*, property:properties!inner(id, slug, title, city, monthly_rent, status, bedrooms, bathrooms, address_line, postal_code, map_x, map_y, images:property_images(image_key, alt, sort_order)), agent:agents!inner(${AGENT_COLS})`;

export async function myViewings(userId: string): Promise<ViewingItem[]> {
  const { db } = await viewer();
  return check(await db.from('viewings').select(VIEWING_SELECT).eq('user_id', userId).order('starts_at'), 'viewings') as unknown as ViewingItem[];
}

export async function getViewing(id: string): Promise<ViewingItem | null> {
  const { db } = await viewer();
  return check(await db.from('viewings').select(VIEWING_SELECT).eq('id', id).maybeSingle(), 'viewing') as unknown as ViewingItem | null;
}

export type Slot = { day: string; slot: string | null; startsAt: string | null; available: boolean; reason: string | null };

/** Bookable viewing times for the next `days` days starting `from` (LA calendar day). */
export async function viewingSlots(propertyId: string, from: string, days = 7): Promise<Slot[]> {
  const { db } = await viewer();
  const res = await db.rpc('viewing_slots', { p_property: propertyId, p_from: from, p_days: days });
  return check(res, 'viewing times').map((r) => ({ day: r.day, slot: r.slot, startsAt: r.starts_at, available: r.available, reason: r.reason }));
}

// ───────────── Notifications & profile ─────────────

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { db } = await viewer();
  return check(await db.from('profiles').select('*').eq('id', userId).maybeSingle(), 'profile');
}

export async function unreadCount(userId: string | null): Promise<number> {
  if (!userId) return 0;
  const { db } = await viewer();
  const res = await db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null);
  check(res, 'notifications');
  return res.count ?? 0;
}

export async function myNotifications(userId: string): Promise<NotificationRow[]> {
  const { db } = await viewer();
  return check(await db.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50), 'notifications');
}

export type NotificationDetail = NotificationRow & { property: PropertyMini | null };

export async function getNotification(id: string): Promise<NotificationDetail | null> {
  const { db } = await viewer();
  const res = await db.from('notifications').select('*, property:properties(id, slug, title, city, monthly_rent, status, bedrooms, bathrooms, images:property_images(image_key, alt, sort_order))').eq('id', id).maybeSingle();
  return check(res, 'notification') as unknown as NotificationDetail | null;
}

export async function profileStats(userId: string, now: number) {
  const { db } = await viewer();
  const head = { count: 'exact' as const, head: true };
  const since = new Date(now - 7 * 86_400_000).toISOString();
  const [saved, inquiries, upcoming, recent] = await Promise.all([
    db.from('favorites').select('property_id', head).eq('user_id', userId),
    db.from('inquiries').select('id', head).eq('user_id', userId),
    db.from('viewings').select('id', head).eq('user_id', userId).neq('status', 'cancelled').gt('ends_at', new Date(now).toISOString()),
    db.from('recently_viewed').select('property_id', head).eq('user_id', userId).gte('viewed_at', since),
  ]);
  check(saved, 'saved count');
  check(inquiries, 'inquiry count');
  check(upcoming, 'viewing count');
  check(recent, 'recently viewed count');
  return { saved: saved.count ?? 0, inquiries: inquiries.count ?? 0, upcomingViewings: upcoming.count ?? 0, recentlyViewed: recent.count ?? 0 };
}

// ───────────── Agent queue ─────────────

export async function myAgent(): Promise<AgentRow | null> {
  const { db, userId } = await viewer();
  if (!userId) return null;
  const idRes = await db.rpc('my_agent_id');
  const agentId = check(idRes, 'agent');
  if (!agentId) return null;
  return check(await db.from('agents').select(AGENT_COLS).eq('id', agentId).maybeSingle(), 'agent');
}

export async function agentInquiries(agentId: string): Promise<InquiryDetail[]> {
  const { db } = await viewer();
  const res = await db
    .from('inquiries')
    .select(`*, ${PROPERTY_MINI}, agent:agents!inner(${AGENT_COLS}), events:inquiry_events(*), viewings(*)`)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(50);
  const rows = check(res, 'agent inquiries') as unknown as InquiryDetail[];
  for (const r of rows) r.events.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return rows;
}

export async function agentViewings(agentId: string, now: number): Promise<ViewingItem[]> {
  const { db } = await viewer();
  return check(
    await db.from('viewings').select(VIEWING_SELECT).eq('agent_id', agentId).neq('status', 'cancelled').gt('ends_at', new Date(now).toISOString()).order('starts_at'),
    'agent viewings',
  ) as unknown as ViewingItem[];
}
