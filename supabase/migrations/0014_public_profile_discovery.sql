-- Public profiles are intentionally discoverable. This exposes only the same
-- profile summary already returned by the public-profile directory function.
revoke all on function public.list_public_profiles() from public;
grant execute on function public.list_public_profiles() to anon, authenticated;
