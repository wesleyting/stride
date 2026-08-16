create extension if not exists pgcrypto;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  kind text not null check (kind in ('practice', 'journal', 'fitness')),
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  focus text not null default '',
  going_well text not null default '',
  still_working_on text not null default '',
  confidence smallint not null default 3 check (confidence between 1 and 5),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, activity_id, slug)
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  item_id uuid references public.items (id) on delete set null,
  content text not null,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists activities_user_sort_idx on public.activities (user_id, sort_order, created_at desc);
create index if not exists items_activity_sort_idx on public.items (activity_id, sort_order, created_at desc);
create index if not exists entries_activity_created_idx on public.entries (activity_id, created_at desc);
create index if not exists entries_item_created_idx on public.entries (item_id, created_at desc);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.activities to authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.entries to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists activities_set_updated_at on public.activities;
create trigger activities_set_updated_at
before update on public.activities
for each row
execute function public.set_updated_at();

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
before update on public.items
for each row
execute function public.set_updated_at();

alter table public.activities enable row level security;
alter table public.items enable row level security;
alter table public.entries enable row level security;

drop policy if exists "activities_select_own" on public.activities;
create policy "activities_select_own"
on public.activities
for select
using (user_id = auth.uid());

drop policy if exists "activities_insert_own" on public.activities;
create policy "activities_insert_own"
on public.activities
for insert
with check (user_id = auth.uid());

drop policy if exists "activities_update_own" on public.activities;
create policy "activities_update_own"
on public.activities
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "activities_delete_own" on public.activities;
create policy "activities_delete_own"
on public.activities
for delete
using (user_id = auth.uid());

drop policy if exists "items_select_own" on public.items;
create policy "items_select_own"
on public.items
for select
using (user_id = auth.uid());

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own"
on public.items
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.activities activity
    where activity.id = activity_id
      and activity.user_id = auth.uid()
  )
);

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own"
on public.items
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own"
on public.items
for delete
using (user_id = auth.uid());

drop policy if exists "entries_select_own" on public.entries;
create policy "entries_select_own"
on public.entries
for select
using (user_id = auth.uid());

drop policy if exists "entries_insert_own" on public.entries;
create policy "entries_insert_own"
on public.entries
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.activities activity
    where activity.id = activity_id
      and activity.user_id = auth.uid()
  )
  and (
    item_id is null
    or exists (
      select 1
      from public.items item
      where item.id = item_id
        and item.user_id = auth.uid()
        and item.activity_id = activity_id
    )
  )
);

drop policy if exists "entries_delete_own" on public.entries;
create policy "entries_delete_own"
on public.entries
for delete
using (user_id = auth.uid());

create or replace function public.seed_stride_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  guitar_id uuid;
  running_id uuid;
  wellbeing_id uuid;
  piano_id uuid;
  development_id uuid;
  blackbird_id uuid;
  fast_car_id uuid;
  tears_id uuid;
  house_id uuid;
begin
  if exists (
    select 1
    from public.activities
    where user_id = new.id
  ) then
    return new;
  end if;

  insert into public.activities (user_id, name, slug, kind, description, sort_order)
  values (new.id, 'Guitar', 'guitar', 'practice', 'Practicing regularly', 0)
  returning id into guitar_id;

  insert into public.activities (user_id, name, slug, kind, description, sort_order)
  values (new.id, 'Running', 'running', 'fitness', 'Building endurance', 1)
  returning id into running_id;

  insert into public.activities (user_id, name, slug, kind, description, sort_order)
  values (new.id, 'Wellbeing', 'wellbeing', 'journal', 'Journal & reflection', 2)
  returning id into wellbeing_id;

  insert into public.activities (user_id, name, slug, kind, description, sort_order)
  values (new.id, 'Piano', 'piano', 'practice', 'Learning & practice', 3)
  returning id into piano_id;

  insert into public.activities (user_id, name, slug, kind, description, sort_order)
  values (new.id, 'Development', 'development', 'practice', 'Side projects & learning', 4)
  returning id into development_id;

  insert into public.items (
    user_id,
    activity_id,
    name,
    slug,
    description,
    focus,
    going_well,
    still_working_on,
    confidence,
    sort_order
  )
  values (
    new.id,
    guitar_id,
    'Blackbird',
    'blackbird',
    'Working on the second section',
    'Second section / picking pattern',
    'Picking pattern is becoming more consistent',
    'Transition into the second section',
    3,
    0
  )
  returning id into blackbird_id;

  insert into public.items (
    user_id,
    activity_id,
    name,
    slug,
    description,
    focus,
    going_well,
    still_working_on,
    confidence,
    sort_order
  )
  values (
    new.id,
    guitar_id,
    'Tears in Heaven',
    'tears-in-heaven',
    'Learning the intro',
    'Learning the intro',
    'Chord changes are smoother',
    'Clean hammer-ons in the intro',
    2,
    1
  )
  returning id into tears_id;

  insert into public.items (
    user_id,
    activity_id,
    name,
    slug,
    description,
    focus,
    going_well,
    still_working_on,
    confidence,
    sort_order
  )
  values (
    new.id,
    guitar_id,
    'Fast Car',
    'fast-car',
    'Getting comfortable singing while playing',
    'Singing while playing',
    'Chord changes stay steady',
    'Breath control through the chorus',
    3,
    2
  )
  returning id into fast_car_id;

  insert into public.items (
    user_id,
    activity_id,
    name,
    slug,
    description,
    focus,
    going_well,
    still_working_on,
    confidence,
    sort_order
  )
  values (
    new.id,
    guitar_id,
    'House of the Rising Sun',
    'house-of-the-rising-sun',
    'On the back burner',
    'Keeping the groove even',
    'Bass notes are clear',
    'Strumming consistency',
    2,
    3
  )
  returning id into house_id;

  insert into public.entries (user_id, activity_id, item_id, content, rating, created_at)
  values (
    new.id,
    guitar_id,
    blackbird_id,
    'Worked mostly on the second section. Picking is coming along but the transition still feels awkward.',
    4,
    now() - interval '1 day'
  );

  insert into public.entries (user_id, activity_id, item_id, content, rating, created_at)
  values (
    new.id,
    guitar_id,
    fast_car_id,
    'Practiced chord changes and singing while playing. The groove felt steadier.',
    3,
    now() - interval '1 day'
  );

  insert into public.entries (user_id, activity_id, item_id, content, rating, created_at)
  values (
    new.id,
    guitar_id,
    tears_id,
    'Cleaned up the intro slowly and got a little more comfortable with the timing.',
    3,
    now() - interval '2 days'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.seed_stride_user();
