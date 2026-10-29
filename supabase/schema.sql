-- Raajje Stay database (Supabase / Postgres 15)
-- Run once in the Supabase SQL editor, then run seed.sql.
-- Prices are always computed here, never trusted from the browser.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  role text not null default 'guest' check (role in ('guest', 'partner', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists properties (
  id text primary key,
  name text not null,
  type text not null check (type in ('guesthouse', 'resort', 'hotel', 'apartment')),
  island text not null,
  rooms_total int not null check (rooms_total > 0),
  rating numeric(3,1) default 0,
  reviews int default 0,
  tourist boolean not null default true,
  route text,
  seed int default 1,
  blurb text not null default '',
  amenities text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'live', 'suspended', 'declined')),
  owner uuid references auth.users,
  contact text,
  created_at timestamptz not null default now()
);

create table if not exists room_types (
  id bigint generated always as identity primary key,
  property_id text not null references properties on delete cascade,
  idx int not null,
  name text not null,
  beds text default '',
  sleeps int not null default 2,
  size int default 0,
  local_rate numeric(10,2) not null check (local_rate > 0),
  intl_rate numeric(10,2) check (intl_rate > 0),
  units int not null default 1 check (units >= 0),
  unique (property_id, idx)
);

create table if not exists blocks (
  property_id text not null references properties on delete cascade,
  room_idx int not null,
  day date not null,
  primary key (property_id, room_idx, day)
);

create table if not exists transfer_options (
  route text not null,
  idx int not null,
  mode text not null,
  origin text not null,
  mins int not null,
  times text[] not null,
  days text not null,
  local_fare numeric(10,2) not null,
  intl_fare numeric(10,2) not null,
  via text,
  primary key (route, idx)
);

create table if not exists operators (
  id text primary key,
  name text not null,
  mode text not null,
  routes text,
  phone text,
  active boolean not null default true
);

create table if not exists settings (
  key text primary key,
  value jsonb not null
);

create table if not exists bookings (
  ref text primary key,
  kind text not null check (kind in ('stay', 'transfer')),
  user_id uuid not null references auth.users,
  property_id text references properties,
  room_idx int,
  room_name text,
  rooms int not null default 1,
  check_in date not null,
  check_out date,
  nights int,
  adults int not null,
  children int not null default 0,
  infants int not null default 0,
  resident boolean not null,
  currency text not null,
  pay_now numeric(12,2) not null,
  green numeric(12,2) not null default 0,
  pay_method text not null check (pay_method in ('card', 'transfer', 'property')),
  guest_name text not null,
  phone text,
  email text,
  id_doc text,          -- ID card, work permit or passport number; visible to the guest, the property and admins only
  nationality text,
  note text,
  transfer jsonb,
  status text not null check (status in ('awaiting_payment', 'slip_review', 'confirmed', 'checked_in', 'checked_out', 'no_show', 'cancelled', 'refunded')),
  slip_path text,
  payment jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bookings_property_dates on bookings (property_id, check_in, check_out);
create index if not exists bookings_user on bookings (user_id);

-- ---------------------------------------------------------------- helpers
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create or replace function owns_property(p text) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from properties where id = p and owner = auth.uid()) $$;

-- new auth user -> profile row
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email, new.phone)) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- only admins may change a property's status or owner
create or replace function guard_property() returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the SQL editor and server functions, which may change anything
  if auth.uid() is not null and not is_admin() and (new.status is distinct from old.status or new.owner is distinct from old.owner) then
    raise exception 'Only admins can change listing status or owner';
  end if;
  return new;
end $$;
drop trigger if exists guard_property on properties;
create trigger guard_property before update on properties for each row execute function guard_property();

-- guests can rename themselves but never promote themselves
create or replace function guard_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not is_admin()
     and coalesce(current_setting('rs.allow_role_change', true), '') <> 'on' then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile on profiles;
create trigger guard_profile before update on profiles for each row execute function guard_profile();

create or replace function tax() returns jsonb language sql stable as $$
  select coalesce((select value from settings where key = 'tax'),
    '{"service":10,"tgst":17,"gst":8,"greenHigh":12,"greenLow":6,"greenRoomLimit":50}'::jsonb)
$$;

-- same rules as js/pricing.js
create or replace function rs_quote(p_property text, p_room_idx int, p_in date, p_out date, p_adults int, p_children int, p_rooms int, p_resident boolean,
  out pay_now numeric, out green numeric, out nights int, out room_name text)
language plpgsql stable security definer set search_path = public as $$
declare pr properties; rt room_types; s jsonb := tax(); price numeric; base numeric; svc numeric := 0; t numeric; rate numeric;
begin
  select * into pr from properties where id = p_property and status = 'live';
  if not found then raise exception 'Property not available'; end if;
  select * into rt from room_types where property_id = p_property and idx = p_room_idx;
  if not found then raise exception 'Room type not found'; end if;
  price := case when p_resident then rt.local_rate else rt.intl_rate end;
  if price is null then raise exception 'This room is for residents only'; end if;
  if not p_resident and not pr.tourist then raise exception 'This property is for residents only'; end if;
  nights := greatest(1, p_out - p_in);
  base := round(price * nights * p_rooms, 2);
  if pr.tourist then
    svc := round(base * (s->>'service')::numeric / 100, 2);
    t := round((base + svc) * (s->>'tgst')::numeric / 100, 2);
  else
    t := round(base * (s->>'gst')::numeric / 100, 2);
  end if;
  pay_now := base + svc + t;
  green := 0;
  if pr.tourist and not p_resident then
    rate := case when pr.type in ('guesthouse', 'apartment') and pr.rooms_total <= (s->>'greenRoomLimit')::int then (s->>'greenLow')::numeric else (s->>'greenHigh')::numeric end;
    green := rate * (p_adults + p_children) * nights;
  end if;
  room_name := rt.name;
end $$;

create or replace function rooms_left(p_property text, p_room_idx int, p_in date, p_out date) returns int
language plpgsql stable security definer set search_path = public as $$
declare units int; d date; used int; worst int;
begin
  select rt.units into units from room_types rt where rt.property_id = p_property and rt.idx = p_room_idx;
  if units is null then return 0; end if;
  worst := units; d := p_in;
  while d < p_out loop
    if exists (select 1 from blocks where property_id = p_property and room_idx = p_room_idx and day = d) then return 0; end if;
    select coalesce(sum(rooms), 0) into used from bookings
      where property_id = p_property and room_idx = p_room_idx and status in ('awaiting_payment', 'slip_review', 'confirmed', 'checked_in')
        and check_in <= d and d < check_out;
    worst := least(worst, units - used);
    d := d + 1;
  end loop;
  return greatest(0, worst);
end $$;

create or replace function new_ref() returns text language sql volatile as $$
  select 'RS-' || string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6)
$$;

-- ---------------------------------------------------------------- guest RPCs
create or replace function create_booking(
  p_property text, p_room_idx int, p_rooms int, p_in date, p_out date, p_adults int, p_children int, p_infants int, p_resident boolean,
  p_pay_method text, p_guest_name text, p_phone text, p_email text, p_id_doc text, p_nationality text, p_note text, p_transfer jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare q record; ref text; opt transfer_options; tr jsonb := null; tr_cost numeric := 0; pr properties;
begin
  if auth.uid() is null then raise exception 'Sign in to book'; end if;
  if p_in < current_date or p_out <= p_in then raise exception 'Check the dates'; end if;
  if p_rooms < 1 or p_rooms > 4 or p_adults < 1 then raise exception 'Check the number of rooms and guests'; end if;
  if p_pay_method = 'transfer' and not p_resident then raise exception 'Bank transfer is for residents only'; end if;
  -- lock the room type so two people can't take the last room at once
  perform 1 from room_types where property_id = p_property and idx = p_room_idx for update;
  if rooms_left(p_property, p_room_idx, p_in, p_out) < p_rooms then raise exception 'sold_out'; end if;
  select * into q from rs_quote(p_property, p_room_idx, p_in, p_out, p_adults, p_children, p_rooms, p_resident);
  select * into pr from properties where id = p_property;
  if p_transfer is not null then
    select * into opt from transfer_options where route = pr.route and idx = (p_transfer->>'option')::int;
    if found then
      tr_cost := (case when p_resident then opt.local_fare else opt.intl_fare end) * (p_adults + p_children);
      tr := jsonb_build_object('mode', opt.mode, 'from', opt.origin, 'mins', opt.mins, 'time', coalesce(p_transfer->>'time', opt.times[1]), 'cost', tr_cost, 'option', opt.idx);
    end if;
  end if;
  ref := new_ref();
  insert into bookings (ref, kind, user_id, property_id, room_idx, room_name, rooms, check_in, check_out, nights, adults, children, infants, resident,
    currency, pay_now, green, pay_method, guest_name, phone, email, id_doc, nationality, note, transfer, status)
  values (ref, 'stay', auth.uid(), p_property, p_room_idx, q.room_name, p_rooms, p_in, p_out, q.nights, p_adults, p_children, p_infants, p_resident,
    case when p_resident then 'MVR' else 'USD' end, q.pay_now + tr_cost, q.green, p_pay_method, p_guest_name, p_phone, p_email, p_id_doc, p_nationality, p_note, tr,
    case when p_pay_method = 'property' then 'confirmed' else 'awaiting_payment' end);
  return ref;
end $$;

create or replace function create_transfer(p_to text, p_option int, p_date date, p_time text, p_adults int, p_children int, p_infants int, p_resident boolean, p_guest_name text, p_phone text)
returns text language plpgsql security definer set search_path = public as $$
declare opt transfer_options; ref text;
begin
  if auth.uid() is null then raise exception 'Sign in to book'; end if;
  if p_date < current_date then raise exception 'Choose a future date'; end if;
  select * into opt from transfer_options where route = p_to and idx = p_option;
  if not found then raise exception 'Transfer not found'; end if;
  ref := new_ref();
  insert into bookings (ref, kind, user_id, check_in, adults, children, infants, resident, currency, pay_now, pay_method, guest_name, phone, transfer, status)
  values (ref, 'transfer', auth.uid(), p_date, p_adults, p_children, p_infants, p_resident, case when p_resident then 'MVR' else 'USD' end,
    (case when p_resident then opt.local_fare else opt.intl_fare end) * (p_adults + p_children), 'card', p_guest_name, p_phone,
    jsonb_build_object('to', p_to, 'mode', opt.mode, 'from', opt.origin, 'time', p_time, 'mins', opt.mins), 'awaiting_payment');
  return ref;
end $$;

create or replace function cancel_booking(p_ref text) returns void language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where ref = p_ref;
  if not found then raise exception 'Booking not found'; end if;
  if not (b.user_id = auth.uid() or owns_property(b.property_id) or is_admin()) then raise exception 'Not allowed'; end if;
  if b.status not in ('awaiting_payment', 'slip_review', 'confirmed') then raise exception 'This booking can no longer be cancelled'; end if;
  update bookings set status = 'cancelled' where ref = p_ref;
end $$;

create or replace function submit_slip(p_ref text, p_path text) returns void language plpgsql security definer set search_path = public as $$
begin
  update bookings set slip_path = p_path, status = 'slip_review'
   where ref = p_ref and user_id = auth.uid() and status = 'awaiting_payment' and pay_method = 'transfer';
  if not found then raise exception 'Booking not waiting for a slip'; end if;
end $$;

-- ---------------------------------------------------------------- property RPCs
create or replace function set_booking_status(p_ref text, p_status text) returns void language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where ref = p_ref;
  if not found or not (owns_property(b.property_id) or is_admin()) then raise exception 'Not allowed'; end if;
  if not ((b.status = 'confirmed' and p_status in ('checked_in', 'no_show'))
       or (b.status = 'checked_in' and p_status = 'checked_out')) then
    raise exception 'Can''t move a % booking to %', b.status, p_status;
  end if;
  update bookings set status = p_status where ref = p_ref;
end $$;

create or replace function review_slip(p_ref text, p_accept boolean) returns void language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where ref = p_ref;
  if not found or not (owns_property(b.property_id) or is_admin()) or b.status <> 'slip_review' then raise exception 'Not allowed'; end if;
  update bookings set status = case when p_accept then 'confirmed' else 'awaiting_payment' end,
    payment = coalesce(payment, '{}'::jsonb) || jsonb_build_object('slip_reviewed', now(), 'slip_accepted', p_accept)
   where ref = p_ref;
end $$;

create or replace function apply_property(p jsonb) returns text language plpgsql security definer set search_path = public as $$
declare pid text;
begin
  if auth.uid() is null then raise exception 'Sign in to apply'; end if;
  pid := regexp_replace(lower(p->>'name'), '[^a-z0-9]+', '-', 'g') || '-' || floor(random() * 900 + 100)::int;
  insert into properties (id, name, type, island, rooms_total, tourist, route, seed, blurb, amenities, status, owner, contact)
  values (pid, p->>'name', p->>'type', p->>'island', (p->>'roomsTotal')::int, (p->>'tourist')::boolean, p->>'island', floor(random() * 400 + 200)::int,
    p->>'blurb', array(select jsonb_array_elements_text(p->'amenities')), 'pending', auth.uid(), (p->>'contactName') || ' · ' || (p->>'contactPhone'));
  insert into room_types (property_id, idx, name, sleeps, local_rate, intl_rate, units)
  values (pid, 0, p->>'roomName', (p->>'sleeps')::int, (p->>'local')::numeric, nullif(p->>'intl', '')::numeric, (p->>'roomsTotal')::int);
  perform set_config('rs.allow_role_change', 'on', true);  -- applying makes you a partner, nothing more
  update profiles set role = 'partner' where id = auth.uid() and role = 'guest';
  perform set_config('rs.allow_role_change', '', true);
  return pid;
end $$;

-- ---------------------------------------------------------------- row level security
alter table profiles enable row level security;
alter table properties enable row level security;
alter table room_types enable row level security;
alter table blocks enable row level security;
alter table bookings enable row level security;
alter table settings enable row level security;
alter table operators enable row level security;
alter table transfer_options enable row level security;

create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "edit own name" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "admins manage profiles" on profiles for update using (is_admin());

create policy "see live or own" on properties for select using (status = 'live' or owner = auth.uid() or is_admin());
create policy "owner or admin edits" on properties for update using (owner = auth.uid() or is_admin());

create policy "see rooms" on room_types for select using (exists (select 1 from properties p where p.id = property_id and (p.status = 'live' or p.owner = auth.uid())) or is_admin());
create policy "owner edits rooms" on room_types for update using (owns_property(property_id) or is_admin());
create policy "owner adds rooms" on room_types for insert with check (owns_property(property_id) or is_admin());

create policy "owner sees blocks" on blocks for select using (owns_property(property_id) or is_admin());
create policy "owner adds blocks" on blocks for insert with check (owns_property(property_id) or is_admin());
create policy "owner removes blocks" on blocks for delete using (owns_property(property_id) or is_admin());

create policy "guest, property or admin" on bookings for select using (user_id = auth.uid() or owns_property(property_id) or is_admin());
-- no insert/update policies: all writes go through the functions above

create policy "anyone reads settings" on settings for select using (true);
create policy "admins write settings" on settings for all using (is_admin()) with check (is_admin());
create policy "anyone reads operators" on operators for select using (true);
create policy "admins manage operators" on operators for all using (is_admin()) with check (is_admin());
create policy "anyone reads transfers" on transfer_options for select using (true);
create policy "admins manage transfers" on transfer_options for all using (is_admin()) with check (is_admin());

grant execute on function rooms_left, rs_quote to anon, authenticated;
grant execute on function create_booking, create_transfer, cancel_booking, submit_slip, set_booking_status, review_slip, apply_property to authenticated;

-- ---------------------------------------------------------------- bank slip storage
insert into storage.buckets (id, name, public) values ('slips', 'slips', false) on conflict do nothing;
create policy "guest uploads slip for own booking" on storage.objects for insert to authenticated
  with check (bucket_id = 'slips' and exists (select 1 from bookings b where b.ref = (storage.foldername(name))[1] and b.user_id = auth.uid()));
create policy "guest, property or admin reads slip" on storage.objects for select to authenticated
  using (bucket_id = 'slips' and exists (select 1 from bookings b where b.ref = (storage.foldername(name))[1] and (b.user_id = auth.uid() or owns_property(b.property_id) or is_admin())));
