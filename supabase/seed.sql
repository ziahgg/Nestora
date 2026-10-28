-- DEVELOPMENT SEED ONLY (applied by `supabase db reset` locally — never run in production).
-- Every listing, agent, price, address and reference here is illustrative sample content from the
-- Nestora Figma file. Photos are cropped from the file's screen exports (public/sample).
-- Dates are relative to the day you reset, so "upcoming" stays upcoming.
-- Accounts (local only):
--   renter  demo@nestora.test   / nestora-demo   (Ziah Makmur)
--   agent   maya@nestora.test   / nestora-agent  (Maya Chen — Silver Lake, Echo Park)
--   agent   daniel@nestora.test / nestora-agent  (Daniel Ortiz — Pasadena, Bel Air)
--   agent   lena@nestora.test   / nestora-agent  (Lena Park — Venice, Downtown, one draft)

create function pg_temp.sid(kind text, slug text) returns uuid language sql immutable as $$ select md5(kind || ':' || slug)::uuid $$;
create function pg_temp.la(d date, t time) returns timestamptz language sql immutable as $$ select (d + t) at time zone 'America/Los_Angeles' $$;
-- First Saturday at least two days from today.
create function pg_temp.next_sat() returns date language sql stable as $$
  select (current_date + 2 + ((6 - extract(dow from current_date + 2)::int + 7) % 7))::date
$$;

create function pg_temp.mkuser(p_id uuid, p_email text, p_password text, p_name text) returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', p_name), now() - interval '3 months', now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true), 'email', now(), now(), now());
$$;

select pg_temp.mkuser('a0000000-0000-4000-8000-000000000001', 'demo@nestora.test', 'nestora-demo', 'Ziah Makmur');
select pg_temp.mkuser('a0000000-0000-4000-8000-000000000011', 'maya@nestora.test', 'nestora-agent', 'Maya Chen');
select pg_temp.mkuser('a0000000-0000-4000-8000-000000000012', 'daniel@nestora.test', 'nestora-agent', 'Daniel Ortiz');
select pg_temp.mkuser('a0000000-0000-4000-8000-000000000013', 'lena@nestora.test', 'nestora-agent', 'Lena Park');

update public.profiles set contact_email = 'ziah.makmur@example.com', phone = '+1 (213) 555-0186', avatar_path = 'sample/avatar-ziah.jpg'
where id = 'a0000000-0000-4000-8000-000000000001';

insert into public.agents (id, user_id, full_name, agency, phone, email, verified, reply_hint) values
  (pg_temp.sid('a', 'maya'), 'a0000000-0000-4000-8000-000000000011', 'Maya Chen', 'Nestora Sample Realty', '(213) 555-0142', 'maya.chen@nestora-sample.test', true, 'Usually replies within 4 hours'),
  (pg_temp.sid('a', 'daniel'), 'a0000000-0000-4000-8000-000000000012', 'Daniel Ortiz', 'Nestora Sample Realty', '(626) 555-0177', 'daniel.ortiz@nestora-sample.test', true, 'Usually replies within a day'),
  (pg_temp.sid('a', 'lena'), 'a0000000-0000-4000-8000-000000000013', 'Lena Park', 'Nestora Sample Realty', '(310) 555-0123', 'lena.park@nestora-sample.test', true, 'Usually replies within 6 hours');

-- Weekly viewing times. Maya doesn't show homes on Mondays.
insert into public.agent_hours (agent_id, weekday, start_time)
select pg_temp.sid('a', 'maya'), d, t from unnest(array[0, 2, 3, 4, 5, 6]) d, unnest(array['10:00', '11:00', '12:30', '14:30', '16:00', '17:30']::time[]) t
union all
select pg_temp.sid('a', 'daniel'), d, t from unnest(array[1, 2, 3, 4, 5, 6]) d, unnest(array['10:00', '11:30', '14:00', '16:30']::time[]) t
union all
select pg_temp.sid('a', 'lena'), d, t from unnest(array[0, 2, 3, 4, 5, 6]) d, unnest(array['09:30', '11:00', '13:00', '15:30', '18:00']::time[]) t;

insert into public.neighborhoods (id, slug, name, city, sort_order) values
  (pg_temp.sid('n', 'silver-lake'), 'silver-lake', 'Silver Lake', 'Los Angeles', 1),
  (pg_temp.sid('n', 'venice'), 'venice', 'Venice', 'Los Angeles', 2),
  (pg_temp.sid('n', 'pasadena'), 'pasadena', 'Pasadena', 'Los Angeles County', 3),
  (pg_temp.sid('n', 'downtown'), 'downtown', 'Downtown', 'Los Angeles', 4),
  (pg_temp.sid('n', 'echo-park'), 'echo-park', 'Echo Park', 'Los Angeles', 5),
  (pg_temp.sid('n', 'bel-air'), 'bel-air', 'Bel Air', 'Los Angeles', 6),
  (pg_temp.sid('n', 'mar-vista'), 'mar-vista', 'Mar Vista', 'Los Angeles', 7);

insert into public.amenities (id, slug, name, icon)
select pg_temp.sid('am', s), s, n, i from (values
  ('laundry', 'In-unit laundry', 'washing-machine'), ('dishwasher', 'Dishwasher', 'utensils'), ('air', 'Central air', 'air-vent'),
  ('yard', 'Private yard', 'trees'), ('parking', 'Off-street parking', 'car'), ('gym', 'Fitness room', 'dumbbell'),
  ('pool', 'Pool', 'waves'), ('rooftop', 'Rooftop deck', 'building-2'), ('ev', 'EV charging', 'plug-zap'),
  ('balcony', 'Balcony', 'sun'), ('fireplace', 'Fireplace', 'flame'), ('concierge', 'Concierge', 'concierge-bell')
) v(s, n, i);

insert into public.properties (id, slug, agent_id, neighborhood_id, title, description, property_type, status, address_line, city, postal_code,
  bedrooms, bathrooms, area_sqft, parking, monthly_rent, security_deposit, pets, pet_deposit, lease_months, furnishing, utilities, available_from, featured, map_x, map_y, published_at)
select pg_temp.sid('p', slug), slug, pg_temp.sid('a', agent), pg_temp.sid('n', hood), title, descr, ptype::public.property_type, status::public.listing_status, addr, city, zip,
  beds, baths, sqft, park, rent, dep, pets::public.pets_policy, petdep, lease, furn::public.furnishing, util, current_date + avail, feat, mx, my, now() - (age || ' days')::interval
from (values
  ('silver-lake-hillside-house', 'maya', 'silver-lake', 'Silver Lake Hillside House',
   'A bright hillside house with floor-to-ceiling glass, a wraparound deck and a quiet garden under a mature eucalyptus. Open-plan kitchen and living room, two baths and a flexible third bedroom.',
   'house', 'available', '2418 Lakeview Ave', 'Silver Lake, LA', '90039', 3, 2.0, 1820, 2, 5850.00, 5850.00, 'cats_and_dogs', 500.00, 12, 'unfurnished', null, 17, true, 62.0, 36.0, 2),
  ('pasadena-craftsman-home', 'daniel', 'pasadena', 'Pasadena Craftsman Home',
   'A restored craftsman with a deep front porch, original woodwork and a sunny backyard, a short walk from Lake Ave.',
   'house', 'coming_soon', '742 N Holliston Ave', 'Pasadena', '91104', 3, 2.0, 1650, 2, 4600.00, 4600.00, 'dogs', null, 12, 'unfurnished', 'Water and trash included', 47, true, 30.0, 16.0, 6),
  ('venice-courtyard-apartment', 'lena', 'venice', 'Venice Courtyard Apartment',
   'Second-floor apartment around a planted courtyard, four blocks from the beach, with a private balcony and in-unit laundry.',
   'apartment', 'coming_soon', '318 Rose Ave, Unit 4', 'Venice, LA', '90291', 2, 1.0, 980, 1, 3950.00, null, 'cats', null, 12, 'unfurnished', null, 33, false, 74.0, 72.0, 8),
  ('dtla-skyline-one-bedroom', 'lena', 'downtown', 'DTLA Skyline One-Bedroom',
   'Furnished one-bedroom on the 18th floor with skyline views, a fitness room, rooftop deck and 24-hour concierge.',
   'apartment', 'available', '900 S Figueroa St, #1804', 'Downtown, LA', '90015', 1, 1.0, 720, 1, 3300.00, 3300.00, 'none', null, 12, 'furnished', 'Internet included', 0, false, 50.0, 58.0, 12),
  ('echo-park-studio-loft', 'maya', 'echo-park', 'Echo Park Studio Loft',
   'Light-filled studio loft with tall windows and built-in shelving, steps from Echo Park Lake.',
   'studio', 'available', '1520 Sunset Blvd, #3', 'Echo Park, LA', '90026', 0, 1.0, 560, 0, 2450.00, 2450.00, 'cats', 300.00, 12, 'partly_furnished', null, 3, false, 24.0, 46.0, 4),
  ('bel-air-pool-residence', 'daniel', 'bel-air', 'Bel Air Pool Residence',
   'Modern four-bedroom residence with a lap pool, walls of glass and canyon views, offered furnished.',
   'house', 'coming_soon', '11030 Bellagio Rd', 'Bel Air, LA', '90077', 4, 4.0, 3400, 3, 12500.00, 25000.00, 'cats_and_dogs', null, 12, 'furnished', null, 64, true, 10.0, 12.0, 10),
  ('mar-vista-garden-duplex', 'lena', 'mar-vista', 'Mar Vista Garden Duplex',
   'Draft listing — not yet published.',
   'townhouse', 'draft', '3721 Grand View Blvd', 'Mar Vista, LA', '90066', 2, 1.5, 1100, 1, 4200.00, null, null, null, null, null, null, 40, false, 80.0, 50.0, 0)
) v(slug, agent, hood, title, descr, ptype, status, addr, city, zip, beds, baths, sqft, park, rent, dep, pets, petdep, lease, furn, util, avail, feat, mx, my, age);

-- The draft has no publish date.
update public.properties set published_at = null where slug = 'mar-vista-garden-duplex';

insert into public.property_images (property_id, image_key, alt, caption, sort_order)
select pg_temp.sid('p', p), k, a, c, o from (values
  ('silver-lake-hillside-house', 'silver-lake-hillside-1', 'Two-storey hillside house with dark timber cladding and glass walls opening onto a lawn', 'Exterior · garden and deck', 0),
  ('silver-lake-hillside-house', 'silver-lake-hillside-2', 'Living room with a tan leather sofa, sage accent wall and pendant lights', 'Living room · floor-to-ceiling glass', 1),
  ('pasadena-craftsman-home', 'pasadena-craftsman-1', 'White craftsman house with a wraparound porch and front lawn', 'Exterior · front porch', 0),
  ('venice-courtyard-apartment', 'venice-courtyard-1', 'Brick apartment building with balconies around a courtyard', 'Exterior · courtyard', 0),
  ('dtla-skyline-one-bedroom', 'dtla-skyline-1', 'Dark-clad high-rise apartment building against a blue sky', 'Exterior', 0),
  ('echo-park-studio-loft', 'echo-park-loft-1', 'Studio loft with white bookshelves, a green sofa and a dining table', 'Living area', 0),
  ('bel-air-pool-residence', 'bel-air-pool-1', 'White modern residence with a lap pool and timber soffit', 'Pool terrace', 0)
) v(p, k, a, c, o);

insert into public.property_amenities (property_id, amenity_id)
select pg_temp.sid('p', p), pg_temp.sid('am', a) from (values
  ('silver-lake-hillside-house', 'laundry'), ('silver-lake-hillside-house', 'dishwasher'), ('silver-lake-hillside-house', 'yard'), ('silver-lake-hillside-house', 'parking'), ('silver-lake-hillside-house', 'air'), ('silver-lake-hillside-house', 'ev'),
  ('pasadena-craftsman-home', 'yard'), ('pasadena-craftsman-home', 'parking'), ('pasadena-craftsman-home', 'fireplace'), ('pasadena-craftsman-home', 'dishwasher'),
  ('venice-courtyard-apartment', 'laundry'), ('venice-courtyard-apartment', 'balcony'), ('venice-courtyard-apartment', 'parking'),
  ('dtla-skyline-one-bedroom', 'gym'), ('dtla-skyline-one-bedroom', 'rooftop'), ('dtla-skyline-one-bedroom', 'concierge'), ('dtla-skyline-one-bedroom', 'air'), ('dtla-skyline-one-bedroom', 'laundry'),
  ('echo-park-studio-loft', 'dishwasher'), ('echo-park-studio-loft', 'air'),
  ('bel-air-pool-residence', 'pool'), ('bel-air-pool-residence', 'yard'), ('bel-air-pool-residence', 'parking'), ('bel-air-pool-residence', 'air'), ('bel-air-pool-residence', 'laundry'), ('bel-air-pool-residence', 'fireplace')
) v(p, a);

-- ───────────── Demo renter activity ─────────────
-- (inserted directly; the app itself only writes through RLS and the workflow functions)

insert into public.favorites (user_id, property_id, created_at)
select 'a0000000-0000-4000-8000-000000000001', pg_temp.sid('p', p), now() - (h || ' hours')::interval from (values
  ('silver-lake-hillside-house', 30), ('pasadena-craftsman-home', 50), ('dtla-skyline-one-bedroom', 80)) v(p, h);

insert into public.compare_items (user_id, property_id, created_at)
select 'a0000000-0000-4000-8000-000000000001', pg_temp.sid('p', p), now() - (h || ' hours')::interval from (values
  ('silver-lake-hillside-house', 20), ('pasadena-craftsman-home', 21)) v(p, h);

insert into public.recently_viewed (user_id, property_id, viewed_at)
select 'a0000000-0000-4000-8000-000000000001', pg_temp.sid('p', p), now() - (m || ' minutes')::interval from (values
  ('silver-lake-hillside-house', 60), ('venice-courtyard-apartment', 130), ('echo-park-studio-loft', 1500), ('bel-air-pool-residence', 1580)) v(p, m);

insert into public.recent_searches (user_id, label, detail, params, created_at) values
  ('a0000000-0000-4000-8000-000000000001', 'Silver Lake · Houses', '3+ beds · up to $6,000', 'q=Silver+Lake&type=house&beds=3&max=6000', now() - interval '1 day'),
  ('a0000000-0000-4000-8000-000000000001', 'Venice', 'Apartments · pet-friendly', 'q=Venice&type=apartment&pets=1', now() - interval '2 days'),
  ('a0000000-0000-4000-8000-000000000001', 'Downtown', '1 bed · furnished', 'q=Downtown&beds=1&furnished=1', now() - interval '4 days');

-- Inquiries: three open, two finished. References follow the design (NST-INQ-…).
insert into public.inquiries (id, reference, user_id, property_id, agent_id, topics, full_name, email, phone, message, preferred_contact, status,
  property_title_snapshot, monthly_rent_snapshot, idempotency_key, created_at, updated_at)
select pg_temp.sid('i', ref), ref, 'a0000000-0000-4000-8000-000000000001', pg_temp.sid('p', p), pg_temp.sid('a', a), topics, 'Ziah Makmur', 'ziah.makmur@example.com', '+1 (213) 555-0186',
  msg, 'email', st::public.inquiry_status, t, rent, gen_random_uuid(), now() - (ago || ' hours')::interval, now() - (ago || ' hours')::interval
from (values
  ('NST-INQ-20418', 'silver-lake-hillside-house', 'maya', array['availability', 'pets_deposit'], 'Hi Maya, is the house still available from mid-November? We have a small dog — what is the pet deposit? Thanks!', 'awaiting_response', 'Silver Lake Hillside House', 5850.00, 52),
  ('NST-INQ-20311', 'pasadena-craftsman-home', 'daniel', array['availability', 'viewing'], 'Hi Daniel, we would love to see the craftsman before it opens up in December. Is a Saturday morning possible?', 'viewing_scheduled', 'Pasadena Craftsman Home', 4600.00, 216),
  ('NST-INQ-20356', 'venice-courtyard-apartment', 'lena', array['pets_deposit'], 'Hi Lena, I have a cat — is that okay? And how much is the security deposit? Thanks!', 'responded', 'Venice Courtyard Apartment', 3950.00, 168),
  ('NST-INQ-20177', 'bel-air-pool-residence', 'daniel', array['availability', 'other'], 'Hello Daniel, is the residence available for a 12-month lease, and is the pool maintenance included?', 'closed', 'Bel Air Pool Residence', 12500.00, 480),
  ('NST-INQ-20240', 'dtla-skyline-one-bedroom', 'lena', array['availability'], 'Hi Lena, is the furnished one-bedroom still available for a January move-in?', 'withdrawn', 'DTLA Skyline One-Bedroom', 3300.00, 336)
) v(ref, p, a, topics, msg, st, t, rent, ago);

insert into public.inquiry_events (inquiry_id, kind, actor, body, created_at)
select pg_temp.sid('i', ref), k, actor, body, now() - (ago || ' hours')::interval from (values
  ('NST-INQ-20418', 'submitted', 'renter', null, 52),
  ('NST-INQ-20311', 'submitted', 'renter', null, 216),
  ('NST-INQ-20311', 'responded', 'agent', 'Happy to show it before it’s listed — Saturday morning works. Book any open slot.', 200),
  ('NST-INQ-20311', 'viewing_scheduled', 'renter', null, 198),
  ('NST-INQ-20356', 'submitted', 'renter', null, 168),
  ('NST-INQ-20356', 'responded', 'agent', 'Cats are welcome — deposit details to follow.', 2),
  ('NST-INQ-20177', 'submitted', 'renter', null, 480),
  ('NST-INQ-20177', 'responded', 'agent', 'It is — pool service is included. Happy to set up a video tour.', 470),
  ('NST-INQ-20177', 'viewing_scheduled', 'renter', null, 468),
  ('NST-INQ-20177', 'viewing_cancelled', 'agent', null, 420),
  ('NST-INQ-20177', 'closed', 'agent', 'The owner accepted another application — thank you for your interest.', 400),
  ('NST-INQ-20240', 'submitted', 'renter', null, 336),
  ('NST-INQ-20240', 'withdrawn', 'renter', null, 330)
) v(ref, k, actor, body, ago);

insert into public.viewings (id, reference, user_id, property_id, agent_id, inquiry_id, viewing_type, starts_at, ends_at, status, phone, guests, note,
  cancelled_at, cancelled_by, cancel_reason, idempotency_key, created_at)
values
  (pg_temp.sid('v', 'pasadena'), 'NST-VW-3165', 'a0000000-0000-4000-8000-000000000001', pg_temp.sid('p', 'pasadena-craftsman-home'), pg_temp.sid('a', 'daniel'), pg_temp.sid('i', 'NST-INQ-20311'),
   'in_person', pg_temp.la(pg_temp.next_sat(), '10:00'), pg_temp.la(pg_temp.next_sat(), '10:30'), 'confirmed', '+1 (213) 555-0186', 2, null, null, null, null, gen_random_uuid(), now() - interval '198 hours'),
  (pg_temp.sid('v', 'bel-air'), 'NST-VW-3101', 'a0000000-0000-4000-8000-000000000001', pg_temp.sid('p', 'bel-air-pool-residence'), pg_temp.sid('a', 'daniel'), pg_temp.sid('i', 'NST-INQ-20177'),
   'video', now() - interval '17 days', now() - interval '17 days' + interval '20 minutes', 'cancelled', '+1 (213) 555-0186', 1, null,
   now() - interval '420 hours', 'agent', 'The owner paused showings.', gen_random_uuid(), now() - interval '468 hours');

insert into public.notifications (user_id, kind, title, body, property_id, inquiry_id, viewing_id, read_at, created_at) values
  ('a0000000-0000-4000-8000-000000000001', 'viewing_reminder', 'Viewing reminder · ' || to_char(pg_temp.next_sat(), 'Dy') || ' 10:00 AM',
   'Pasadena Craftsman Home with Daniel Ortiz · NST-VW-3165', pg_temp.sid('p', 'pasadena-craftsman-home'), pg_temp.sid('i', 'NST-INQ-20311'), pg_temp.sid('v', 'pasadena'), null, now() - interval '1 hour'),
  ('a0000000-0000-4000-8000-000000000001', 'inquiry_reply', 'Lena Park replied', 'Venice Courtyard Apartment · “Cats are welcome — deposit details to follow.”',
   pg_temp.sid('p', 'venice-courtyard-apartment'), pg_temp.sid('i', 'NST-INQ-20356'), null, null, now() - interval '2 hours'),
  ('a0000000-0000-4000-8000-000000000001', 'price_update', 'Price update on a saved home', 'Pasadena Craftsman Home is now listed at $4,600 / month',
   pg_temp.sid('p', 'pasadena-craftsman-home'), null, null, now() - interval '3 days', now() - interval '4 days'),
  ('a0000000-0000-4000-8000-000000000001', 'viewing_update', 'Viewing confirmed', 'Pasadena Craftsman Home · ' || to_char(pg_temp.next_sat(), 'Dy, Mon FMDD') || ' · 10:00 AM',
   pg_temp.sid('p', 'pasadena-craftsman-home'), pg_temp.sid('i', 'NST-INQ-20311'), pg_temp.sid('v', 'pasadena'), now() - interval '7 days', now() - interval '8 days');
