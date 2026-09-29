-- Close private-challenge membership visibility and keep competition metrics opt-in.
drop policy challenge_member_read on public.challenge_members;
create policy challenge_member_read on public.challenge_members for select to authenticated using (
  user_id = (select auth.uid()) or exists (
    select 1 from public.challenges c where c.id = challenge_id and not c.is_official
  ) or exists (
    select 1 from public.challenges c where c.id = challenge_id and c.is_official
      and exists (select 1 from public.friendships f
        where f.user_a = least(user_id,(select auth.uid()))
          and f.user_b = greatest(user_id,(select auth.uid())))
  )
);

create or replace function public.battle_progress(p_battle_id uuid)
returns table(user_id uuid,status text,distance_meters double precision,run_count bigint,best_5k_seconds integer,best_10k_seconds integer)
language sql stable security invoker set search_path = ''
as $$
  select m.user_id,m.status,coalesce(sum(s.distance_meters),0)::double precision,
    count(s.activity_id),min(s.best_5k_seconds),min(s.best_10k_seconds)
  from public.battle_members m join public.run_battles b on b.id = m.battle_id
  left join public.activity_shares s on s.user_id = m.user_id
    and s.activity_type = 'running' and s.started_at >= b.starts_at and s.started_at < b.ends_at
  where m.battle_id = p_battle_id and (select auth.uid()) = any(b.participant_ids)
  group by m.user_id,m.status;
$$;

create or replace function public.challenge_progress(p_challenge_id uuid)
returns table(user_id uuid,status text,progress double precision)
language sql stable security invoker set search_path = ''
as $$
  select m.user_id,m.status,
    coalesce(sum(case when s.activity_id is null then 0 when c.kind = 'distance' then s.distance_meters else 1 end),0)::double precision
  from public.challenge_members m join public.challenges c on c.id = m.challenge_id
  left join public.activity_shares s on s.user_id = m.user_id and s.activity_type = 'running'
    and s.started_at >= case when c.recurrence = 'monthly' then date_trunc('month',now()) else c.starts_at end
    and s.started_at < case when c.recurrence = 'monthly' then date_trunc('month',now()) + interval '1 month' else c.ends_at end
  where m.challenge_id = p_challenge_id and exists (
    select 1 from public.challenges visible where visible.id = p_challenge_id
  )
  group by m.user_id,m.status;
$$;

create index notifications_actor_idx on public.notifications(actor_id);
create index run_scores_activity_owner_fk_idx on public.run_scores(activity_id,user_id);
create index user_achievements_code_idx on public.user_achievements(code);

create table public.battle_milestones (
  battle_id uuid not null references public.run_battles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reached_at timestamptz not null,
  primary key (battle_id,user_id)
);
create index battle_milestones_user_idx on public.battle_milestones(user_id);
alter table public.battle_milestones enable row level security;
create policy battle_milestones_read on public.battle_milestones for select to authenticated using (
  exists (select 1 from public.run_battles b where b.id = battle_id)
);
grant select on public.battle_milestones to authenticated;

create function private.refresh_battle_milestones() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare affected_user uuid;
declare b record;
declare first_reached timestamptz;
begin
  affected_user := coalesce(new.user_id,old.user_id);
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
  return coalesce(new,old);
end;
$$;
revoke all on function private.refresh_battle_milestones() from public,anon,authenticated;
create trigger refresh_battle_milestones after insert or update of distance_meters,started_at,ended_at or delete
on public.activity_shares for each row execute function private.refresh_battle_milestones();
