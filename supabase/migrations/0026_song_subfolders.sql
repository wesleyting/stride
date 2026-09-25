alter table public.song_folders
  add column if not exists parent_id uuid references public.song_folders (id) on delete set null;

alter table public.song_folders
  drop constraint if exists song_folders_parent_not_self;
alter table public.song_folders
  add constraint song_folders_parent_not_self check (parent_id is null or parent_id <> id);

drop index if exists public.song_folders_user_activity_name_idx;
create unique index if not exists song_folders_root_name_idx
  on public.song_folders (user_id, activity_id, lower(name))
  where parent_id is null;
create unique index if not exists song_folders_child_name_idx
  on public.song_folders (user_id, activity_id, parent_id, lower(name))
  where parent_id is not null;
create index if not exists song_folders_parent_sort_idx
  on public.song_folders (user_id, activity_id, parent_id, sort_order, name);

create or replace function public.validate_song_folder_parent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_folder public.song_folders%rowtype;
begin
  if new.parent_id is null then return new; end if;

  select * into parent_folder from public.song_folders where id = new.parent_id;
  if not found
    or parent_folder.user_id <> new.user_id
    or parent_folder.activity_id <> new.activity_id then
    raise exception 'Parent folder must belong to the same library';
  end if;
  if parent_folder.parent_id is not null then
    raise exception 'Folders can only be nested one level deep';
  end if;
  if exists (select 1 from public.song_folders child where child.parent_id = new.id) then
    raise exception 'A folder with subfolders cannot become a subfolder';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_song_folder_parent_trigger on public.song_folders;
create trigger validate_song_folder_parent_trigger
before insert or update of parent_id, user_id, activity_id on public.song_folders
for each row execute function public.validate_song_folder_parent();

revoke all on function public.validate_song_folder_parent() from public, anon, authenticated;
