-- Accepting a request and creating a mutual friendship is one transaction.
create function public.accept_friend_request(p_request_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  sender uuid;
  receiver uuid;
begin
  update public.friend_requests
  set status = 'accepted'
  where id = p_request_id and receiver_id = auth.uid() and status = 'pending'
  returning sender_id, receiver_id into sender, receiver;
  if not found then
    raise exception 'Pending friend request not found';
  end if;
  insert into public.friendships(user_a,user_b)
  values (least(sender,receiver),greatest(sender,receiver))
  on conflict do nothing;
end;
$$;
revoke all on function public.accept_friend_request(uuid) from public, anon;
grant execute on function public.accept_friend_request(uuid) to authenticated;
