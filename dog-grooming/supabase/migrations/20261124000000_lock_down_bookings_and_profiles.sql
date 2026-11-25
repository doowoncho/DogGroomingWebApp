-- Lock down direct database access and fix the booking overlap constraint.
--
-- APPLY ONLY AFTER the app code that uses the service-role key for
-- GET /api/availability and POST /api/bookings is deployed; otherwise the
-- booking page can no longer read availability or create bookings.

begin;

-- ─── Bookings: no direct public access ─────────────────────────────────────
-- The server routes use the service-role key. Signed-in users keep the
-- "Enable users to view their own data only" SELECT policy for their account page.
drop policy if exists "Anyone can read time and slots for availability" on public.bookings;
drop policy if exists "Allow public insert access on bookings" on public.bookings;
revoke all on public.bookings from anon;
revoke insert, update, delete, truncate on public.bookings from authenticated;

-- ─── Profiles: nobody can grant themselves admin ───────────────────────────
-- Profiles are created by POST /api/account with the service-role key.
drop policy if exists "Users can insert their own profile" on public.profiles;
revoke all on public.profiles from anon;
revoke insert, update, delete, truncate on public.profiles from authenticated;
update public.profiles set is_admin = false where is_admin is null;
alter table public.profiles alter column is_admin set default false;
alter table public.profiles alter column is_admin set not null;
alter table public.profiles add constraint profiles_user_id_key unique (user_id);

-- ─── Catalog: read-only to the public (writes go through /api/admin) ───────
revoke insert, update, delete, truncate on public.services, public.styles from anon, authenticated;

-- ─── Storage: no anonymous uploads (photo upload feature is disabled) ──────
drop policy if exists "any user can upload photos" on storage.objects;

-- ─── Overlap constraint: real duration, only active bookings hold a slot ───
-- Previously every booking was treated as 3 hours long, and declined bookings
-- still blocked their time.
alter table public.bookings add column if not exists duration_slots int not null default 1;

update public.bookings b
set duration_slots = coalesce(s.slots, 1)
from public.services s
where s.id = b.service_id;

-- Keep duration_slots in sync with the booked service, so the app never has to send it.
create or replace function public.bookings_set_duration_slots()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select coalesce(s.slots, 1) into new.duration_slots
  from public.services s
  where s.id = new.service_id;
  new.duration_slots := coalesce(new.duration_slots, 1);
  return new;
end;
$$;

drop trigger if exists bookings_set_duration_slots on public.bookings;
create trigger bookings_set_duration_slots
  before insert or update of service_id on public.bookings
  for each row execute function public.bookings_set_duration_slots();

alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings drop column if exists slot_range;
alter table public.bookings add column slot_range tsrange
  generated always as (tsrange(date_time, date_time + duration_slots * interval '1 hour', '[)')) stored;
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (slot_range with &&) where (status in ('pending', 'confirmed'));

commit;
