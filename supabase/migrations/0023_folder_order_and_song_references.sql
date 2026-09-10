create table if not exists public.song_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  url text not null check (url ~ '^https?://'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (item_id, url)
);

create index if not exists song_references_item_sort_idx on public.song_references (item_id, sort_order, created_at);
alter table public.song_references enable row level security;
grant select, insert, update, delete on public.song_references to authenticated;

drop policy if exists "song_references_select_own" on public.song_references;
create policy "song_references_select_own" on public.song_references for select using (user_id = auth.uid());
drop policy if exists "song_references_insert_own" on public.song_references;
create policy "song_references_insert_own" on public.song_references for insert with check (
  user_id = auth.uid() and exists (select 1 from public.items item where item.id = item_id and item.user_id = auth.uid())
);
drop policy if exists "song_references_update_own" on public.song_references;
create policy "song_references_update_own" on public.song_references for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "song_references_delete_own" on public.song_references;
create policy "song_references_delete_own" on public.song_references for delete using (user_id = auth.uid());

insert into public.song_references (user_id, item_id, url, sort_order)
select item.user_id, item.id, item.youtube_url, 0
from public.items item
where coalesce(item.youtube_url, '') <> ''
on conflict (item_id, url) do nothing;

create or replace function public.replace_song_references(target_item_id uuid, reference_urls text[])
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.items where id = target_item_id and user_id = auth.uid()) then
    raise exception 'Song not found';
  end if;

  if coalesce(array_length(reference_urls, 1), 0) > 10 then
    raise exception 'A song can have at most 10 reference links';
  end if;

  delete from public.song_references where item_id = target_item_id and user_id = auth.uid();

  insert into public.song_references (user_id, item_id, url, sort_order)
  select auth.uid(), target_item_id, clean.url, clean.position - 1
  from (
    select distinct on (trim(value)) trim(value) as url, ordinality::integer as position
    from unnest(coalesce(reference_urls, array[]::text[])) with ordinality as supplied(value, ordinality)
    where trim(value) ~ '^https?://'
    order by trim(value), ordinality
  ) clean
  order by clean.position;

  update public.items
  set youtube_url = coalesce((select url from public.song_references where item_id = target_item_id order by sort_order, created_at limit 1), '')
  where id = target_item_id and user_id = auth.uid();
end;
$$;

revoke all on function public.replace_song_references(uuid, text[]) from public, anon;
grant execute on function public.replace_song_references(uuid, text[]) to authenticated;

create or replace function public.add_song_reference(target_item_id uuid, reference_url text)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if trim(reference_url) !~ '^https?://' then raise exception 'Invalid reference link'; end if;
  insert into public.song_references (user_id, item_id, url, sort_order)
  select auth.uid(), item.id, trim(reference_url), coalesce((select max(sort_order) + 1 from public.song_references where item_id = item.id), 0)
  from public.items item where item.id = target_item_id and item.user_id = auth.uid()
  on conflict (item_id, url) do nothing;

  update public.items set youtube_url = trim(reference_url)
  where id = target_item_id and user_id = auth.uid() and coalesce(youtube_url, '') = '';
end;
$$;

revoke all on function public.add_song_reference(uuid, text) from public, anon;
grant execute on function public.add_song_reference(uuid, text) to authenticated;

create or replace function public.get_public_song_references(profile_username text, public_song_slug text)
returns table (url text, sort_order integer)
language sql stable security definer set search_path = public, pg_temp
as $$
  select reference.url, reference.sort_order
  from public.profiles profile
  join public.items item on item.user_id = profile.user_id and item.is_public and not item.is_archived
  join public.song_references reference on reference.item_id = item.id
  where profile.is_public and profile.share_song_resources
    and profile.username = lower(profile_username) and item.slug = public_song_slug
  order by reference.sort_order, reference.created_at;
$$;

revoke all on function public.get_public_song_references(text, text) from public;
grant execute on function public.get_public_song_references(text, text) to anon, authenticated;
