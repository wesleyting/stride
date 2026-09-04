alter table public.items
  drop constraint if exists items_difficulty_check;

alter table public.items
  alter column difficulty type numeric(2,1) using difficulty::numeric(2,1),
  alter column difficulty set default 3;

alter table public.items
  add constraint items_difficulty_check
  check (
    difficulty between 0.5 and 5
    and difficulty * 2 = trunc(difficulty * 2)
  );

drop function if exists public.get_public_profile_songs(text);
create function public.get_public_profile_songs(profile_username text)
returns table (
  song_name text, song_slug text, difficulty numeric,
  tracked_seconds bigint, last_practiced timestamptz, youtube_url text,
  tuning text, capo smallint
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select item.name, item.slug,
    case when profile.share_song_library then item.difficulty else null end,
    case when profile.share_song_library then coalesce(sum(entry.duration_seconds), 0)::bigint else null end,
    case when profile.share_song_library then max(entry.created_at) else null end,
    case when profile.share_song_resources then item.youtube_url else '' end,
    case when profile.share_song_library then item.tuning else 'standard' end,
    case when profile.share_song_library then item.capo else null end
  from public.profiles profile
  join public.items item on item.user_id = profile.user_id and not item.is_archived and item.is_public
  left join public.entries entry on entry.item_id = item.id
  where profile.is_public
    and profile.username = lower(profile_username)
    and (profile.share_song_library or profile.share_song_resources)
  group by profile.user_id, item.id
  order by max(entry.created_at) desc nulls last, item.name asc;
$$;

drop function if exists public.get_public_song(text, text);
create function public.get_public_song(profile_username text, public_song_slug text)
returns table (
  username text, display_name text, bio text,
  share_practice_logs boolean, share_song_resources boolean,
  song_name text, song_slug text, difficulty numeric,
  tracked_seconds bigint, last_practiced timestamptz, youtube_url text,
  tuning text, capo smallint
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select profile.username, profile.display_name, profile.bio,
    profile.share_practice_logs, profile.share_song_resources,
    item.name, item.slug, item.difficulty,
    coalesce(sum(entry.duration_seconds), 0)::bigint,
    max(entry.created_at),
    case when profile.share_song_resources then item.youtube_url else '' end,
    item.tuning, item.capo
  from public.profiles profile
  join public.items item on item.user_id = profile.user_id and item.is_public and not item.is_archived
  left join public.entries entry on entry.item_id = item.id
  where profile.is_public and profile.username = lower(profile_username) and item.slug = public_song_slug
  group by profile.user_id, item.id;
$$;

revoke all on function public.get_public_profile_songs(text) from public;
revoke all on function public.get_public_song(text, text) from public;
grant execute on function public.get_public_profile_songs(text) to anon, authenticated;
grant execute on function public.get_public_song(text, text) to anon, authenticated;
