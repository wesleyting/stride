alter table public.song_resources
  add column if not exists is_public boolean not null default false;

grant update on public.song_resources to authenticated;

drop policy if exists "song_resources_update_own" on public.song_resources;
create policy "song_resources_update_own"
on public.song_resources for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/webm'
  ]
where id = 'song-resources';

drop function if exists public.get_public_profile_resources(text);
create function public.get_public_profile_media(profile_username text)
returns table (
  song_name text,
  storage_path text,
  file_name text,
  mime_type text,
  created_at timestamptz,
  is_public boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select item.name, resource.storage_path, resource.file_name,
    resource.mime_type, resource.created_at, resource.is_public
  from public.profiles profile
  join public.song_resources resource on resource.user_id = profile.user_id
  join public.items item on item.id = resource.item_id
  where profile.is_public
    and profile.share_song_resources
    and resource.is_public
    and profile.username = lower(profile_username)
  order by resource.created_at desc;
$$;

drop policy if exists "song_resources_storage_select_shared" on storage.objects;
create policy "song_resources_storage_select_shared"
on storage.objects for select to authenticated
using (
  bucket_id = 'song-resources'
  and exists (
    select 1
    from public.song_resources resource
    join public.profiles profile on profile.user_id = resource.user_id
    where resource.storage_path = name
      and resource.is_public
      and profile.is_public
      and profile.share_song_resources
  )
);

revoke all on function public.get_public_profile_media(text) from public;
grant execute on function public.get_public_profile_media(text) to authenticated;
