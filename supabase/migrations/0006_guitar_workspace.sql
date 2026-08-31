alter table public.items
  add column if not exists is_favorite boolean not null default false,
  add column if not exists next_action text not null default '',
  add column if not exists youtube_url text not null default '';

create index if not exists items_user_favorite_idx
  on public.items (user_id, is_favorite, updated_at desc)
  where is_archived = false;

create table if not exists public.song_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists song_resources_item_created_idx
  on public.song_resources (item_id, created_at desc);

grant select, insert, delete on public.song_resources to authenticated;
alter table public.song_resources enable row level security;

drop policy if exists "song_resources_select_own" on public.song_resources;
create policy "song_resources_select_own"
on public.song_resources for select
using (user_id = auth.uid());

drop policy if exists "song_resources_insert_own" on public.song_resources;
create policy "song_resources_insert_own"
on public.song_resources for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.items item
    where item.id = item_id and item.user_id = auth.uid()
  )
);

drop policy if exists "song_resources_delete_own" on public.song_resources;
create policy "song_resources_delete_own"
on public.song_resources for delete
using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'song-resources',
  'song-resources',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "song_resources_storage_select_own" on storage.objects;
create policy "song_resources_storage_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'song-resources'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "song_resources_storage_insert_own" on storage.objects;
create policy "song_resources_storage_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'song-resources'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "song_resources_storage_delete_own" on storage.objects;
create policy "song_resources_storage_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'song-resources'
  and (storage.foldername(name))[1] = auth.uid()::text
);
