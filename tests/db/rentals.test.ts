import type { PGlite, Transaction } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';

import { asUser, createDb, createUser } from './harness';

/**
 * Migrations applied unchanged to PGlite, then exercised as real users (RLS on). Fixture: one agent with
 * viewing hours every day at 10:00 and 11:00 (LA time), and available / leased / draft listings.
 */
const RENTER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const AGENT_USER = '33333333-3333-4333-8333-333333333333';
const AGENT2_USER = '44444444-4444-4444-8444-444444444444';
const AGENT = 'aaaaaaaa-0000-4000-8000-000000000001';
const AGENT2 = 'aaaaaaaa-0000-4000-8000-000000000002';
const HOME = 'bbbbbbbb-0000-4000-8000-000000000001';
const HOME2 = 'bbbbbbbb-0000-4000-8000-000000000002';
const HOME3 = 'bbbbbbbb-0000-4000-8000-000000000003';
const LEASED = 'bbbbbbbb-0000-4000-8000-000000000004';
const DRAFT = 'bbbbbbbb-0000-4000-8000-000000000005';

let db: PGlite;

async function fixture(d: PGlite) {
  for (const [id, name] of [[RENTER, 'Ziah'], [OTHER, 'Other'], [AGENT_USER, 'Maya'], [AGENT2_USER, 'Lena']] as const) await createUser(d, id, name);
  await d.exec(`
    insert into public.agents (id, user_id, full_name, agency, phone, email) values
      ('${AGENT}', '${AGENT_USER}', 'Maya Chen', 'Sample', '(213) 555-0142', 'maya@x.test'),
      ('${AGENT2}', '${AGENT2_USER}', 'Lena Park', 'Sample', '(310) 555-0123', 'lena@x.test');
    insert into public.agent_hours (agent_id, weekday, start_time)
      select a, d, t from unnest(array['${AGENT}'::uuid, '${AGENT2}'::uuid]) a, generate_series(0, 6) d, unnest(array['10:00'::time, '11:00'::time]) t;
    insert into public.neighborhoods (id, slug, name, city) values ('cccccccc-0000-4000-8000-000000000001', 'silver-lake', 'Silver Lake', 'Los Angeles');
    insert into public.properties (id, slug, agent_id, neighborhood_id, title, property_type, status, address_line, city, postal_code, bedrooms, bathrooms, monthly_rent)
    values
      ('${HOME}', 'home-1', '${AGENT}', 'cccccccc-0000-4000-8000-000000000001', 'Silver Lake Hillside House', 'house', 'available', '2418 Lakeview Ave', 'Los Angeles', '90039', 3, 2, 5850),
      ('${HOME2}', 'home-2', '${AGENT}', 'cccccccc-0000-4000-8000-000000000001', 'Second Home', 'apartment', 'coming_soon', '1 A St', 'Los Angeles', '90039', 1, 1, 3000),
      ('${HOME3}', 'home-3', '${AGENT2}', 'cccccccc-0000-4000-8000-000000000001', 'Third Home', 'studio', 'available', '2 B St', 'Los Angeles', '90039', 0, 1, 2400),
      ('${LEASED}', 'home-4', '${AGENT}', 'cccccccc-0000-4000-8000-000000000001', 'Leased Home', 'house', 'leased', '3 C St', 'Los Angeles', '90039', 2, 1, 4000),
      ('${DRAFT}', 'home-5', '${AGENT}', 'cccccccc-0000-4000-8000-000000000001', 'Draft Home', 'house', 'draft', '4 D St', 'Los Angeles', '90039', 2, 1, 4100);
  `);
}

/** A bookable slot: `days` from today at 10:00 or 11:00 Los Angeles time (ISO string). */
async function slot(d: PGlite | Transaction, days: number, hour: '10:00' | '11:00' = '10:00'): Promise<string> {
  const r = await d.query<{ ts: Date }>(`select ((current_date + $1::int) + $2::time) at time zone 'America/Los_Angeles' as ts`, [days, hour]);
  return r.rows[0]!.ts.toISOString();
}

const key = () => crypto.randomUUID();
const err = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as Error).message;
  }
  return 'no error';
};

const sendInquiry = (tx: Transaction, property = HOME, over: { key?: string; contact?: string; phone?: string; message?: string } = {}) =>
  tx.query<{ id: string }>(`select public.send_inquiry($1, array['availability','pets_deposit'], 'Ziah Makmur', 'Ziah@Example.com', $2, $3, $4::public.contact_method, $5) as id`, [
    property,
    over.phone ?? '',
    over.message ?? 'Hi Maya, is the house still available from mid-November?',
    over.contact ?? 'email',
    over.key ?? key(),
  ]);

const book = (tx: Transaction, at: string, property = HOME, k = key()) =>
  tx.query<{ id: string }>(`select public.request_viewing($1, 'in_person', $2::timestamptz, '+1 (213) 555-0186', 2, '', $3) as id`, [property, at, k]);

beforeEach(async () => {
  db = await createDb();
  await fixture(db);
});

describe('listings and RLS', () => {
  it('shows the public only published listings, and an agent their own drafts', async () => {
    const anon = await asUser(db, null, (tx) => tx.query<{ id: string }>('select id from public.properties'));
    expect(anon.rows.map((r) => r.id)).not.toContain(DRAFT);
    expect(anon.rows).toHaveLength(4);
    const agent = await asUser(db, AGENT_USER, (tx) => tx.query('select id from public.properties'));
    expect(agent.rows).toHaveLength(5);
  });

  it('keeps search text in sync with the neighborhood name', async () => {
    const r = await db.query<{ search_text: string }>(`select search_text from public.properties where id = $1`, [HOME]);
    expect(r.rows[0]!.search_text).toContain('silver lake');
  });

  it('hides the agent account id from browser roles', async () => {
    expect(await err(asUser(db, RENTER, (tx) => tx.query('select user_id from public.agents')))).toMatch(/permission denied/);
    const ok = await asUser(db, null, (tx) => tx.query('select full_name, phone from public.agents'));
    expect(ok.rows).toHaveLength(2);
  });

  it('blocks catalog writes from clients', async () => {
    expect(await err(asUser(db, AGENT_USER, (tx) => tx.query(`update public.properties set monthly_rent = 1 where id = $1`, [HOME])))).toMatch(/permission denied/);
  });
});

describe('saved homes, compare and history', () => {
  it('scopes favorites to their owner', async () => {
    await asUser(db, RENTER, (tx) => tx.query(`insert into public.favorites (user_id, property_id) values ($1, $2)`, [RENTER, HOME]));
    expect(await err(asUser(db, RENTER, (tx) => tx.query(`insert into public.favorites (user_id, property_id) values ($1, $2)`, [OTHER, HOME])))).toMatch(/row-level security/);
    expect(await err(asUser(db, RENTER, (tx) => tx.query(`insert into public.favorites (user_id, property_id) values ($1, $2)`, [RENTER, DRAFT])))).toMatch(/row-level security/);
    const other = await asUser(db, OTHER, (tx) => tx.query('select * from public.favorites'));
    expect(other.rows).toHaveLength(0);
  });

  it('limits compare to three homes', async () => {
    await asUser(db, RENTER, async (tx) => {
      for (const p of [HOME, HOME2, HOME3]) await tx.query(`insert into public.compare_items (user_id, property_id) values ($1, $2)`, [RENTER, p]);
    });
    expect(await err(asUser(db, RENTER, (tx) => tx.query(`insert into public.compare_items (user_id, property_id) values ($1, $2)`, [RENTER, LEASED])))).toBe('compare_full');
  });

  it('keeps only the ten newest recent searches', async () => {
    await asUser(db, RENTER, async (tx) => {
      for (let i = 0; i < 12; i++) await tx.query(`insert into public.recent_searches (user_id, label, params, created_at) values ($1, $2, $3, now() - make_interval(mins => $4))`, [RENTER, `S${i}`, `q=s${i}`, 12 - i]);
    });
    const r = await asUser(db, RENTER, (tx) => tx.query<{ label: string }>('select label from public.recent_searches order by created_at desc'));
    expect(r.rows).toHaveLength(10);
    expect(r.rows[0]!.label).toBe('S11');
  });
});

describe('inquiries', () => {
  it('stores the request with price and title snapshots and a submitted event', async () => {
    const id = (await asUser(db, RENTER, (tx) => sendInquiry(tx))).rows[0]!.id;
    await db.query(`update public.properties set monthly_rent = 6100, title = 'Renamed' where id = $1`, [HOME]);
    const r = await asUser(db, RENTER, (tx) => tx.query<{ status: string; monthly_rent_snapshot: number; property_title_snapshot: string; email: string; reference: string; topics: string[] }>('select * from public.inquiries where id = $1', [id]));
    expect(r.rows[0]).toMatchObject({ status: 'awaiting_response', property_title_snapshot: 'Silver Lake Hillside House', email: 'ziah@example.com', topics: ['availability', 'pets_deposit'] });
    expect(Number(r.rows[0]!.monthly_rent_snapshot)).toBe(5850);
    expect(r.rows[0]!.reference).toMatch(/^NST-INQ-\d+$/);
    const ev = await asUser(db, RENTER, (tx) => tx.query<{ kind: string }>('select kind from public.inquiry_events where inquiry_id = $1', [id]));
    expect(ev.rows.map((e) => e.kind)).toEqual(['submitted']);
  });

  it('is idempotent per key and allows one open inquiry per home', async () => {
    const k = key();
    const a = await asUser(db, RENTER, (tx) => sendInquiry(tx, HOME, { key: k }));
    const b = await asUser(db, RENTER, (tx) => sendInquiry(tx, HOME, { key: k }));
    expect(b.rows[0]!.id).toBe(a.rows[0]!.id);
    expect(await err(asUser(db, RENTER, (tx) => sendInquiry(tx)))).toBe('inquiry_exists');
  });

  it('rejects leased and draft listings, missing phone and short messages', async () => {
    expect(await err(asUser(db, RENTER, (tx) => sendInquiry(tx, LEASED)))).toBe('listing_unavailable');
    expect(await err(asUser(db, RENTER, (tx) => sendInquiry(tx, DRAFT)))).toBe('listing_not_found');
    expect(await err(asUser(db, RENTER, (tx) => sendInquiry(tx, HOME, { contact: 'phone' })))).toBe('phone_required');
    expect(await err(asUser(db, RENTER, (tx) => sendInquiry(tx, HOME, { message: 'Too short' })))).toMatch(/check constraint/);
    expect(await err(asUser(db, null, (tx) => sendInquiry(tx)))).toMatch(/permission denied/);
  });

  it('is visible to the renter and the listing agent only', async () => {
    const id = (await asUser(db, RENTER, (tx) => sendInquiry(tx))).rows[0]!.id;
    const count = async (u: string) => (await asUser(db, u, (tx) => tx.query('select id from public.inquiries where id = $1', [id]))).rows.length;
    expect(await count(RENTER)).toBe(1);
    expect(await count(AGENT_USER)).toBe(1);
    expect(await count(OTHER)).toBe(0);
    expect(await count(AGENT2_USER)).toBe(0);
    expect(await err(asUser(db, RENTER, (tx) => tx.query(`update public.inquiries set status = 'closed' where id = $1`, [id])))).toMatch(/permission denied/);
  });

  it('agent replies mark it responded and notify the renter (respecting settings)', async () => {
    const id = (await asUser(db, RENTER, (tx) => sendInquiry(tx))).rows[0]!.id;
    expect(await err(asUser(db, AGENT2_USER, (tx) => tx.query(`select public.add_inquiry_message($1, 'Not my listing')`, [id])))).toBe('inquiry_not_found');
    await asUser(db, AGENT_USER, (tx) => tx.query(`select public.add_inquiry_message($1, 'Yes — dogs are welcome.')`, [id]));
    const r = await asUser(db, RENTER, (tx) => tx.query<{ status: string }>('select status from public.inquiries where id = $1', [id]));
    expect(r.rows[0]!.status).toBe('responded');
    const n = await asUser(db, RENTER, (tx) => tx.query<{ title: string }>('select title from public.notifications'));
    expect(n.rows.map((x) => x.title)).toEqual(['Maya Chen replied']);

    await asUser(db, RENTER, (tx) => tx.query('update public.profiles set notify_inquiry_replies = false where id = $1', [RENTER]));
    await asUser(db, AGENT_USER, (tx) => tx.query(`select public.add_inquiry_message($1, 'Second message')`, [id]));
    expect((await asUser(db, RENTER, (tx) => tx.query('select id from public.notifications'))).rows).toHaveLength(1);
  });

  it('withdrawing cancels a viewing booked through the inquiry; only the renter can withdraw', async () => {
    const id = (await asUser(db, RENTER, (tx) => sendInquiry(tx))).rows[0]!.id;
    const at = await slot(db, 3);
    const v = (await asUser(db, RENTER, (tx) => book(tx, at))).rows[0]!.id;
    expect((await asUser(db, RENTER, (tx) => tx.query<{ status: string }>('select status from public.inquiries where id = $1', [id]))).rows[0]!.status).toBe('viewing_scheduled');
    expect(await err(asUser(db, OTHER, (tx) => tx.query('select public.withdraw_inquiry($1)', [id])))).toBe('inquiry_not_found');
    await asUser(db, RENTER, (tx) => tx.query('select public.withdraw_inquiry($1)', [id]));
    const vr = await asUser(db, RENTER, (tx) => tx.query<{ status: string; cancelled_by: string }>('select status, cancelled_by from public.viewings where id = $1', [v]));
    expect(vr.rows[0]).toMatchObject({ status: 'cancelled', cancelled_by: 'renter' });
    expect(await err(asUser(db, RENTER, (tx) => tx.query('select public.withdraw_inquiry($1)', [id])))).toBe('inquiry_closed');
    // A new inquiry is allowed once the old one is withdrawn.
    expect((await asUser(db, RENTER, (tx) => sendInquiry(tx))).rows).toHaveLength(1);
  });

  it('only the listing agent can close an inquiry', async () => {
    const id = (await asUser(db, RENTER, (tx) => sendInquiry(tx))).rows[0]!.id;
    expect(await err(asUser(db, RENTER, (tx) => tx.query(`select public.close_inquiry($1, 'x')`, [id])))).toBe('inquiry_not_found');
    await asUser(db, AGENT_USER, (tx) => tx.query(`select public.close_inquiry($1, 'Listing filled')`, [id]));
    expect((await asUser(db, RENTER, (tx) => tx.query<{ status: string }>('select status from public.inquiries where id = $1', [id]))).rows[0]!.status).toBe('closed');
  });
});

describe('viewing slots and bookings', () => {
  it('marks too-soon, booked and unavailable days', async () => {
    const day = (await db.query<{ d: string }>(`select to_char(current_date + 3, 'YYYY-MM-DD') as d`)).rows[0]!.d;
    await db.query(`insert into public.agent_time_off (agent_id, day) values ($1, current_date + 4)`, [AGENT]);
    const at = await slot(db, 3, '11:00');
    await asUser(db, OTHER, (tx) => book(tx, at));
    const r = await asUser(db, RENTER, (tx) => tx.query<{ day: string; slot: string | null; available: boolean; reason: string | null }>(`select to_char(day, 'YYYY-MM-DD') as day, slot::text, available, reason from public.viewing_slots($1, current_date + 3, 2)`, [HOME]));
    expect(r.rows.filter((x) => x.day === day)).toEqual([
      { day, slot: '10:00:00', available: true, reason: null },
      { day, slot: '11:00:00', available: false, reason: 'booked' },
    ]);
    expect(r.rows.find((x) => x.day !== day)).toMatchObject({ slot: null, available: false, reason: 'agent_unavailable' });
    const past = await asUser(db, null, (tx) => tx.query<{ reason: string | null }>(`select reason from public.viewing_slots($1, current_date - 1, 1)`, [HOME]));
    expect(past.rows.every((x) => x.reason === 'too_soon')).toBe(true);
  });

  it('books only real, future, free slots', async () => {
    const offHours = (await db.query<{ ts: Date }>(`select ((current_date + 3) + time '13:00') at time zone 'America/Los_Angeles' as ts`)).rows[0]!.ts.toISOString();
    expect(await err(asUser(db, RENTER, (tx) => book(tx, offHours)))).toBe('slot_unavailable');
    expect(await err(asUser(db, RENTER, (tx) => book(tx, new Date(Date.now() - 86_400_000).toISOString())))).toBe('slot_out_of_range');
    expect(await err(asUser(db, RENTER, (tx) => book(tx, new Date(Date.now() + 90 * 86_400_000).toISOString())))).toBe('slot_out_of_range');
    expect(await err(asUser(db, RENTER, async (tx) => book(tx, await slot(tx, 3), LEASED)))).toBe('listing_unavailable');
  });

  it('prevents double booking of an agent’s slot and duplicate viewings per home', async () => {
    const at = await slot(db, 3);
    const k = key();
    const a = await asUser(db, RENTER, (tx) => book(tx, at, HOME, k));
    const again = await asUser(db, RENTER, (tx) => book(tx, at, HOME, k));
    expect(again.rows[0]!.id).toBe(a.rows[0]!.id); // idempotent retry
    // Same agent, same time, different home and renter.
    expect(await err(asUser(db, OTHER, (tx) => book(tx, at, HOME2)))).toBe('slot_taken');
    // Other agent is free at that time.
    expect((await asUser(db, OTHER, (tx) => book(tx, at, HOME3))).rows).toHaveLength(1);
    expect(await err(asUser(db, RENTER, async (tx) => book(tx, await slot(tx, 4), HOME)))).toBe('viewing_exists');
    const ends = await asUser(db, RENTER, (tx) => tx.query<{ mins: number }>(`select extract(epoch from ends_at - starts_at)::int / 60 as mins from public.viewings where id = $1`, [a.rows[0]!.id]));
    expect(ends.rows[0]!.mins).toBe(30);
  });

  it('reschedules to a free slot only, and only for the renter', async () => {
    const v = (await asUser(db, RENTER, async (tx) => book(tx, await slot(tx, 3)))).rows[0]!.id;
    const taken = await slot(db, 5);
    await asUser(db, OTHER, (tx) => book(tx, taken, HOME2));
    expect(await err(asUser(db, RENTER, (tx) => tx.query('select public.reschedule_viewing($1, $2::timestamptz)', [v, taken])))).toBe('slot_taken');
    expect(await err(asUser(db, OTHER, (tx) => tx.query('select public.reschedule_viewing($1, $2::timestamptz)', [v, taken])))).toBe('viewing_not_found');
    const free = await slot(db, 5, '11:00');
    await asUser(db, RENTER, (tx) => tx.query('select public.reschedule_viewing($1, $2::timestamptz)', [v, free]));
    const r = await asUser(db, RENTER, (tx) => tx.query<{ starts_at: Date; reschedule_count: number; status: string }>('select starts_at, reschedule_count, status from public.viewings where id = $1', [v]));
    expect(r.rows[0]!.starts_at.toISOString()).toBe(free);
    expect(r.rows[0]).toMatchObject({ reschedule_count: 1, status: 'confirmed' });
  });

  it('cancelling frees the slot and returns the inquiry to its previous state', async () => {
    const inq = (await asUser(db, RENTER, (tx) => sendInquiry(tx))).rows[0]!.id;
    await asUser(db, AGENT_USER, (tx) => tx.query(`select public.add_inquiry_message($1, 'Sure, book a time.')`, [inq]));
    const at = await slot(db, 3);
    const v = (await asUser(db, RENTER, (tx) => book(tx, at))).rows[0]!.id;
    await asUser(db, AGENT_USER, (tx) => tx.query(`select public.cancel_viewing($1, 'Owner paused showings')`, [v]));
    const i = await asUser(db, RENTER, (tx) => tx.query<{ status: string }>('select status from public.inquiries where id = $1', [inq]));
    expect(i.rows[0]!.status).toBe('responded');
    const n = await asUser(db, RENTER, (tx) => tx.query<{ title: string }>(`select title from public.notifications where kind = 'viewing_update'`));
    expect(n.rows.map((x) => x.title)).toEqual(['Viewing cancelled']);
    expect((await asUser(db, OTHER, (tx) => book(tx, at, HOME2))).rows).toHaveLength(1); // slot released
    expect(await err(asUser(db, RENTER, (tx) => tx.query(`select public.cancel_viewing($1, '')`, [v])))).toBe('viewing_cancelled');
  });

  it('hides viewings from other renters and other agents', async () => {
    const v = (await asUser(db, RENTER, async (tx) => book(tx, await slot(tx, 3)))).rows[0]!.id;
    for (const [u, n] of [[RENTER, 1], [AGENT_USER, 1], [OTHER, 0], [AGENT2_USER, 0]] as const) {
      expect((await asUser(db, u, (tx) => tx.query('select id from public.viewings where id = $1', [v]))).rows).toHaveLength(n);
    }
    expect(await err(asUser(db, AGENT2_USER, (tx) => tx.query(`select public.cancel_viewing($1, '')`, [v])))).toBe('viewing_not_found');
  });
});

describe('profiles and notifications', () => {
  it('creates a profile on sign-up and limits updates to the owner’s own allowed columns', async () => {
    const p = await asUser(db, RENTER, (tx) => tx.query<{ full_name: string; contact_email: string }>('select full_name, contact_email from public.profiles'));
    expect(p.rows).toEqual([{ full_name: 'Ziah', contact_email: `${RENTER.slice(0, 8)}@example.test` }]);
    const res = await asUser(db, RENTER, (tx) => tx.query(`update public.profiles set full_name = 'Hacked' where id = $1`, [OTHER]));
    expect(res.affectedRows).toBe(0);
    expect(await err(asUser(db, RENTER, (tx) => tx.query(`update public.profiles set created_at = now() where id = $1`, [RENTER])))).toMatch(/permission denied/);
  });

  it('notifies people who saved a home when its rent changes (if opted in)', async () => {
    await db.query(`insert into public.favorites (user_id, property_id) values ($1, $3), ($2, $3)`, [RENTER, OTHER, HOME]);
    await db.query(`update public.profiles set notify_price_updates = true where id = $1`, [RENTER]);
    await db.query(`update public.properties set monthly_rent = 5600 where id = $1`, [HOME]);
    const mine = await asUser(db, RENTER, (tx) => tx.query<{ body: string }>('select body from public.notifications'));
    expect(mine.rows.map((r) => r.body)).toEqual(['Silver Lake Hillside House is now listed at $5,600 / month']);
    expect((await asUser(db, OTHER, (tx) => tx.query('select id from public.notifications'))).rows).toHaveLength(0);
    // Notifications can only be marked read, not rewritten.
    expect(await err(asUser(db, RENTER, (tx) => tx.query(`update public.notifications set title = 'x'`)))).toMatch(/permission denied/);
    await asUser(db, RENTER, (tx) => tx.query(`update public.notifications set read_at = now()`));
  });
});
