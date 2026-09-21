alter table public.items
  add column if not exists is_hidden boolean not null default false;

create index if not exists items_folder_repertoire_sort_idx
  on public.items (user_id, activity_id, folder_id, is_hidden, sort_order, name)
  where not is_archived;
