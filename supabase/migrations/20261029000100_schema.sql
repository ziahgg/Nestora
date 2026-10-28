-- Nestora — long-term residential rentals (monthly rent). Renters browse public listings, save and
-- compare homes, send inquiries to the listing agent and request viewings. Agents (accounts linked
-- through agents.user_id) answer inquiries and confirm viewings. Listings are managed in SQL/seed;
-- there is no listing editor in the app.
--
-- Money is numeric(10,2) USD. Unknown rental terms are NULL and shown as "Not specified".

create type public.property_type as enum ('apartment', 'house', 'studio', 'townhouse');
-- draft: hidden from the public. leased: still readable (saved homes, old inquiries) but not contactable.
create type public.listing_status as enum ('draft', 'available', 'coming_soon', 'leased');
create type public.furnishing as enum ('furnished', 'partly_furnished', 'unfurnished');
create type public.pets_policy as enum ('none', 'cats', 'dogs', 'cats_and_dogs');
create type public.contact_method as enum ('email', 'phone');
create type public.inquiry_status as enum ('awaiting_response', 'responded', 'viewing_scheduled', 'withdrawn', 'closed');
create type public.viewing_type as enum ('in_person', 'video');
-- Viewings are booked instantly against the agent's published slots (no separate request step).
create type public.viewing_status as enum ('confirmed', 'cancelled');
create type public.notification_kind as enum ('inquiry_reply', 'inquiry_update', 'viewing_update', 'viewing_reminder', 'price_update');

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ───────────── People ─────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  -- Contact email shared with agents (prefilled from the sign-in email; changing it doesn't change sign-in).
  contact_email text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 200),
  preferred_move_in date,
  preferred_contact public.contact_method not null default 'email',
  share_phone boolean not null default true,
  notify_inquiry_replies boolean not null default true,
  notify_viewing_updates boolean not null default true,
  notify_price_updates boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  title text not null default 'Listing agent',
  agency text not null,
  phone text not null,
  email text not null,
  verified boolean not null default false,
  reply_hint text not null default 'Usually replies within a day',
  created_at timestamptz not null default now()
);

-- Weekly viewing slots (local time, America/Los_Angeles). One row per bookable start time.
create table public.agent_hours (
  agent_id uuid not null references public.agents (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday (extract(dow))
  start_time time not null,
  primary key (agent_id, weekday, start_time)
);

create table public.agent_time_off (
  agent_id uuid not null references public.agents (id) on delete cascade,
  day date not null,
  primary key (agent_id, day)
);

-- ───────────── Catalog ─────────────

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  city text not null,
  sort_order smallint not null default 0
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  agent_id uuid not null references public.agents (id) on delete restrict,
  neighborhood_id uuid not null references public.neighborhoods (id) on delete restrict,
  title text not null check (char_length(title) between 3 and 80),
  description text not null default '',
  property_type public.property_type not null,
  status public.listing_status not null default 'draft',
  address_line text not null,
  city text not null,
  region text not null default 'CA',
  postal_code text not null,
  bedrooms smallint not null check (bedrooms between 0 and 20), -- 0 = studio
  bathrooms numeric(3, 1) not null check (bathrooms > 0 and bathrooms <= 20),
  area_sqft integer check (area_sqft is null or area_sqft between 100 and 50000),
  parking smallint check (parking is null or parking between 0 and 20),
  monthly_rent numeric(10, 2) not null check (monthly_rent > 0),
  currency char(3) not null default 'USD' check (currency = 'USD'),
  security_deposit numeric(10, 2) check (security_deposit is null or security_deposit >= 0),
  pets public.pets_policy,
  pet_deposit numeric(10, 2) check (pet_deposit is null or pet_deposit >= 0),
  lease_months smallint check (lease_months is null or lease_months between 1 and 60),
  furnishing public.furnishing,
  utilities text check (utilities is null or char_length(utilities) <= 120),
  available_from date,
  featured boolean not null default false,
  -- Position on the illustrative map (percent of width / height). Not a real coordinate.
  map_x numeric(5, 2) not null default 50 check (map_x between 0 and 100),
  map_y numeric(5, 2) not null default 50 check (map_y between 0 and 100),
  -- Lower-cased title, address, neighborhood, city and ZIP — maintained by trigger for keyword search.
  search_text text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index properties_status_idx on public.properties (status, featured desc, published_at desc);
create index properties_rent_idx on public.properties (monthly_rent);
create index properties_type_idx on public.properties (property_type);
create index properties_neighborhood_idx on public.properties (neighborhood_id);
create index properties_agent_idx on public.properties (agent_id);
create trigger properties_touch before update on public.properties for each row execute function public.touch_updated_at();

create function public.properties_search_text() returns trigger language plpgsql set search_path = '' as $$
begin
  new.search_text := lower(concat_ws(' ', new.title, new.address_line, new.city, new.postal_code,
    (select n.name from public.neighborhoods n where n.id = new.neighborhood_id), new.property_type::text));
  return new;
end $$;
create trigger properties_search before insert or update of title, address_line, city, postal_code, neighborhood_id, property_type
  on public.properties for each row execute function public.properties_search_text();

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  -- File name under /public/sample (development content). Not a user upload.
  image_key text not null check (image_key ~ '^[a-z0-9-]+$'),
  alt text not null,
  caption text,
  sort_order smallint not null default 0,
  unique (property_id, sort_order)
);

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null -- lucide icon name used by the UI
);

create table public.property_amenities (
  property_id uuid not null references public.properties (id) on delete cascade,
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  primary key (property_id, amenity_id)
);
create index property_amenities_amenity_idx on public.property_amenities (amenity_id);

-- ───────────── Renter lists ─────────────

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);
create index favorites_property_idx on public.favorites (property_id);

create table public.compare_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

-- At most three homes in compare (checked under a per-user advisory lock so parallel adds can't exceed it).
create function public.compare_limit() returns trigger language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('compare:' || new.user_id::text));
  if (select count(*) from public.compare_items c where c.user_id = new.user_id) >= 3 then
    raise exception 'compare_full' using errcode = 'P0001', hint = 'Compare holds up to 3 homes.';
  end if;
  return new;
end $$;
create trigger compare_items_limit before insert on public.compare_items for each row execute function public.compare_limit();

create table public.recently_viewed (
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, property_id)
);
create index recently_viewed_user_idx on public.recently_viewed (user_id, viewed_at desc);

create table public.recent_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  detail text not null default '' check (char_length(detail) <= 120),
  -- The results URL query string (validated again whenever it's opened).
  params text not null check (char_length(params) <= 400),
  created_at timestamptz not null default now(),
  unique (user_id, params)
);
create index recent_searches_user_idx on public.recent_searches (user_id, created_at desc);

-- Keep the ten newest searches per user.
create function public.recent_searches_trim() returns trigger language plpgsql set search_path = '' as $$
begin
  delete from public.recent_searches r
  where r.user_id = new.user_id
    and r.id in (select id from public.recent_searches where user_id = new.user_id order by created_at desc offset 10);
  return null;
end $$;
create trigger recent_searches_trim after insert or update on public.recent_searches for each row execute function public.recent_searches_trim();

-- ───────────── Inquiries and viewings ─────────────

create sequence public.inquiry_ref_seq start 20500;
create sequence public.viewing_ref_seq start 3200;

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('NST-INQ-' || nextval('public.inquiry_ref_seq')),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete restrict,
  agent_id uuid not null references public.agents (id) on delete restrict,
  topics text[] not null check (cardinality(topics) between 1 and 4 and topics <@ array['availability', 'viewing', 'pets_deposit', 'other']),
  full_name text not null check (char_length(full_name) between 1 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  message text not null check (char_length(message) between 20 and 500),
  preferred_contact public.contact_method not null,
  status public.inquiry_status not null default 'awaiting_response',
  -- What the renter saw when they asked (the listing may change later).
  property_title_snapshot text not null,
  monthly_rent_snapshot numeric(10, 2) not null,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index inquiries_user_idx on public.inquiries (user_id, created_at desc);
create index inquiries_agent_idx on public.inquiries (agent_id, created_at desc);
-- One open inquiry per renter and home.
create unique index inquiries_one_open on public.inquiries (user_id, property_id) where status in ('awaiting_response', 'responded', 'viewing_scheduled');
create trigger inquiries_touch before update on public.inquiries for each row execute function public.touch_updated_at();

-- Timeline and conversation. kind: submitted | responded | message | viewing_scheduled | viewing_cancelled | withdrawn | closed
create table public.inquiry_events (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  kind text not null check (kind in ('submitted', 'responded', 'message', 'viewing_scheduled', 'viewing_cancelled', 'withdrawn', 'closed')),
  actor text not null check (actor in ('renter', 'agent', 'system')),
  body text check (body is null or char_length(body) <= 1000),
  created_at timestamptz not null default now()
);
create index inquiry_events_inquiry_idx on public.inquiry_events (inquiry_id, created_at);

create table public.viewings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('NST-VW-' || nextval('public.viewing_ref_seq')),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete restrict,
  agent_id uuid not null references public.agents (id) on delete restrict,
  inquiry_id uuid references public.inquiries (id) on delete set null,
  viewing_type public.viewing_type not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.viewing_status not null default 'confirmed',
  phone text not null check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  guests smallint not null default 1 check (guests between 1 and 6),
  note text check (note is null or char_length(note) <= 300),
  reschedule_count smallint not null default 0,
  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by is null or cancelled_by in ('renter', 'agent')),
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 300),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  unique (user_id, idempotency_key)
);
create index viewings_user_idx on public.viewings (user_id, starts_at);
create index viewings_agent_idx on public.viewings (agent_id, starts_at);
-- An agent can't hold two active viewings at the same start time; a renter has one active viewing per home.
create unique index viewings_agent_slot on public.viewings (agent_id, starts_at) where status = 'confirmed';
create unique index viewings_one_active on public.viewings (user_id, property_id) where status = 'confirmed';
create trigger viewings_touch before update on public.viewings for each row execute function public.touch_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text not null,
  property_id uuid references public.properties (id) on delete set null,
  inquiry_id uuid references public.inquiries (id) on delete set null,
  viewing_id uuid references public.viewings (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ───────────── Helpers ─────────────

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, contact_email)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'display_name', 80), ''), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- The agent record linked to the signed-in user, if any.
create function public.my_agent_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select a.id from public.agents a where a.user_id = auth.uid()
$$;

-- ───────────── Row Level Security ─────────────

alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.agent_hours enable row level security;
alter table public.agent_time_off enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.amenities enable row level security;
alter table public.property_amenities enable row level security;
alter table public.favorites enable row level security;
alter table public.compare_items enable row level security;
alter table public.recently_viewed enable row level security;
alter table public.recent_searches enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_events enable row level security;
alter table public.viewings enable row level security;
alter table public.notifications enable row level security;

create policy "profiles: own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles: update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Public reference data.
create policy "agents: public" on public.agents for select to anon, authenticated using (true);
create policy "agent_hours: public" on public.agent_hours for select to anon, authenticated using (true);
create policy "agent_time_off: public" on public.agent_time_off for select to anon, authenticated using (true);
create policy "neighborhoods: public" on public.neighborhoods for select to anon, authenticated using (true);
create policy "amenities: public" on public.amenities for select to anon, authenticated using (true);

-- Listings: everything except drafts; an agent also sees their own drafts.
create policy "properties: published or own" on public.properties for select to anon, authenticated
  using (status <> 'draft' or agent_id = public.my_agent_id());
create policy "property_images: via listing" on public.property_images for select to anon, authenticated
  using (exists (select 1 from public.properties p where p.id = property_id));
create policy "property_amenities: via listing" on public.property_amenities for select to anon, authenticated
  using (exists (select 1 from public.properties p where p.id = property_id));

-- Renter lists: own rows only, and only for homes the user can see.
create policy "favorites: own" on public.favorites for select to authenticated using (user_id = auth.uid());
create policy "favorites: add own" on public.favorites for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.properties p where p.id = property_id));
create policy "favorites: remove own" on public.favorites for delete to authenticated using (user_id = auth.uid());

create policy "compare: own" on public.compare_items for select to authenticated using (user_id = auth.uid());
create policy "compare: add own" on public.compare_items for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.properties p where p.id = property_id));
create policy "compare: remove own" on public.compare_items for delete to authenticated using (user_id = auth.uid());

create policy "recently_viewed: own" on public.recently_viewed for select to authenticated using (user_id = auth.uid());
create policy "recently_viewed: add own" on public.recently_viewed for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.properties p where p.id = property_id));
create policy "recently_viewed: touch own" on public.recently_viewed for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recently_viewed: clear own" on public.recently_viewed for delete to authenticated using (user_id = auth.uid());

create policy "recent_searches: own" on public.recent_searches for select to authenticated using (user_id = auth.uid());
create policy "recent_searches: add own" on public.recent_searches for insert to authenticated with check (user_id = auth.uid());
create policy "recent_searches: touch own" on public.recent_searches for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recent_searches: clear own" on public.recent_searches for delete to authenticated using (user_id = auth.uid());

-- Inquiries and viewings: the renter who made them and the listing agent. Writes go through functions.
create policy "inquiries: renter or agent" on public.inquiries for select to authenticated
  using (user_id = auth.uid() or agent_id = public.my_agent_id());
create policy "inquiry_events: via inquiry" on public.inquiry_events for select to authenticated
  using (exists (select 1 from public.inquiries i where i.id = inquiry_id));
create policy "viewings: renter or agent" on public.viewings for select to authenticated
  using (user_id = auth.uid() or agent_id = public.my_agent_id());

create policy "notifications: own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications: mark own read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Column-level privileges on top of RLS.
revoke insert, update, delete on public.agents, public.agent_hours, public.agent_time_off, public.neighborhoods,
  public.properties, public.property_images, public.amenities, public.property_amenities from anon, authenticated;
revoke all on public.profiles, public.favorites, public.compare_items, public.recently_viewed, public.recent_searches,
  public.inquiries, public.inquiry_events, public.viewings, public.notifications from anon;
revoke insert, update, delete on public.inquiries, public.inquiry_events, public.viewings from authenticated;
revoke insert, delete, update on public.profiles from authenticated;
grant update (full_name, contact_email, phone, avatar_path, preferred_move_in, preferred_contact, share_phone,
  notify_inquiry_replies, notify_viewing_updates, notify_price_updates) on public.profiles to authenticated;
revoke insert, delete, update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke update on public.recently_viewed, public.recent_searches from authenticated;
-- Upserts re-send the key columns; RLS (with check user_id = auth.uid()) keeps rows owned by the caller.
grant update (user_id, property_id, viewed_at) on public.recently_viewed to authenticated;
grant update (user_id, params, created_at, label, detail) on public.recent_searches to authenticated;
-- The agent's account id isn't needed by the browser.
revoke select on public.agents from anon, authenticated;
grant select (id, full_name, title, agency, phone, email, verified, reply_hint, created_at) on public.agents to anon, authenticated;
revoke execute on function public.my_agent_id() from public;
grant execute on function public.my_agent_id() to anon, authenticated;
