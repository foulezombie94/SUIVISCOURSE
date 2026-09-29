drop policy battle_member_answer on public.battle_members;
create policy battle_member_answer on public.battle_members for update to authenticated
using (user_id = (select auth.uid()) and status = 'invited'
  and exists (select 1 from public.run_battles b where b.id = battle_id and b.ends_at > now()))
with check (user_id = (select auth.uid()) and status in ('accepted','declined'));

drop policy challenge_member_answer on public.challenge_members;
create policy challenge_member_answer on public.challenge_members for update to authenticated
using (user_id = (select auth.uid()) and status = 'invited'
  and exists (select 1 from public.challenges c where c.id = challenge_id
    and (c.is_official or c.ends_at > now())))
with check (user_id = (select auth.uid()) and status in ('accepted','declined'));
