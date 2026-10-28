-- Inquiry and viewing workflow. Every write is a security-definer function that checks the caller,
-- validates the state transition and records the timeline in one transaction.
-- Errors are raised with a stable message key (errcode P0001) that the app maps to user-facing copy.

-- Viewing slots are in the listings' local time zone.
create function public._tz() returns text language sql immutable as $$ select 'America/Los_Angeles' $$;

create function public._viewing_minutes(p_type public.viewing_type) returns int language sql immutable as $$
  select case p_type when 'in_person' then 30 else 20 end
$$;

-- Stores a notification if the recipient has that kind switched on in Settings.
create function public._notify(p_user uuid, p_kind public.notification_kind, p_title text, p_body text,
  p_property uuid, p_inquiry uuid default null, p_viewing uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_on boolean;
begin
  select case p_kind
           when 'inquiry_reply' then pr.notify_inquiry_replies
           when 'inquiry_update' then pr.notify_inquiry_replies
           when 'viewing_update' then pr.notify_viewing_updates
           when 'viewing_reminder' then pr.notify_viewing_updates
           when 'price_update' then pr.notify_price_updates
         end
  into v_on from public.profiles pr where pr.id = p_user;
  if coalesce(v_on, false) then
    insert into public.notifications (user_id, kind, title, body, property_id, inquiry_id, viewing_id)
    values (p_user, p_kind, left(p_title, 120), left(p_body, 300), p_property, p_inquiry, p_viewing);
  end if;
end $$;

create function public._require_user() returns uuid language plpgsql stable set search_path = '' as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  return v;
end $$;

-- ───────────── Inquiries ─────────────

create function public.send_inquiry(p_property uuid, p_topics text[], p_full_name text, p_email text, p_phone text,
  p_message text, p_contact public.contact_method, p_key uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  v_id uuid;
  p public.properties;
begin
  select id into v_id from public.inquiries where user_id = v_user and idempotency_key = p_key;
  if v_id is not null then return v_id; end if; -- retry of a request that already succeeded

  select * into p from public.properties where id = p_property for share;
  if not found or p.status = 'draft' then raise exception 'listing_not_found' using errcode = 'P0001'; end if;
  if p.status not in ('available', 'coming_soon') then raise exception 'listing_unavailable' using errcode = 'P0001'; end if;
  if exists (select 1 from public.inquiries where user_id = v_user and property_id = p_property
             and status in ('awaiting_response', 'responded', 'viewing_scheduled')) then
    raise exception 'inquiry_exists' using errcode = 'P0001';
  end if;
  if p_contact = 'phone' and nullif(trim(p_phone), '') is null then raise exception 'phone_required' using errcode = 'P0001'; end if;

  insert into public.inquiries (user_id, property_id, agent_id, topics, full_name, email, phone, message, preferred_contact,
    property_title_snapshot, monthly_rent_snapshot, idempotency_key)
  values (v_user, p.id, p.agent_id, (select array_agg(distinct t order by t) from unnest(p_topics) t), trim(p_full_name),
    lower(trim(p_email)), nullif(trim(p_phone), ''), trim(p_message), p_contact, p.title, p.monthly_rent, p_key)
  returning id into v_id;
  insert into public.inquiry_events (inquiry_id, kind, actor) values (v_id, 'submitted', 'renter');
  return v_id;
end $$;

create function public.withdraw_inquiry(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  i public.inquiries;
begin
  select * into i from public.inquiries where id = p_id and user_id = v_user for update;
  if not found then raise exception 'inquiry_not_found' using errcode = 'P0001'; end if;
  if i.status in ('withdrawn', 'closed') then raise exception 'inquiry_closed' using errcode = 'P0001'; end if;
  -- A viewing booked through this inquiry is cancelled with it.
  update public.viewings set status = 'cancelled', cancelled_at = now(), cancelled_by = 'renter', cancel_reason = 'Inquiry withdrawn'
  where inquiry_id = i.id and status = 'confirmed';
  update public.inquiries set status = 'withdrawn' where id = i.id;
  insert into public.inquiry_events (inquiry_id, kind, actor) values (i.id, 'withdrawn', 'renter');
end $$;

create function public.add_inquiry_message(p_id uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  v_agent uuid := public.my_agent_id();
  i public.inquiries;
  v_actor text;
  v_name text;
begin
  if char_length(trim(coalesce(p_body, ''))) not between 2 and 1000 then raise exception 'message_length' using errcode = 'P0001'; end if;
  select * into i from public.inquiries where id = p_id for update;
  if not found then raise exception 'inquiry_not_found' using errcode = 'P0001'; end if;
  if i.user_id = v_user then v_actor := 'renter';
  elsif i.agent_id = v_agent then v_actor := 'agent';
  else raise exception 'inquiry_not_found' using errcode = 'P0001';
  end if;
  if i.status in ('withdrawn', 'closed') then raise exception 'inquiry_closed' using errcode = 'P0001'; end if;

  if v_actor = 'agent' and i.status = 'awaiting_response' then
    update public.inquiries set status = 'responded' where id = i.id;
    insert into public.inquiry_events (inquiry_id, kind, actor, body) values (i.id, 'responded', 'agent', trim(p_body));
  else
    insert into public.inquiry_events (inquiry_id, kind, actor, body) values (i.id, 'message', v_actor, trim(p_body));
    update public.inquiries set updated_at = now() where id = i.id;
  end if;

  if v_actor = 'agent' then
    select full_name into v_name from public.agents where id = i.agent_id;
    perform public._notify(i.user_id, 'inquiry_reply', v_name || ' replied', i.property_title_snapshot || ' · “' || left(trim(p_body), 120) || '”', i.property_id, i.id);
  end if;
end $$;

create function public.close_inquiry(p_id uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  i public.inquiries;
begin
  perform public._require_user();
  select * into i from public.inquiries where id = p_id and agent_id = public.my_agent_id() for update;
  if not found then raise exception 'inquiry_not_found' using errcode = 'P0001'; end if;
  if i.status in ('withdrawn', 'closed') then raise exception 'inquiry_closed' using errcode = 'P0001'; end if;
  update public.viewings set status = 'cancelled', cancelled_at = now(), cancelled_by = 'agent', cancel_reason = 'Inquiry closed'
  where inquiry_id = i.id and status = 'confirmed';
  update public.inquiries set status = 'closed' where id = i.id;
  insert into public.inquiry_events (inquiry_id, kind, actor, body) values (i.id, 'closed', 'agent', nullif(left(trim(coalesce(p_note, '')), 300), ''));
  perform public._notify(i.user_id, 'inquiry_update', 'Inquiry closed', i.property_title_snapshot || coalesce(' · ' || nullif(trim(p_note), ''), ''), i.property_id, i.id);
end $$;

-- ───────────── Viewing slots ─────────────

-- Bookable times for a listing's agent over `p_days` days from `p_from`. A day with no hours (or time off)
-- returns one row with slot = null and reason 'agent_unavailable'. Taken and too-soon slots are marked, not hidden.
create function public.viewing_slots(p_property uuid, p_from date, p_days int)
returns table (day date, slot time, starts_at timestamptz, available boolean, reason text)
language plpgsql stable security definer set search_path = '' as $$
declare v_agent uuid;
begin
  select pr.agent_id into v_agent from public.properties pr where pr.id = p_property and pr.status in ('available', 'coming_soon');
  if v_agent is null then raise exception 'listing_unavailable' using errcode = 'P0001'; end if;
  if p_days not between 1 and 14 then raise exception 'invalid_range' using errcode = 'P0001'; end if;

  return query
  with days as (select (p_from + g)::date as d from generate_series(0, p_days - 1) g),
  slots as (
    select d.d, h.start_time, ((d.d + h.start_time) at time zone public._tz()) as ts
    from days d
    join public.agent_hours h on h.agent_id = v_agent and h.weekday = extract(dow from d.d)
    where not exists (select 1 from public.agent_time_off o where o.agent_id = v_agent and o.day = d.d)
  )
  select s.d, s.start_time, s.ts,
         (s.ts >= now() + interval '2 hours' and s.ts <= now() + interval '60 days'
          and not exists (select 1 from public.viewings v where v.agent_id = v_agent and v.starts_at = s.ts and v.status = 'confirmed')),
         case when s.ts < now() + interval '2 hours' then 'too_soon'
              when s.ts > now() + interval '60 days' then 'too_far'
              when exists (select 1 from public.viewings v where v.agent_id = v_agent and v.starts_at = s.ts and v.status = 'confirmed') then 'booked'
         end
  from slots s
  union all
  select d.d, null::time, null::timestamptz, false, 'agent_unavailable'
  from days d
  where not exists (
    select 1 from public.agent_hours h where h.agent_id = v_agent and h.weekday = extract(dow from d.d)
      and not exists (select 1 from public.agent_time_off o where o.agent_id = v_agent and o.day = d.d))
  order by 1, 2;
end $$;

-- Raises unless `p_starts_at` is one of the agent's bookable start times (ignores the viewing being moved).
create function public._check_slot(p_agent uuid, p_starts_at timestamptz, p_ignore uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_local timestamp := p_starts_at at time zone public._tz();
begin
  if p_starts_at < now() + interval '2 hours' or p_starts_at > now() + interval '60 days' then
    raise exception 'slot_out_of_range' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.agent_hours h where h.agent_id = p_agent and h.weekday = extract(dow from v_local) and h.start_time = v_local::time)
     or exists (select 1 from public.agent_time_off o where o.agent_id = p_agent and o.day = v_local::date) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.viewings v where v.agent_id = p_agent and v.starts_at = p_starts_at
             and v.status = 'confirmed' and v.id is distinct from p_ignore) then
    raise exception 'slot_taken' using errcode = 'P0001';
  end if;
end $$;

-- ───────────── Viewings ─────────────

create function public.request_viewing(p_property uuid, p_type public.viewing_type, p_starts_at timestamptz, p_phone text,
  p_guests int, p_note text, p_key uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  v_id uuid;
  v_inquiry uuid;
  p public.properties;
begin
  select id into v_id from public.viewings where user_id = v_user and idempotency_key = p_key;
  if v_id is not null then return v_id; end if;

  select * into p from public.properties where id = p_property for share;
  if not found or p.status = 'draft' then raise exception 'listing_not_found' using errcode = 'P0001'; end if;
  if p.status not in ('available', 'coming_soon') then raise exception 'listing_unavailable' using errcode = 'P0001'; end if;
  if exists (select 1 from public.viewings where user_id = v_user and property_id = p.id and status = 'confirmed') then
    raise exception 'viewing_exists' using errcode = 'P0001';
  end if;
  -- Serialise bookings per agent so two requests for the same slot can't both pass the check.
  perform pg_advisory_xact_lock(hashtext('agent-slots:' || p.agent_id::text));
  perform public._check_slot(p.agent_id, p_starts_at, null);

  select id into v_inquiry from public.inquiries
  where user_id = v_user and property_id = p.id and status in ('awaiting_response', 'responded', 'viewing_scheduled');

  insert into public.viewings (user_id, property_id, agent_id, inquiry_id, viewing_type, starts_at, ends_at, phone, guests, note, idempotency_key)
  values (v_user, p.id, p.agent_id, v_inquiry, p_type, p_starts_at, p_starts_at + make_interval(mins => public._viewing_minutes(p_type)),
    trim(p_phone), p_guests, nullif(left(trim(coalesce(p_note, '')), 300), ''), p_key)
  returning id into v_id;

  if v_inquiry is not null then
    update public.inquiries set status = 'viewing_scheduled' where id = v_inquiry;
    insert into public.inquiry_events (inquiry_id, kind, actor, body)
    values (v_inquiry, 'viewing_scheduled', 'renter', to_char(p_starts_at at time zone public._tz(), 'Dy, Mon FMDD · FMHH12:MI AM'));
  end if;
  return v_id;
end $$;

create function public.reschedule_viewing(p_id uuid, p_starts_at timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  v public.viewings;
begin
  select * into v from public.viewings where id = p_id and user_id = v_user for update;
  if not found then raise exception 'viewing_not_found' using errcode = 'P0001'; end if;
  if v.status = 'cancelled' then raise exception 'viewing_cancelled' using errcode = 'P0001'; end if;
  if v.starts_at <= now() then raise exception 'viewing_past' using errcode = 'P0001'; end if;
  if v.starts_at = p_starts_at then raise exception 'same_time' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('agent-slots:' || v.agent_id::text));
  perform public._check_slot(v.agent_id, p_starts_at, v.id);
  update public.viewings
  set starts_at = p_starts_at, ends_at = p_starts_at + make_interval(mins => public._viewing_minutes(v.viewing_type)),
      reschedule_count = reschedule_count + 1
  where id = v.id;
end $$;

-- Renter or agent; only before the viewing starts.
create function public.cancel_viewing(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  v public.viewings;
  v_by text;
  v_title text;
  v_replied boolean;
begin
  select * into v from public.viewings where id = p_id for update;
  if not found then raise exception 'viewing_not_found' using errcode = 'P0001'; end if;
  if v.user_id = v_user then v_by := 'renter';
  elsif v.agent_id = public.my_agent_id() then v_by := 'agent';
  else raise exception 'viewing_not_found' using errcode = 'P0001';
  end if;
  if v.status = 'cancelled' then raise exception 'viewing_cancelled' using errcode = 'P0001'; end if;
  if v.starts_at <= now() then raise exception 'viewing_past' using errcode = 'P0001'; end if;

  update public.viewings set status = 'cancelled', cancelled_at = now(), cancelled_by = v_by,
    cancel_reason = nullif(left(trim(coalesce(p_reason, '')), 300), '')
  where id = v.id;

  if v.inquiry_id is not null then
    select exists (select 1 from public.inquiry_events e where e.inquiry_id = v.inquiry_id and e.actor = 'agent') into v_replied;
    update public.inquiries set status = case when v_replied then 'responded'::public.inquiry_status else 'awaiting_response' end
    where id = v.inquiry_id and status = 'viewing_scheduled';
    insert into public.inquiry_events (inquiry_id, kind, actor) values (v.inquiry_id, 'viewing_cancelled', v_by);
  end if;

  if v_by = 'agent' then
    select title into v_title from public.properties where id = v.property_id;
    perform public._notify(v.user_id, 'viewing_update', 'Viewing cancelled', v_title || ' · ' ||
      to_char(v.starts_at at time zone public._tz(), 'Dy, Mon FMDD · FMHH12:MI AM') || coalesce(' · ' || nullif(trim(p_reason), ''), ''), v.property_id, v.inquiry_id, v.id);
  end if;
end $$;

-- ───────────── Price changes ─────────────

-- When a public listing's rent changes, people who saved it are told (if they opted in).
create function public.notify_price_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if new.monthly_rent is distinct from old.monthly_rent and new.status in ('available', 'coming_soon') then
    for r in select f.user_id from public.favorites f where f.property_id = new.id loop
      perform public._notify(r.user_id, 'price_update', 'Price update on a saved home',
        new.title || ' is now listed at $' || to_char(new.monthly_rent, 'FM999,999,990') || ' / month', new.id);
    end loop;
  end if;
  return new;
end $$;
create trigger properties_price_change after update of monthly_rent on public.properties
  for each row execute function public.notify_price_change();

-- ───────────── Privileges ─────────────

revoke execute on function public._notify(uuid, public.notification_kind, text, text, uuid, uuid, uuid), public._check_slot(uuid, timestamptz, uuid),
  public._require_user(), public.notify_price_change(), public.handle_new_user(), public.compare_limit(), public.recent_searches_trim()
  from public, anon, authenticated;
revoke execute on function public.send_inquiry(uuid, text[], text, text, text, text, public.contact_method, uuid), public.withdraw_inquiry(uuid),
  public.add_inquiry_message(uuid, text), public.close_inquiry(uuid, text), public.request_viewing(uuid, public.viewing_type, timestamptz, text, int, text, uuid),
  public.reschedule_viewing(uuid, timestamptz), public.cancel_viewing(uuid, text), public.viewing_slots(uuid, date, int)
  from public, anon;
grant execute on function public.send_inquiry(uuid, text[], text, text, text, text, public.contact_method, uuid), public.withdraw_inquiry(uuid),
  public.add_inquiry_message(uuid, text), public.close_inquiry(uuid, text), public.request_viewing(uuid, public.viewing_type, timestamptz, text, int, text, uuid),
  public.reschedule_viewing(uuid, timestamptz), public.cancel_viewing(uuid, text), public.viewing_slots(uuid, date, int)
  to authenticated;
grant execute on function public.viewing_slots(uuid, date, int) to anon;
