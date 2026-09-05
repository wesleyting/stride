-- Anonymous Supabase Auth users can use Stride's private practice loop, but
-- publishing profiles/songs and storing media requires a permanent account.

drop policy if exists "items_guests_stay_private_on_insert" on public.items;
create policy "items_guests_stay_private_on_insert"
on public.items as restrictive
for insert to authenticated
with check (
  not is_public
  or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
);

drop policy if exists "items_guests_stay_private_on_update" on public.items;
create policy "items_guests_stay_private_on_update"
on public.items as restrictive
for update to authenticated
using (true)
with check (
  not is_public
  or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
);

drop policy if exists "profiles_require_permanent_account_insert" on public.profiles;
create policy "profiles_require_permanent_account_insert"
on public.profiles as restrictive
for insert to authenticated
with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false);

drop policy if exists "profiles_require_permanent_account_update" on public.profiles;
create policy "profiles_require_permanent_account_update"
on public.profiles as restrictive
for update to authenticated
using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false)
with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false);

drop policy if exists "song_resources_require_permanent_account_insert" on public.song_resources;
create policy "song_resources_require_permanent_account_insert"
on public.song_resources as restrictive
for insert to authenticated
with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false);

drop policy if exists "song_resources_guests_stay_private_on_update" on public.song_resources;
create policy "song_resources_guests_stay_private_on_update"
on public.song_resources as restrictive
for update to authenticated
using (true)
with check (
  not is_public
  or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
);

drop policy if exists "song_resource_files_require_permanent_account" on storage.objects;
create policy "song_resource_files_require_permanent_account"
on storage.objects as restrictive
for insert to authenticated
with check (
  bucket_id <> 'song-resources'
  or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
);
