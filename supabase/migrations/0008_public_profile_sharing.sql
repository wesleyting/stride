alter table public.profiles
  add column if not exists share_song_library boolean not null default false,
  add column if not exists share_practice_logs boolean not null default false,
  add column if not exists share_song_resources boolean not null default false;

drop function if exists public.list_public_profiles();
create function public.list_public_profiles()
returns table (
  username text,
  display_name text,
  bio text,
  share_song_library boolean,
  share_practice_logs boolean,
  share_song_resources boolean,
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
    profile.share_song_library,
    profile.share_practice_logs,
    profile.share_song_resources,
    coalesce(sum(entry.duration_seconds), 0)::bigint,
    coalesce(sum(entry.duration_seconds) filter (
      where entry.created_at >= now() - interval '7 days'
    ), 0)::bigint,
    count(entry.id) filter (where entry.duration_seconds is not null)::bigint
  from public.profiles profile
  left join public.entries entry on entry.user_id = profile.user_id
  where profile.is_public
  group by profile.user_id
  order by 8 desc, 7 desc, profile.display_name asc;
$$;

drop function if exists public.get_public_profile(text);
create function public.get_public_profile(profile_username text)
returns table (
  username text,
  display_name text,
  bio text,
  share_song_library boolean,
  share_practice_logs boolean,
  share_song_resources boolean,
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
    profile.share_song_library,
    profile.share_practice_logs,
    profile.share_song_resources,
    coalesce(sum(entry.duration_seconds), 0)::bigint,
    coalesce(sum(entry.duration_seconds) filter (
      where entry.created_at >= now() - interval '7 days'
    ), 0)::bigint,
    count(entry.id) filter (where entry.duration_seconds is not null)::bigint,
    count(distinct entry.created_at::date) filter (
      where entry.duration_seconds is not null
        and entry.created_at >= now() - interval '30 days'
    )::bigint
  from public.profiles profile
  left join public.entries entry on entry.user_id = profile.user_id
  where profile.is_public and profile.username = lower(profile_username)
  group by profile.user_id;
$$;

create or replace function public.get_public_profile_songs(profile_username text)
returns table (
  song_name text,
  difficulty integer,
  tracked_seconds bigint,
  last_practiced timestamptz,
  youtube_url text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    item.name,
    case when profile.share_song_library then item.difficulty else null end,
    case when profile.share_song_library then coalesce(sum(entry.duration_seconds), 0)::bigint else null end,
    case when profile.share_song_library then max(entry.created_at) else null end,
    case when profile.share_song_resources then item.youtube_url else '' end
  from public.profiles profile
  join public.items item on item.user_id = profile.user_id and not item.is_archived
  left join public.entries entry on entry.item_id = item.id
  where profile.is_public
    and profile.username = lower(profile_username)
    and (profile.share_song_library or profile.share_song_resources)
  group by profile.user_id, item.id
  order by max(entry.created_at) desc nulls last, item.name asc;
$$;

create or replace function public.get_public_profile_entries(profile_username text)
returns table (
  song_name text,
  content text,
  rating integer,
  practice_part text,
  duration_seconds integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select item.name, entry.content, entry.rating, entry.practice_part,
    entry.duration_seconds, entry.created_at
  from public.profiles profile
  join public.entries entry on entry.user_id = profile.user_id
  left join public.items item on item.id = entry.item_id
  where profile.is_public
    and profile.share_practice_logs
    and profile.username = lower(profile_username)
  order by entry.created_at desc
  limit 50;
$$;

create or replace function public.get_public_profile_resources(profile_username text)
returns table (
  song_name text,
  storage_path text,
  file_name text,
  mime_type text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select item.name, resource.storage_path, resource.file_name,
    resource.mime_type, resource.created_at
  from public.profiles profile
  join public.song_resources resource on resource.user_id = profile.user_id
  join public.items item on item.id = resource.item_id
  where profile.is_public
    and profile.share_song_resources
    and profile.username = lower(profile_username)
  order by resource.created_at desc;
$$;

drop policy if exists "song_resources_storage_select_shared" on storage.objects;
create policy "song_resources_storage_select_shared"
on storage.objects for select to authenticated
using (
  bucket_id = 'song-resources'
  and exists (
    select 1 from public.profiles profile
    where profile.user_id::text = (storage.foldername(name))[1]
      and profile.is_public
      and profile.share_song_resources
  )
);

revoke all on function public.list_public_profiles() from public;
revoke all on function public.get_public_profile(text) from public;
revoke all on function public.get_public_profile_songs(text) from public;
revoke all on function public.get_public_profile_entries(text) from public;
revoke all on function public.get_public_profile_resources(text) from public;
grant execute on function public.list_public_profiles() to authenticated;
grant execute on function public.get_public_profile(text) to authenticated;
grant execute on function public.get_public_profile_songs(text) to authenticated;
grant execute on function public.get_public_profile_entries(text) to authenticated;
grant execute on function public.get_public_profile_resources(text) to authenticated;
