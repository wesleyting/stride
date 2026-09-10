create table if not exists public.song_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  sort_order integer not null default 999,
  created_at timestamptz not null default now()
);

create unique index if not exists song_folders_user_activity_name_idx
  on public.song_folders (user_id, activity_id, lower(name));
create index if not exists song_folders_activity_sort_idx
  on public.song_folders (activity_id, sort_order, name);

alter table public.song_folders enable row level security;
grant select, insert, update, delete on public.song_folders to authenticated;

drop policy if exists "song_folders_select_own" on public.song_folders;
create policy "song_folders_select_own" on public.song_folders
  for select using (user_id = auth.uid());
drop policy if exists "song_folders_insert_own" on public.song_folders;
create policy "song_folders_insert_own" on public.song_folders
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.activities activity
      where activity.id = activity_id and activity.user_id = auth.uid()
    )
  );
drop policy if exists "song_folders_update_own" on public.song_folders;
create policy "song_folders_update_own" on public.song_folders
  for update using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.activities activity
      where activity.id = activity_id and activity.user_id = auth.uid()
    )
  );
drop policy if exists "song_folders_delete_own" on public.song_folders;
create policy "song_folders_delete_own" on public.song_folders
  for delete using (user_id = auth.uid());

alter table public.items
  add column if not exists folder_id uuid references public.song_folders (id) on delete set null;

create index if not exists items_folder_idx on public.items (folder_id, name);

alter table public.items alter column difficulty drop not null;
alter table public.items alter column difficulty drop default;

comment on column public.items.youtube_url is
  'General song reference URL. The legacy column name is retained for backwards compatibility.';

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own" on public.items
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.activities activity
    where activity.id = activity_id and activity.user_id = auth.uid()
  )
  and (
    folder_id is null
    or exists (
      select 1 from public.song_folders folder
      where folder.id = folder_id
        and folder.user_id = auth.uid()
        and folder.activity_id = activity_id
    )
  )
);

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own" on public.items
for update using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and (
    folder_id is null
    or exists (
      select 1 from public.song_folders folder
      where folder.id = folder_id
        and folder.user_id = auth.uid()
        and folder.activity_id = activity_id
    )
  )
);
