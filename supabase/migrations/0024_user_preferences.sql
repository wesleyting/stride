alter table public.profiles
  add column if not exists default_song_public boolean not null default false,
  add column if not exists default_resource_public boolean not null default false,
  add column if not exists default_tuning text not null default 'standard';

alter table public.profiles
  drop constraint if exists profiles_default_tuning_check,
  add constraint profiles_default_tuning_check check (
    default_tuning in ('standard', 'half-step-down', 'whole-step-down', 'drop-d', 'double-drop-d', 'dadgad', 'open-c', 'open-d', 'open-e', 'open-g')
  );
