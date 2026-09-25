drop trigger if exists validate_song_folder_parent_trigger on public.song_folders;
drop function if exists public.validate_song_folder_parent();

drop index if exists public.song_folders_root_name_idx;
drop index if exists public.song_folders_child_name_idx;
drop index if exists public.song_folders_parent_sort_idx;

alter table public.song_folders
  drop constraint if exists song_folders_parent_not_self;
alter table public.song_folders
  drop column if exists parent_id;

create unique index if not exists song_folders_user_activity_name_idx
  on public.song_folders (user_id, activity_id, lower(name));
