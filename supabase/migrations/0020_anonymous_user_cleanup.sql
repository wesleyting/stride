-- Supabase does not remove abandoned anonymous users automatically.
-- Delete anonymous accounts with no sign-in or Stride activity in 90 days.
-- The existing foreign keys cascade their application records with the user.

create extension if not exists pg_cron;

create or replace function public.cleanup_inactive_stride_guests(retention_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
  cutoff timestamptz := now() - make_interval(days => greatest(retention_days, 30));
begin
  delete from auth.users as guest
  where guest.is_anonymous is true
    and guest.created_at < cutoff
    and coalesce(guest.last_sign_in_at, guest.created_at) < cutoff
    and not exists (
      select 1 from public.activities
      where user_id = guest.id and updated_at >= cutoff
    )
    and not exists (
      select 1 from public.items
      where user_id = guest.id and updated_at >= cutoff
    )
    and not exists (
      select 1 from public.entries
      where user_id = guest.id and created_at >= cutoff
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_inactive_stride_guests(integer) from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'stride-cleanup-inactive-guests';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'stride-cleanup-inactive-guests',
    '17 4 * * *',
    'select public.cleanup_inactive_stride_guests(90);'
  );
end;
$$;
