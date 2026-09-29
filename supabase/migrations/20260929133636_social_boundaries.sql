-- Removing a friendship invalidates the old accepted request; reconnecting requires a new request.
create function private.close_removed_friendship() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.friend_requests set status = 'rejected'
  where status = 'accepted'
    and least(sender_id,receiver_id) = old.user_a
    and greatest(sender_id,receiver_id) = old.user_b;
  return old;
end;
$$;
revoke all on function private.close_removed_friendship() from public,anon,authenticated;
create trigger close_removed_friendship after delete on public.friendships
  for each row execute function private.close_removed_friendship();

-- Restrict competition windows so one request cannot scan unlimited history.
alter table public.challenges add constraint private_challenge_window_limit
  check (is_official or ends_at <= starts_at + interval '31 days');
drop policy challenge_create on public.challenges;
create policy challenge_create on public.challenges for insert to authenticated with check (
  creator_id = (select auth.uid()) and not is_official and recurrence = 'once'
  and cardinality(invited_ids) between 1 and 4
  and (select auth.uid()) <> all(invited_ids)
  and starts_at between now() - interval '1 day' and now() + interval '5 minutes'
  and ends_at > now()
);
drop policy battle_create on public.run_battles;
create policy battle_create on public.run_battles for insert to authenticated with check (
  creator_id = (select auth.uid()) and cardinality(participant_ids) between 2 and 5
  and creator_id = any(participant_ids)
  and starts_at between now() - interval '1 day' and now() + interval '5 minutes'
  and ends_at > now()
);

alter table public.goals add constraint runs_goal_is_integer
  check (kind <> 'runs' or target_value = floor(target_value));
