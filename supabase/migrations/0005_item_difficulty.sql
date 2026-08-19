alter table public.items
  add column if not exists difficulty smallint not null default 3;

alter table public.items
  drop constraint if exists items_difficulty_check;

alter table public.items
  add constraint items_difficulty_check
  check (difficulty between 1 and 5);
