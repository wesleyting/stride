create or replace function public.count_public_profile_entries(profile_username text)
returns bigint
language sql stable security definer set search_path = public, pg_temp
as $$
  select count(*)
  from public.profiles profile
  join public.items item
    on item.user_id = profile.user_id
    and item.is_public
    and not item.is_archived
  join public.entries entry on entry.item_id = item.id
  where profile.is_public
    and profile.share_practice_logs
    and profile.username = lower(profile_username);
$$;

create or replace function public.get_public_profile_entries_page(
  profile_username text,
  page_limit integer default 5,
  page_offset integer default 0
)
returns table (
  song_name text,
  content text,
  rating integer,
  practice_part text,
  duration_seconds integer,
  created_at timestamptz
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select item.name, entry.content, entry.rating, entry.practice_part,
    entry.duration_seconds, entry.created_at
  from public.profiles profile
  join public.items item
    on item.user_id = profile.user_id
    and item.is_public
    and not item.is_archived
  join public.entries entry on entry.item_id = item.id
  where profile.is_public
    and profile.share_practice_logs
    and profile.username = lower(profile_username)
  order by entry.created_at desc
  limit greatest(1, least(page_limit, 50))
  offset greatest(page_offset, 0);
$$;

create or replace function public.count_public_song_entries(
  profile_username text,
  public_song_slug text
)
returns bigint
language sql stable security definer set search_path = public, pg_temp
as $$
  select count(*)
  from public.profiles profile
  join public.items item
    on item.user_id = profile.user_id
    and item.is_public
    and not item.is_archived
  join public.entries entry on entry.item_id = item.id
  where profile.is_public
    and profile.share_practice_logs
    and profile.username = lower(profile_username)
    and item.slug = public_song_slug;
$$;

create or replace function public.get_public_song_entries_page(
  profile_username text,
  public_song_slug text,
  page_limit integer default 5,
  page_offset integer default 0
)
returns table (
  content text,
  rating integer,
  practice_part text,
  duration_seconds integer,
  created_at timestamptz
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select entry.content, entry.rating, entry.practice_part,
    entry.duration_seconds, entry.created_at
  from public.profiles profile
  join public.items item
    on item.user_id = profile.user_id
    and item.is_public
    and not item.is_archived
  join public.entries entry on entry.item_id = item.id
  where profile.is_public
    and profile.share_practice_logs
    and profile.username = lower(profile_username)
    and item.slug = public_song_slug
  order by entry.created_at desc
  limit greatest(1, least(page_limit, 50))
  offset greatest(page_offset, 0);
$$;

revoke all on function public.count_public_profile_entries(text) from public;
revoke all on function public.get_public_profile_entries_page(text, integer, integer) from public;
revoke all on function public.count_public_song_entries(text, text) from public;
revoke all on function public.get_public_song_entries_page(text, text, integer, integer) from public;

grant execute on function public.count_public_profile_entries(text) to anon, authenticated;
grant execute on function public.get_public_profile_entries_page(text, integer, integer) to anon, authenticated;
grant execute on function public.count_public_song_entries(text, text) to anon, authenticated;
grant execute on function public.get_public_song_entries_page(text, text, integer, integer) to anon, authenticated;

create or replace function public.can_read_shared_song_resource(object_name text)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.song_resources resource
    join public.items item on item.id = resource.item_id
    join public.profiles profile on profile.user_id = resource.user_id
    where resource.storage_path = object_name
      and resource.is_public
      and item.is_public
      and not item.is_archived
      and profile.is_public
      and profile.share_song_resources
  );
$$;

revoke all on function public.can_read_shared_song_resource(text) from public;
grant execute on function public.can_read_shared_song_resource(text) to anon, authenticated;

drop policy if exists "song_resources_storage_select_shared" on storage.objects;
create policy "song_resources_storage_select_shared"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'song-resources'
  and public.can_read_shared_song_resource(name)
);
