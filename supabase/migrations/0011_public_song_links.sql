alter table public.items
  add column if not exists is_public boolean not null default false;

-- Preserve the intent of people who already chose to share their library.
update public.items item
set is_public = true
where exists (
  select 1 from public.profiles profile
  where profile.user_id = item.user_id
    and profile.is_public
    and profile.share_song_library
);

drop function if exists public.get_public_profile_songs(text);
create function public.get_public_profile_songs(profile_username text)
returns table (song_name text, song_slug text, difficulty integer, tracked_seconds bigint, last_practiced timestamptz, youtube_url text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select item.name, item.slug,
    case when profile.share_song_library then item.difficulty else null end,
    case when profile.share_song_library then coalesce(sum(entry.duration_seconds), 0)::bigint else null end,
    case when profile.share_song_library then max(entry.created_at) else null end,
    case when profile.share_song_resources then item.youtube_url else '' end
  from public.profiles profile
  join public.items item on item.user_id = profile.user_id and not item.is_archived and item.is_public
  left join public.entries entry on entry.item_id = item.id
  where profile.is_public
    and profile.username = lower(profile_username)
    and (profile.share_song_library or profile.share_song_resources)
  group by profile.user_id, item.id
  order by max(entry.created_at) desc nulls last, item.name asc;
$$;

drop function if exists public.get_public_profile_entries(text);
create function public.get_public_profile_entries(profile_username text)
returns table (song_name text, content text, rating integer, practice_part text, duration_seconds integer, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp
as $$
  select item.name, entry.content, entry.rating, entry.practice_part, entry.duration_seconds, entry.created_at
  from public.profiles profile
  join public.items item on item.user_id = profile.user_id and item.is_public and not item.is_archived
  join public.entries entry on entry.item_id = item.id
  where profile.is_public and profile.share_practice_logs and profile.username = lower(profile_username)
  order by entry.created_at desc limit 50;
$$;

create or replace function public.get_public_profile_media(profile_username text)
returns table (song_name text, storage_path text, file_name text, mime_type text, created_at timestamptz, is_public boolean)
language sql stable security definer set search_path = public, pg_temp
as $$
  select item.name, resource.storage_path, resource.file_name, resource.mime_type, resource.created_at, resource.is_public
  from public.profiles profile
  join public.items item on item.user_id = profile.user_id and item.is_public and not item.is_archived
  join public.song_resources resource on resource.item_id = item.id and resource.is_public
  where profile.is_public and profile.share_song_resources and profile.username = lower(profile_username)
  order by resource.created_at desc;
$$;

create or replace function public.get_public_song(profile_username text, public_song_slug text)
returns table (
  username text, display_name text, bio text,
  share_practice_logs boolean, share_song_resources boolean,
  song_name text, song_slug text, difficulty integer,
  tracked_seconds bigint, last_practiced timestamptz, youtube_url text
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select profile.username, profile.display_name, profile.bio,
    profile.share_practice_logs, profile.share_song_resources,
    item.name, item.slug, item.difficulty,
    coalesce(sum(entry.duration_seconds), 0)::bigint,
    max(entry.created_at),
    case when profile.share_song_resources then item.youtube_url else '' end
  from public.profiles profile
  join public.items item on item.user_id = profile.user_id and item.is_public and not item.is_archived
  left join public.entries entry on entry.item_id = item.id
  where profile.is_public and profile.username = lower(profile_username) and item.slug = public_song_slug
  group by profile.user_id, item.id;
$$;

create or replace function public.get_public_song_entries(profile_username text, public_song_slug text)
returns table (content text, rating integer, practice_part text, duration_seconds integer, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp
as $$
  select entry.content, entry.rating, entry.practice_part, entry.duration_seconds, entry.created_at
  from public.profiles profile
  join public.items item on item.user_id = profile.user_id and item.is_public and not item.is_archived
  join public.entries entry on entry.item_id = item.id
  where profile.is_public and profile.share_practice_logs
    and profile.username = lower(profile_username) and item.slug = public_song_slug
  order by entry.created_at desc;
$$;

create or replace function public.get_public_song_media(profile_username text, public_song_slug text)
returns table (storage_path text, file_name text, mime_type text, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp
as $$
  select resource.storage_path, resource.file_name, resource.mime_type, resource.created_at
  from public.profiles profile
  join public.items item on item.user_id = profile.user_id and item.is_public and not item.is_archived
  join public.song_resources resource on resource.item_id = item.id and resource.is_public
  where profile.is_public and profile.share_song_resources
    and profile.username = lower(profile_username) and item.slug = public_song_slug
  order by resource.created_at desc;
$$;

drop policy if exists "song_resources_storage_select_shared" on storage.objects;
create policy "song_resources_storage_select_shared"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'song-resources'
  and exists (
    select 1
    from public.song_resources resource
    join public.items item on item.id = resource.item_id
    join public.profiles profile on profile.user_id = resource.user_id
    where resource.storage_path = name and resource.is_public and item.is_public
      and profile.is_public and profile.share_song_resources
  )
);

revoke all on function public.get_public_profile(text) from public;
revoke all on function public.get_public_profile_songs(text) from public;
revoke all on function public.get_public_profile_entries(text) from public;
revoke all on function public.get_public_profile_media(text) from public;
revoke all on function public.get_public_song(text, text) from public;
revoke all on function public.get_public_song_entries(text, text) from public;
revoke all on function public.get_public_song_media(text, text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.get_public_profile_songs(text) to anon, authenticated;
grant execute on function public.get_public_profile_entries(text) to anon, authenticated;
grant execute on function public.get_public_profile_media(text) to anon, authenticated;
grant execute on function public.get_public_song(text, text) to anon, authenticated;
grant execute on function public.get_public_song_entries(text, text) to anon, authenticated;
grant execute on function public.get_public_song_media(text, text) to anon, authenticated;
