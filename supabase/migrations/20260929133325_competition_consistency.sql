-- Only explicitly shared, plausible runs participate in friend rankings.
create or replace function public.friend_leaderboard(p_start timestamptz,p_end timestamptz)
returns table(user_id uuid,distance_meters double precision,run_count bigint)
language sql stable security invoker set search_path = ''
as $$
  with allowed as (
    select (select auth.uid()) as id
    union
    select case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end
    from public.friendships f where f.user_a = (select auth.uid()) or f.user_b = (select auth.uid())
  )
  select allowed.id,coalesce(sum(s.distance_meters),0)::double precision,count(s.activity_id)
  from allowed left join public.activity_shares s on s.user_id = allowed.id
    and s.activity_type = 'running' and s.started_at >= p_start and s.started_at < p_end
  where p_end > p_start and p_end <= p_start + interval '370 days'
  group by allowed.id order by 2 desc;
$$;

-- A split must fit inside its activity. This also caps malformed client uploads.
create function private.validate_activity_split() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare activity_row record;
begin
  select distance_meters,moving_seconds,elapsed_seconds into activity_row
    from public.activities where id = new.activity_id and user_id = new.user_id;
  if not found then raise exception 'Activity not found'; end if;
  if new.kilometer > floor(activity_row.distance_meters / 1000)
    or new.moving_seconds > activity_row.moving_seconds + 1
    or new.elapsed_seconds > activity_row.elapsed_seconds + 2 then
    raise exception 'Split exceeds activity metrics';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_activity_split() from public,anon,authenticated;
create trigger validate_activity_split before insert on public.activity_splits
  for each row execute function private.validate_activity_split();

-- Personal records must match the activity and the stored split data.
create function private.validate_personal_record() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare activity_row record;
declare expected double precision;
begin
  select activity_type,verification_status,distance_meters,ended_at into activity_row
    from public.activities where id = new.activity_id and user_id = new.user_id;
  if not found then raise exception 'Record activity not found'; end if;
  if activity_row.activity_type <> 'running'
    or activity_row.verification_status <> 'normal'
    or activity_row.ended_at <> new.achieved_at then
    raise exception 'Invalid record activity';
  end if;
  if new.record_type = 'longest_run' then
    expected := activity_row.distance_meters;
  elsif new.record_type = 'fastest_1k' then
    select min(moving_seconds)::double precision into expected
      from public.activity_splits where activity_id = new.activity_id;
  elsif new.record_type = 'fastest_5k' then
    select min(total)::double precision into expected from (
      select kilometer,
        sum(moving_seconds) over (order by kilometer rows between 4 preceding and current row) total,
        count(*) over (order by kilometer rows between 4 preceding and current row) n,
        min(kilometer) over (order by kilometer rows between 4 preceding and current row) first_km
      from public.activity_splits where activity_id = new.activity_id
    ) windows where n = 5 and kilometer - first_km = 4;
  elsif new.record_type = 'fastest_10k' then
    select min(total)::double precision into expected from (
      select kilometer,
        sum(moving_seconds) over (order by kilometer rows between 9 preceding and current row) total,
        count(*) over (order by kilometer rows between 9 preceding and current row) n,
        min(kilometer) over (order by kilometer rows between 9 preceding and current row) first_km
      from public.activity_splits where activity_id = new.activity_id
    ) windows where n = 10 and kilometer - first_km = 9;
  end if;
  if expected is null or abs(new.value - expected) > 0.001 then
    raise exception 'Record value does not match activity';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_personal_record() from public,anon,authenticated;
create trigger validate_personal_record before insert or update on public.personal_records
  for each row execute function private.validate_personal_record();

-- A first-to-distance result belongs only to someone who accepted the battle.
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
  for b in select battle.id,battle.starts_at,battle.ends_at,battle.target_value
    from public.run_battles battle
    join public.battle_members member on member.battle_id = battle.id
      and member.user_id = affected_user and member.status = 'accepted'
    where battle.kind = 'first_to_distance'
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
create trigger refresh_battle_milestones_on_accept after update of status on public.battle_members
  for each row when (new.status = 'accepted')
  execute function private.refresh_battle_milestones();

create or replace function private.classify_activity() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.verification_status := case
    when new.distance_meters > new.moving_seconds * 12
      or new.distance_meters > 300000
      or new.elapsed_seconds > 172800
      or (new.distance_meters > 100 and new.moving_seconds < 1)
      or abs(extract(epoch from (new.ended_at - new.started_at)) - new.elapsed_seconds) > 60
      or new.ended_at > now() + interval '5 minutes'
      then 'suspicious'
    else 'normal'
  end;
  return new;
end;
$$;
