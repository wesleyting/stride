alter table public.entries
  add column if not exists duration_seconds integer;

alter table public.entries
  drop constraint if exists entries_duration_seconds_check;

alter table public.entries
  add constraint entries_duration_seconds_check
  check (duration_seconds is null or duration_seconds between 1 and 43200);

create index if not exists entries_user_duration_created_idx
  on public.entries (user_id, created_at desc)
  where duration_seconds is not null;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format_check
    check (username ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  constraint profiles_display_name_length_check
    check (char_length(display_name) between 2 and 50),
  constraint profiles_bio_length_check
    check (char_length(bio) <= 160)
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

grant select, insert, update on public.profiles to authenticated;
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_public_or_own" on public.profiles;
create policy "profiles_select_public_or_own"
on public.profiles for select
using (is_public or user_id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.list_public_profiles()
returns table (
  username text,
  display_name text,
  bio text,
  tracked_seconds bigint,
  tracked_seconds_7d bigint,
  timed_sessions bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    profile.username,
    profile.display_name,
    profile.bio,
    coalesce(sum(entry.duration_seconds), 0)::bigint as tracked_seconds,
    coalesce(
      sum(entry.duration_seconds) filter (
        where entry.created_at >= now() - interval '7 days'
      ),
      0
    )::bigint as tracked_seconds_7d,
    count(entry.id) filter (where entry.duration_seconds is not null)::bigint as timed_sessions
  from public.profiles profile
  left join public.entries entry on entry.user_id = profile.user_id
  where profile.is_public
  group by profile.user_id, profile.username, profile.display_name, profile.bio
  order by tracked_seconds_7d desc, tracked_seconds desc, profile.display_name asc;
$$;

create or replace function public.get_public_profile(profile_username text)
returns table (
  username text,
  display_name text,
  bio text,
  tracked_seconds bigint,
  tracked_seconds_7d bigint,
  timed_sessions bigint,
  active_days_30 bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    profile.username,
    profile.display_name,
    profile.bio,
    coalesce(sum(entry.duration_seconds), 0)::bigint as tracked_seconds,
    coalesce(
      sum(entry.duration_seconds) filter (
        where entry.created_at >= now() - interval '7 days'
      ),
      0
    )::bigint as tracked_seconds_7d,
    count(entry.id) filter (where entry.duration_seconds is not null)::bigint as timed_sessions,
    count(distinct entry.created_at::date) filter (
      where entry.duration_seconds is not null
        and entry.created_at >= now() - interval '30 days'
    )::bigint as active_days_30
  from public.profiles profile
  left join public.entries entry on entry.user_id = profile.user_id
  where profile.is_public
    and profile.username = lower(profile_username)
  group by profile.user_id, profile.username, profile.display_name, profile.bio;
$$;

revoke all on function public.list_public_profiles() from public;
revoke all on function public.get_public_profile(text) from public;
grant execute on function public.list_public_profiles() to authenticated;
grant execute on function public.get_public_profile(text) to authenticated;
