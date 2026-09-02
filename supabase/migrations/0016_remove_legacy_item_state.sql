-- The guitar-focused product no longer exposes or updates the original generic
-- MVP "current state" fields. Practice notes and tags live on entries instead.
alter table public.items
  drop column if exists description,
  drop column if exists focus,
  drop column if exists going_well,
  drop column if exists still_working_on,
  drop column if exists confidence,
  drop column if exists next_action;
