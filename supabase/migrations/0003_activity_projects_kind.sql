alter table public.activities drop constraint if exists activities_kind_check;
alter table public.activities add constraint activities_kind_check check (kind in ('practice', 'journal', 'fitness', 'projects'));
