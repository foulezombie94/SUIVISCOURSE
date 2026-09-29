-- DELETE triggers have no NEW row. Recalculate milestones when a shared run is made private.
create or replace function private.refresh_battle_milestones() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare affected_user uuid;
declare b record;
declare first_reached timestamptz;
begin
  if tg_op = 'DELETE' then affected_user := old.user_id;
  else affected_user := new.user_id;
  end if;
  for b in select id,starts_at,ends_at,target_value from public.run_battles
    where kind = 'first_to_distance' and affected_user = any(participant_ids)
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
      on conflict (battle_id,user_id) do update set reached_at = excluded.reached_at;
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
