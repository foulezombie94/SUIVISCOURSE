-- Tighten client writes and invitation limits without changing existing API shapes.
revoke update on public.friend_requests from authenticated;
grant update (status) on public.friend_requests to authenticated;

alter table public.activity_points add constraint activity_points_sequence_limit check (sequence < 50000);
alter table public.activity_splits add constraint activity_splits_kilometer_limit check (kilometer <= 300);

create function private.limit_social_creations() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare recent_count integer;
declare actor uuid;
begin
  actor := case when tg_table_name = 'friend_requests' then new.sender_id
    when tg_table_name = 'activity_participants' then new.host_id else new.creator_id end;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 4417));
  if tg_table_name = 'friend_requests' then
    select count(*) into recent_count from public.friend_requests
      where sender_id = actor and created_at >= now() - interval '1 day';
    if recent_count >= 20 then raise exception 'Daily friend request limit reached'; end if;
  elsif tg_table_name = 'run_battles' then
    select count(*) into recent_count from public.run_battles
      where creator_id = actor and created_at >= now() - interval '1 day';
    if recent_count >= 5 then raise exception 'Daily battle limit reached'; end if;
    if cardinality(array_positions(new.participant_ids,new.creator_id)) <> 1 then
      raise exception 'Creator must appear exactly once';
    end if;
  elsif tg_table_name = 'challenges' then
    select count(*) into recent_count from public.challenges
      where creator_id = actor and created_at >= now() - interval '1 day';
    if recent_count >= 5 then raise exception 'Daily challenge limit reached'; end if;
  else
    select count(*) into recent_count from public.activity_participants
      where host_id = actor and invited_at >= now() - interval '1 day';
    if recent_count >= 30 then raise exception 'Daily Run Together invitation limit reached'; end if;
  end if;
  return new;
end;
$$;
revoke all on function private.limit_social_creations() from public,anon,authenticated;
create index activity_participants_host_invited_idx
  on public.activity_participants(host_id,invited_at desc);
create trigger limit_friend_requests before insert on public.friend_requests
  for each row execute function private.limit_social_creations();
create trigger limit_battles before insert on public.run_battles
  for each row execute function private.limit_social_creations();
create trigger limit_challenges before insert on public.challenges
  for each row when (not new.is_official) execute function private.limit_social_creations();
create trigger limit_run_together before insert on public.activity_participants
  for each row execute function private.limit_social_creations();

-- Invited and declined users do not enter competition totals until accepting.
create or replace function public.battle_progress(p_battle_id uuid)
returns table(user_id uuid,status text,distance_meters double precision,run_count bigint,best_5k_seconds integer,best_10k_seconds integer)
language sql stable security invoker set search_path = ''
as $$
  select m.user_id,m.status,coalesce(sum(s.distance_meters),0)::double precision,
    count(s.activity_id),min(s.best_5k_seconds),min(s.best_10k_seconds)
  from public.battle_members m join public.run_battles b on b.id = m.battle_id
  left join public.activity_shares s on s.user_id = m.user_id
    and m.status = 'accepted' and s.activity_type = 'running'
    and s.started_at >= b.starts_at and s.started_at < b.ends_at
  where m.battle_id = p_battle_id and (select auth.uid()) = any(b.participant_ids)
  group by m.user_id,m.status;
$$;

create or replace function public.challenge_progress(p_challenge_id uuid)
returns table(user_id uuid,status text,progress double precision)
language sql stable security invoker set search_path = ''
as $$
  select m.user_id,m.status,
    coalesce(sum(case when s.activity_id is null then 0
      when c.kind = 'distance' then s.distance_meters else 1 end),0)::double precision
  from public.challenge_members m join public.challenges c on c.id = m.challenge_id
  left join public.activity_shares s on s.user_id = m.user_id
    and m.status = 'accepted' and s.activity_type = 'running'
    and s.started_at >= case when c.recurrence = 'monthly' then date_trunc('month',now()) else c.starts_at end
    and s.started_at < case when c.recurrence = 'monthly' then date_trunc('month',now()) + interval '1 month' else c.ends_at end
  where m.challenge_id = p_challenge_id and exists (
    select 1 from public.challenges visible where visible.id = p_challenge_id
  )
  group by m.user_id,m.status;
$$;

create or replace function public.my_goal_progress()
returns table(goal_id uuid,kind text,period text,target_value double precision,progress double precision,period_end timestamptz)
language sql stable security invoker set search_path = ''
as $$
  select g.id,g.kind,g.period,g.target_value,
    case when g.kind in ('best_5k','best_10k') then (
      select r.value from public.personal_records r where r.user_id = g.user_id
        and r.record_type = case when g.kind = 'best_5k' then 'fastest_5k' else 'fastest_10k' end
    ) else coalesce(sum(case when a.id is null then 0
      when g.kind = 'distance' then a.distance_meters else 1 end),0)::double precision end,
    case when g.period = 'week' then date_trunc('week',now()) + interval '1 week'
      when g.period = 'month' then date_trunc('month',now()) + interval '1 month'
      else null end
  from public.goals g
  left join public.activities a on a.user_id = g.user_id and a.activity_type = 'running'
    and a.verification_status = 'normal' and a.distance_meters > 0
    and g.period in ('week','month')
    and a.started_at >= case when g.period = 'week' then date_trunc('week',now()) else date_trunc('month',now()) end
    and a.started_at < case when g.period = 'week' then date_trunc('week',now()) + interval '1 week'
      else date_trunc('month',now()) + interval '1 month' end
  where g.user_id = (select auth.uid())
  group by g.id,g.kind,g.period,g.target_value,g.user_id;
$$;

-- A split batch refreshes its shared summary once, rather than once per split.
drop trigger update_shared_split_bests on public.activity_splits;
create or replace function private.update_shared_split_bests() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare affected_id uuid;
declare best5 integer;
declare best10 integer;
begin
  for affected_id in select distinct activity_id from inserted_splits loop
    select min(case when count5 = 5 and kilometer - first5 = 4 then total5 end)::integer,
      min(case when count10 = 10 and kilometer - first10 = 9 then total10 end)::integer
      into best5,best10
    from (
      select kilometer,
        sum(moving_seconds) over (order by kilometer rows between 4 preceding and current row) total5,
        count(*) over (order by kilometer rows between 4 preceding and current row) count5,
        min(kilometer) over (order by kilometer rows between 4 preceding and current row) first5,
        sum(moving_seconds) over (order by kilometer rows between 9 preceding and current row) total10,
        count(*) over (order by kilometer rows between 9 preceding and current row) count10,
        min(kilometer) over (order by kilometer rows between 9 preceding and current row) first10
      from public.activity_splits where activity_id = affected_id
    ) windows;
    update public.activity_shares set best_5k_seconds = best5,best_10k_seconds = best10
      where activity_id = affected_id
        and (best_5k_seconds,best_10k_seconds) is distinct from (best5,best10);
  end loop;
  return null;
end;
$$;
create trigger update_shared_split_bests after insert on public.activity_splits
  referencing new table as inserted_splits for each statement
  execute function private.update_shared_split_bests();

-- A score is an immutable presentation value; retries keep the first result.
revoke update on public.run_scores from authenticated;
drop policy scores_update on public.run_scores;
drop trigger sync_share_score on public.run_scores;
create trigger sync_share_score after insert on public.run_scores
  for each row execute function private.sync_share_score();
