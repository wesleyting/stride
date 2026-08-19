alter table public.entries
  add column if not exists practice_part text;

alter table public.entries
  drop constraint if exists entries_rating_check;

update public.entries
set rating = rating * 2
where rating between 1 and 5;

alter table public.entries
  add constraint entries_rating_check
  check (rating between 1 and 10);

create index if not exists entries_item_practice_part_idx
  on public.entries (item_id, practice_part)
  where practice_part is not null;
