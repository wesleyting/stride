alter table public.song_resources
  alter column is_public set default true;

-- Existing uploads keep their current visibility. This only changes the
-- database default for future media created without an explicit value.
