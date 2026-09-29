-- Recalculate only battles whose window contains the changed run.
create or replace function private.refresh_battle_milestones() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare affected_user uuid;
declare affected_battle uuid;
declare changed_start timestamptz;
declare previous_start timestamptz;
declare b record;
declare first_reached timestamptz;
begin
  if tg_table_name = 'battle_members' then
    affected_user := new.user_id;
    affected_battle := new.battle_id;
  elsif tg_op = 'DELETE' then
    affected_user := old.user_id;
    changed_start := old.started_at;
  else
    affected_user := new.user_id;
    changed_start := new.started_at;
    if tg_op = 'UPDATE' then previous_start := old.started_at; end if;
  end if;
  for b in select battle.id,battle.starts_at,battle.ends_at,battle.target_value
    from public.run_battles battle
    join public.battle_members member on member.battle_id = battle.id
      and member.user_id = affected_user and member.status = 'accepted'
    where battle.kind = 'first_to_distance'
      and (battle.id = affected_battle
        or (changed_start >= battle.starts_at and changed_start < battle.ends_at)
        or (previous_start >= battle.starts_at and previous_start < battle.ends_at))
  loop
    select min(ended_at) into first_reached from (
      select s.ended_at,
        sum(s.distance_meters) over (order by s.ended_at,s.activity_id) as cumulative
      from public.activity_shares s where s.user_id = affected_user
        and s.activity_type = 'running' and s.started_at >= b.starts_at and s.started_at < b.ends_at
    ) totals where cumulative >= b.target_value;
    if first_reached is null then
      delete from public.battle_milestones where battle_id = b.id and user_id = affected_user;
    else
      insert into public.battle_milestones(battle_id,user_id,reached_at)
      values (b.id,affected_user,first_reached)
      on conflict (battle_id,user_id) do update set reached_at = excluded.reached_at
      where public.battle_milestones.reached_at is distinct from excluded.reached_at;
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Skip completed challenges and past windows before aggregation.
create or replace function private.complete_challenge(p_user uuid,p_challenge uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare c record;
declare current_progress double precision;
declare start_time timestamptz;
declare end_time timestamptz;
declare completion_key text;
begin
  select * into c from public.challenges where id = p_challenge;
  if not found then return; end if;
  if not exists (select 1 from public.challenge_members
    where challenge_id = p_challenge and user_id = p_user and status = 'accepted') then return; end if;
  start_time := case when c.recurrence = 'monthly' then date_trunc('month',now()) else c.starts_at end;
  end_time := case when c.recurrence = 'monthly' then date_trunc('month',now()) + interval '1 month' else c.ends_at end;
  completion_key := 'challenge-complete:' || p_challenge::text || ':' || start_time::date::text;
  if exists (select 1 from public.notifications
    where user_id = p_user and dedupe_key = completion_key) then return; end if;
  select coalesce(sum(case when c.kind = 'distance' then distance_meters else 1 end),0)
    into current_progress from public.activity_shares
    where user_id = p_user and activity_type = 'running'
      and started_at >= start_time and started_at < end_time;
  if current_progress < c.target_value then return; end if;
  insert into public.user_achievements(user_id,code)
  values (p_user,'challenge_finisher') on conflict do nothing;
  insert into public.notifications(user_id,kind,entity_id,title,body,dedupe_key)
  values (p_user,'challenge_complete',p_challenge,'Challenge réussi',c.title,completion_key)
  on conflict do nothing;
end;
$$;

create or replace function private.award_shared_challenges() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare membership record;
begin
  for membership in select member.challenge_id
    from public.challenge_members member
    join public.challenges challenge on challenge.id = member.challenge_id
    where member.user_id = new.user_id and member.status = 'accepted'
      and (challenge.recurrence = 'monthly'
        and new.started_at >= date_trunc('month',now())
        and new.started_at < date_trunc('month',now()) + interval '1 month'
        or challenge.recurrence = 'once'
        and new.started_at >= challenge.starts_at and new.started_at < challenge.ends_at)
  loop
    perform private.complete_challenge(new.user_id,membership.challenge_id);
  end loop;
  return new;
end;
$$;
