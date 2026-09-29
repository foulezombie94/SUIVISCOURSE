-- Keep the privileged lookup in a schema that is not exposed by the Data API.
create function private.find_friend_by_code(p_code text)
returns table(id uuid, username text, display_name text)
language sql stable security definer set search_path = ''
as $$
  select p.id,p.username,p.display_name from public.profiles p
  where auth.uid() is not null
    and p_code ~ '^RUN-[0-9A-F]{12}$'
    and p.friend_code = p_code
  limit 1;
$$;
revoke all on function private.find_friend_by_code(text) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.find_friend_by_code(text) to authenticated;

create or replace function public.find_friend_by_code(p_code text)
returns table(id uuid, username text, display_name text)
language sql stable security invoker set search_path = ''
as $$
  select * from private.find_friend_by_code(p_code);
$$;
