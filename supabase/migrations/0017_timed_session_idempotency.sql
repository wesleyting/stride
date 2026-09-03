-- A browser may retry a timer save after a slow response or brief disconnect.
-- This client-generated ID makes that retry safe instead of creating two logs.
alter table public.entries
  add column if not exists client_session_id uuid;

create unique index if not exists entries_user_client_session_unique_idx
  on public.entries (user_id, client_session_id)
  where client_session_id is not null;
