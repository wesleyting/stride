-- Allow a signed-in Stride user (including an anonymous guest) to remove their
-- own Auth account. Application tables are removed by their ON DELETE CASCADE
-- foreign keys; uploaded Storage objects are removed by the server action first.
create or replace function public.delete_stride_account(dry_run boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not dry_run then
    delete from auth.users where id = auth.uid();
  end if;
end;
$$;

revoke all on function public.delete_stride_account(boolean) from public;
revoke all on function public.delete_stride_account(boolean) from anon;
grant execute on function public.delete_stride_account(boolean) to authenticated;
