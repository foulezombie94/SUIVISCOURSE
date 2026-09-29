-- A recipient may see the minimal profile of someone who sent a pending request.
drop policy profile_read on public.profiles;
create policy profile_read on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or exists (
    select 1 from public.friendships f
    where (f.user_a = id and f.user_b = (select auth.uid()))
       or (f.user_b = id and f.user_a = (select auth.uid()))
  )
  or exists (
    select 1 from public.friend_requests r
    where r.sender_id = id and r.receiver_id = (select auth.uid()) and r.status = 'pending'
  )
);
