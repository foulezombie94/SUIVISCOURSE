-- Phase 2: private friend summaries, progression, invitations and in-app notifications.
-- Full GPS points stay readable by their owner only.
drop policy activity_read on public.activities;
create policy activity_read on public.activities for select to authenticated
using (user_id = (select auth.uid()));

create table public.activity_shares (
  activity_id uuid primary key references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null,
  title text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  distance_meters double precision not null,
  moving_seconds integer not null,
  elapsed_seconds integer not null,
  average_pace_sec_per_km double precision,
  elevation_gain_meters double precision not null,
  run_score integer check (run_score between 0 and 100),
  best_5k_seconds integer check (best_5k_seconds > 0),
  best_10k_seconds integer check (best_10k_seconds > 0)
);
create index activity_shares_owner_date_idx on public.activity_shares(user_id,started_at desc);
create index activity_shares_date_idx on public.activity_shares(started_at desc);
alter table public.activity_shares enable row level security;
create policy shares_read on public.activity_shares for select to authenticated using (
  user_id = (select auth.uid()) or exists (
    select 1 from public.friendships f
    where (f.user_a = user_id and f.user_b = (select auth.uid()))
       or (f.user_b = user_id and f.user_a = (select auth.uid()))
  )
);
grant select on public.activity_shares to authenticated;

create function private.sync_activity_share() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.visibility = 'friends' and new.verification_status = 'normal' then
    insert into public.activity_shares (
      activity_id,user_id,activity_type,title,started_at,ended_at,distance_meters,
      moving_seconds,elapsed_seconds,average_pace_sec_per_km,elevation_gain_meters
    ) values (
      new.id,new.user_id,new.activity_type,new.title,new.started_at,new.ended_at,new.distance_meters,
      new.moving_seconds,new.elapsed_seconds,new.average_pace_sec_per_km,new.elevation_gain_meters
    ) on conflict (activity_id) do update set
      activity_type = excluded.activity_type, title = excluded.title,
      started_at = excluded.started_at, ended_at = excluded.ended_at,
      distance_meters = excluded.distance_meters, moving_seconds = excluded.moving_seconds,
      elapsed_seconds = excluded.elapsed_seconds,
      average_pace_sec_per_km = excluded.average_pace_sec_per_km,
      elevation_gain_meters = excluded.elevation_gain_meters;
  else
    delete from public.activity_shares where activity_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_activity_share() from public,anon,authenticated;
create trigger sync_activity_share after insert or update on public.activities
for each row execute function private.sync_activity_share();

-- Existing phase-1 activities may already be shared.
insert into public.activity_shares (
  activity_id,user_id,activity_type,title,started_at,ended_at,distance_meters,
  moving_seconds,elapsed_seconds,average_pace_sec_per_km,elevation_gain_meters
)
select id,user_id,activity_type,title,started_at,ended_at,distance_meters,
  moving_seconds,elapsed_seconds,average_pace_sec_per_km,elevation_gain_meters
from public.activities where visibility = 'friends' and verification_status = 'normal'
on conflict (activity_id) do nothing;

create table public.run_scores (
  activity_id uuid primary key,
  user_id uuid not null,
  score integer not null check (score between 0 and 100),
  consistency integer not null check (consistency between 0 and 100),
  progress integer not null check (progress between 0 and 100),
  endurance integer not null check (endurance between 0 and 100),
  created_at timestamptz not null default now(),
  foreign key (activity_id,user_id) references public.activities(id,user_id) on delete cascade
);
create index run_scores_owner_idx on public.run_scores(user_id,created_at desc);
alter table public.run_scores enable row level security;
create policy scores_read on public.run_scores for select to authenticated
using (user_id = (select auth.uid()));
create policy scores_insert on public.run_scores for insert to authenticated
with check (user_id = (select auth.uid()));
create policy scores_update on public.run_scores for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select,insert,update on public.run_scores to authenticated;

create function private.sync_share_score() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.activity_shares set run_score = new.score where activity_id = new.activity_id;
  return new;
end;
$$;
revoke all on function private.sync_share_score() from public,anon,authenticated;
create trigger sync_share_score after insert or update on public.run_scores
for each row execute function private.sync_share_score();

create table public.achievements (
  code text primary key,
  title text not null,
  description text not null
);
insert into public.achievements(code,title,description) values
('first_run','Premier départ','Terminer sa première course.'),
('first_5k','Premier 5 km','Parcourir 5 km en courant.'),
('first_10k','Premier 10 km','Parcourir 10 km en courant.'),
('total_100k','Cap des 100 km','Cumuler 100 km de running.'),
('early_bird','Lève-tôt','Courir avant 7 h.'),
('night_runner','Coureur de nuit','Courir après 21 h.'),
('consistency','Régularité','Terminer deux courses dans la même semaine.');
alter table public.achievements enable row level security;
create policy achievements_read on public.achievements for select to authenticated using (true);
grant select on public.achievements to authenticated;

create table public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null references public.achievements(code),
  activity_id uuid references public.activities(id) on delete set null,
  awarded_at timestamptz not null default now(),
  primary key (user_id,code)
);
create index user_achievements_activity_idx on public.user_achievements(activity_id);
alter table public.user_achievements enable row level security;
create policy my_achievements on public.user_achievements for select to authenticated
using (user_id = (select auth.uid()));
grant select on public.user_achievements to authenticated;

create function private.award_activity_badges() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare total_distance double precision;
declare week_runs integer;
begin
  if new.activity_type <> 'running' or new.distance_meters <= 0 then return new; end if;
  insert into public.user_achievements(user_id,code,activity_id)
  values (new.user_id,'first_run',new.id) on conflict do nothing;
  if new.distance_meters >= 5000 then
    insert into public.user_achievements(user_id,code,activity_id)
    values (new.user_id,'first_5k',new.id) on conflict do nothing;
  end if;
  if new.distance_meters >= 10000 then
    insert into public.user_achievements(user_id,code,activity_id)
    values (new.user_id,'first_10k',new.id) on conflict do nothing;
  end if;
  select coalesce(sum(distance_meters),0) into total_distance from public.activities
  where user_id = new.user_id and activity_type = 'running';
  if total_distance >= 100000 then
    insert into public.user_achievements(user_id,code,activity_id)
    values (new.user_id,'total_100k',new.id) on conflict do nothing;
  end if;
  if extract(hour from new.started_at at time zone 'Europe/Paris') < 7 then
    insert into public.user_achievements(user_id,code,activity_id)
    values (new.user_id,'early_bird',new.id) on conflict do nothing;
  end if;
  if extract(hour from new.started_at at time zone 'Europe/Paris') >= 21 then
    insert into public.user_achievements(user_id,code,activity_id)
    values (new.user_id,'night_runner',new.id) on conflict do nothing;
  end if;
  select count(*) into week_runs from public.activities
  where user_id = new.user_id and activity_type = 'running'
    and started_at >= date_trunc('week',new.started_at)
    and started_at < date_trunc('week',new.started_at) + interval '1 week';
  if week_runs >= 2 then
    insert into public.user_achievements(user_id,code,activity_id)
    values (new.user_id,'consistency',new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.award_activity_badges() from public,anon,authenticated;
create trigger award_activity_badges after insert on public.activities
for each row execute function private.award_activity_badges();

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('distance','runs')),
  period text not null check (period in ('week','month')),
  target_value double precision not null check (target_value > 0 and target_value <= 1000000),
  created_at timestamptz not null default now(),
  unique (user_id,kind,period)
);
create index goals_owner_idx on public.goals(user_id);
alter table public.goals enable row level security;
create policy own_goals_read on public.goals for select to authenticated using (user_id = (select auth.uid()));
create policy own_goals_insert on public.goals for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_goals_update on public.goals for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_goals_delete on public.goals for delete to authenticated using (user_id = (select auth.uid()));
grant select,insert,update,delete on public.goals to authenticated;

create function public.my_goal_progress()
returns table(goal_id uuid,kind text,period text,target_value double precision,progress double precision,period_end timestamptz)
language sql stable security invoker set search_path = ''
as $$
  select g.id,g.kind,g.period,g.target_value,
    coalesce(sum(case when a.id is null then 0 when g.kind = 'distance' then a.distance_meters else 1 end),0)::double precision,
    case when g.period = 'week' then date_trunc('week',now()) + interval '1 week'
      else date_trunc('month',now()) + interval '1 month' end
  from public.goals g
  left join public.activities a on a.user_id = g.user_id and a.activity_type = 'running'
    and a.started_at >= case when g.period = 'week' then date_trunc('week',now()) else date_trunc('month',now()) end
    and a.started_at < case when g.period = 'week' then date_trunc('week',now()) + interval '1 week'
      else date_trunc('month',now()) + interval '1 month' end
  where g.user_id = (select auth.uid())
  group by g.id,g.kind,g.period,g.target_value;
$$;
revoke all on function public.my_goal_progress() from public,anon;
grant execute on function public.my_goal_progress() to authenticated;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('friend_accepted','battle_invite','challenge_invite','run_together_invite','goal_complete')),
  entity_id uuid,
  title text not null,
  body text not null,
  dedupe_key text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id,dedupe_key)
);
create index notifications_owner_date_idx on public.notifications(user_id,created_at desc);
create index notifications_unread_idx on public.notifications(user_id,created_at desc) where read_at is null;
alter table public.notifications enable row level security;
create policy own_notifications_read on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy own_notifications_update on public.notifications for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create function private.notify_friend_acceptance() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status = 'accepted' then
    insert into public.notifications(user_id,actor_id,kind,entity_id,title,body,dedupe_key)
    values (new.sender_id,new.receiver_id,'friend_accepted',new.id,
      'Demande acceptée','Vous êtes maintenant amis.','friend:' || new.id::text)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.notify_friend_acceptance() from public,anon,authenticated;
create trigger notify_friend_acceptance after update on public.friend_requests
for each row execute function private.notify_friend_acceptance();

create function private.notify_goal_completion() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare g record;
declare progress double precision;
declare period_start timestamptz;
begin
  if new.activity_type <> 'running' or new.distance_meters <= 0 then return new; end if;
  for g in select * from public.goals where user_id = new.user_id loop
    period_start := case when g.period = 'week' then date_trunc('week',new.started_at)
      else date_trunc('month',new.started_at) end;
    select coalesce(sum(case when g.kind = 'distance' then distance_meters else 1 end),0)
      into progress from public.activities
      where user_id = new.user_id and activity_type = 'running'
        and started_at >= period_start
        and started_at < period_start + case when g.period = 'week' then interval '1 week' else interval '1 month' end;
    if progress >= g.target_value then
      insert into public.notifications(user_id,kind,entity_id,title,body,dedupe_key)
      values (new.user_id,'goal_complete',g.id,'Objectif atteint','Bravo, ton objectif est atteint.',
        'goal:' || g.id::text || ':' || period_start::date::text)
      on conflict do nothing;
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function private.notify_goal_completion() from public,anon,authenticated;
create trigger notify_goal_completion after insert on public.activities
for each row execute function private.notify_goal_completion();

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  kind text not null check (kind in ('distance','runs')),
  target_value double precision not null check (target_value > 0 and target_value <= 1000000),
  is_official boolean not null default false,
  recurrence text not null default 'once' check (recurrence in ('once','monthly')),
  starts_at timestamptz,
  ends_at timestamptz,
  invited_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  check ((is_official and creator_id is null and recurrence = 'monthly' and starts_at is null and ends_at is null)
    or (not is_official and creator_id is not null and recurrence = 'once'
      and starts_at is not null and ends_at is not null and ends_at > starts_at))
);
create index challenges_creator_idx on public.challenges(creator_id,created_at desc);
create index challenges_invited_idx on public.challenges using gin(invited_ids);
alter table public.challenges enable row level security;
create policy challenge_read on public.challenges for select to authenticated using (
  is_official or creator_id = (select auth.uid()) or (select auth.uid()) = any(invited_ids)
);
create policy challenge_create on public.challenges for insert to authenticated with check (
  creator_id = (select auth.uid()) and not is_official and recurrence = 'once'
  and cardinality(invited_ids) between 1 and 4
  and (select auth.uid()) <> all(invited_ids)
);
grant select on public.challenges to authenticated;
grant insert (creator_id,title,kind,target_value,starts_at,ends_at,invited_ids) on public.challenges to authenticated;

create table public.challenge_members (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('invited','accepted','declined')),
  joined_at timestamptz not null default now(),
  primary key (challenge_id,user_id)
);
create index challenge_members_user_idx on public.challenge_members(user_id,status);
alter table public.challenge_members enable row level security;
create policy challenge_member_read on public.challenge_members for select to authenticated using (
  user_id = (select auth.uid()) or exists (
    select 1 from public.challenges c where c.id = challenge_id and not c.is_official
  ) or exists (
    select 1 from public.friendships f where f.user_a = least(user_id,(select auth.uid()))
      and f.user_b = greatest(user_id,(select auth.uid()))
  )
);
create policy challenge_member_join_official on public.challenge_members for insert to authenticated with check (
  user_id = (select auth.uid()) and status = 'accepted'
  and exists (select 1 from public.challenges c where c.id = challenge_id and c.is_official)
);
create policy challenge_member_answer on public.challenge_members for update to authenticated
using (user_id = (select auth.uid()) and status = 'invited')
with check (user_id = (select auth.uid()) and status in ('accepted','declined'));
grant select,insert on public.challenge_members to authenticated;
grant update (status) on public.challenge_members to authenticated;

insert into public.challenges(title,kind,target_value,is_official,recurrence)
values ('50 km ce mois','distance',50000,true,'monthly'),
       ('3 courses ce mois','runs',3,true,'monthly');

create table public.run_battles (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('first_to_distance','most_distance','most_runs','best_5k','best_10k')),
  target_value double precision check (target_value > 0 and target_value <= 1000000),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  participant_ids uuid[] not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '31 days'),
  check ((kind = 'first_to_distance' and target_value is not null) or (kind <> 'first_to_distance' and target_value is null))
);
create index run_battles_creator_idx on public.run_battles(creator_id,created_at desc);
create index run_battles_participants_idx on public.run_battles using gin(participant_ids);
alter table public.run_battles enable row level security;
create policy battle_read on public.run_battles for select to authenticated
using ((select auth.uid()) = any(participant_ids));
create policy battle_create on public.run_battles for insert to authenticated with check (
  creator_id = (select auth.uid()) and cardinality(participant_ids) between 2 and 5
  and creator_id = any(participant_ids)
);
grant select,insert on public.run_battles to authenticated;

create table public.battle_members (
  battle_id uuid not null references public.run_battles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('invited','accepted','declined')),
  joined_at timestamptz not null default now(),
  primary key (battle_id,user_id)
);
create index battle_members_user_idx on public.battle_members(user_id,status);
alter table public.battle_members enable row level security;
create policy battle_member_read on public.battle_members for select to authenticated using (
  exists (select 1 from public.run_battles b where b.id = battle_id)
);
create policy battle_member_answer on public.battle_members for update to authenticated
using (user_id = (select auth.uid()) and status = 'invited')
with check (user_id = (select auth.uid()) and status in ('accepted','declined'));
grant select on public.battle_members to authenticated;
grant update (status) on public.battle_members to authenticated;

create function private.validate_friend_ids(owner_id uuid, other_ids uuid[]) returns boolean
language sql stable security definer set search_path = ''
as $$
  select cardinality(other_ids) = (select count(distinct x) from unnest(other_ids) x)
    and not owner_id = any(other_ids)
    and not exists (
      select 1 from unnest(other_ids) x
      where not exists (
        select 1 from public.friendships f
        where (f.user_a = least(owner_id,x) and f.user_b = greatest(owner_id,x))
      )
    );
$$;
revoke all on function private.validate_friend_ids(uuid,uuid[]) from public,anon,authenticated;

create function private.setup_challenge_members() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare invited uuid;
begin
  if new.is_official then return new; end if;
  if not private.validate_friend_ids(new.creator_id,new.invited_ids) then
    raise exception 'Only distinct friends may be invited';
  end if;
  insert into public.challenge_members(challenge_id,user_id,status)
  values (new.id,new.creator_id,'accepted');
  foreach invited in array new.invited_ids loop
    insert into public.challenge_members(challenge_id,user_id,status) values (new.id,invited,'invited');
    insert into public.notifications(user_id,actor_id,kind,entity_id,title,body,dedupe_key)
    values (invited,new.creator_id,'challenge_invite',new.id,'Nouveau challenge',new.title,
      'challenge:' || new.id::text) on conflict do nothing;
  end loop;
  return new;
end;
$$;
revoke all on function private.setup_challenge_members() from public,anon,authenticated;
create trigger setup_challenge_members after insert on public.challenges
for each row execute function private.setup_challenge_members();

create function private.setup_battle_members() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare invited uuid;
declare others uuid[];
begin
  select array_agg(x) into others from unnest(new.participant_ids) x where x <> new.creator_id;
  if not private.validate_friend_ids(new.creator_id,others) then
    raise exception 'Only distinct friends may be invited';
  end if;
  insert into public.battle_members(battle_id,user_id,status)
  values (new.id,new.creator_id,'accepted');
  foreach invited in array others loop
    insert into public.battle_members(battle_id,user_id,status) values (new.id,invited,'invited');
    insert into public.notifications(user_id,actor_id,kind,entity_id,title,body,dedupe_key)
    values (invited,new.creator_id,'battle_invite',new.id,'Nouveau Battle','Un ami te défie.',
      'battle:' || new.id::text) on conflict do nothing;
  end loop;
  return new;
end;
$$;
revoke all on function private.setup_battle_members() from public,anon,authenticated;
create trigger setup_battle_members after insert on public.run_battles
for each row execute function private.setup_battle_members();

create table public.activity_participants (
  activity_id uuid not null,
  host_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited','accepted','declined')),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (activity_id,user_id),
  foreign key (activity_id,host_id) references public.activities(id,user_id) on delete cascade,
  check (host_id <> user_id)
);
create index activity_participants_user_idx on public.activity_participants(user_id,status);
create index activity_participants_activity_host_idx on public.activity_participants(activity_id,host_id);
alter table public.activity_participants enable row level security;
create policy participant_read on public.activity_participants for select to authenticated
using (host_id = (select auth.uid()) or user_id = (select auth.uid()));
create policy participant_invite on public.activity_participants for insert to authenticated with check (
  host_id = (select auth.uid()) and status = 'invited'
  and exists (select 1 from public.friendships f where f.user_a = least(host_id,user_id)
    and f.user_b = greatest(host_id,user_id))
  and exists (select 1 from public.activities a where a.id = activity_id
    and a.user_id = host_id and a.visibility = 'friends')
);
create policy participant_answer on public.activity_participants for update to authenticated
using (user_id = (select auth.uid()) and status = 'invited')
with check (user_id = (select auth.uid()) and status in ('accepted','declined'));
grant select,insert on public.activity_participants to authenticated;
grant update (status,responded_at) on public.activity_participants to authenticated;

create function private.notify_run_together() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notifications(user_id,actor_id,kind,entity_id,title,body,dedupe_key)
  values (new.user_id,new.host_id,'run_together_invite',new.activity_id,
    'Run Together','Un ami t''invite à confirmer une course ensemble.',
    'together:' || new.activity_id::text || ':' || new.user_id::text)
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.notify_run_together() from public,anon,authenticated;
create trigger notify_run_together after insert on public.activity_participants
for each row execute function private.notify_run_together();

-- Five and ten kilometer marks are calculated from private splits on the server.
create function private.update_shared_split_bests() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare best5 integer;
declare best10 integer;
begin
  select min(total)::integer into best5 from (
    select sum(moving_seconds) over (order by kilometer rows between 4 preceding and current row) total,
      row_number() over (order by kilometer) rn
    from public.activity_splits where activity_id = new.activity_id
  ) s where rn >= 5;
  select min(total)::integer into best10 from (
    select sum(moving_seconds) over (order by kilometer rows between 9 preceding and current row) total,
      row_number() over (order by kilometer) rn
    from public.activity_splits where activity_id = new.activity_id
  ) s where rn >= 10;
  update public.activity_shares set best_5k_seconds = best5,best_10k_seconds = best10
    where activity_id = new.activity_id;
  return new;
end;
$$;
revoke all on function private.update_shared_split_bests() from public,anon,authenticated;
create trigger update_shared_split_bests after insert on public.activity_splits
for each row execute function private.update_shared_split_bests();

create function private.refresh_shared_metrics() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare best5 integer;
declare best10 integer;
begin
  select min(total)::integer into best5 from (
    select sum(moving_seconds) over (order by kilometer rows between 4 preceding and current row) total,
      row_number() over (order by kilometer) rn
    from public.activity_splits where activity_id = new.activity_id
  ) s where rn >= 5;
  select min(total)::integer into best10 from (
    select sum(moving_seconds) over (order by kilometer rows between 9 preceding and current row) total,
      row_number() over (order by kilometer) rn
    from public.activity_splits where activity_id = new.activity_id
  ) s where rn >= 10;
  update public.activity_shares set
    run_score = (select score from public.run_scores where activity_id = new.activity_id),
    best_5k_seconds = best5, best_10k_seconds = best10
  where activity_id = new.activity_id;
  return new;
end;
$$;
revoke all on function private.refresh_shared_metrics() from public,anon,authenticated;
create trigger refresh_shared_metrics after insert or update of title,started_at,distance_meters
on public.activity_shares for each row execute function private.refresh_shared_metrics();

-- A leaderboard uses only opted-in friend summaries, plus the user's own activities.
create function public.friend_leaderboard(p_start timestamptz,p_end timestamptz)
returns table(user_id uuid,distance_meters double precision,run_count bigint)
language sql stable security invoker set search_path = ''
as $$
  with allowed as (
    select (select auth.uid()) as id
    union
    select case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end
    from public.friendships f where f.user_a = (select auth.uid()) or f.user_b = (select auth.uid())
  ), counted as (
    select a.user_id,a.distance_meters from public.activities a
    where a.user_id = (select auth.uid()) and a.activity_type = 'running'
      and a.started_at >= p_start and a.started_at < p_end
    union all
    select s.user_id,s.distance_meters from public.activity_shares s
    where s.user_id <> (select auth.uid()) and s.activity_type = 'running'
      and s.started_at >= p_start and s.started_at < p_end
  )
  select allowed.id,coalesce(sum(counted.distance_meters),0)::double precision,count(counted.user_id)
  from allowed left join counted on counted.user_id = allowed.id
  where p_end > p_start and p_end <= p_start + interval '370 days'
  group by allowed.id order by 2 desc;
$$;
revoke all on function public.friend_leaderboard(timestamptz,timestamptz) from public,anon;
grant execute on function public.friend_leaderboard(timestamptz,timestamptz) to authenticated;

create function public.battle_progress(p_battle_id uuid)
returns table(user_id uuid,status text,distance_meters double precision,run_count bigint,best_5k_seconds integer,best_10k_seconds integer)
language sql stable security invoker set search_path = ''
as $$
  select m.user_id,m.status,coalesce(sum(s.distance_meters),0)::double precision,
    count(s.activity_id),min(s.best_5k_seconds),min(s.best_10k_seconds)
  from public.battle_members m join public.run_battles b on b.id = m.battle_id
  left join (
    select activity_id,user_id,activity_type,started_at,distance_meters,best_5k_seconds,best_10k_seconds
      from public.activity_shares where user_id <> (select auth.uid())
    union all
    select a.id,a.user_id,a.activity_type,a.started_at,a.distance_meters,
      (select min(total)::integer from (
        select sum(x.moving_seconds) over (order by x.kilometer rows between 4 preceding and current row) total,
          row_number() over (order by x.kilometer) rn
        from public.activity_splits x where x.activity_id = a.id
      ) w where rn >= 5),
      (select min(total)::integer from (
        select sum(x.moving_seconds) over (order by x.kilometer rows between 9 preceding and current row) total,
          row_number() over (order by x.kilometer) rn
        from public.activity_splits x where x.activity_id = a.id
      ) w where rn >= 10)
    from public.activities a where a.user_id = (select auth.uid())
  ) s on s.user_id = m.user_id
    and s.activity_type = 'running' and s.started_at >= b.starts_at and s.started_at < b.ends_at
  where m.battle_id = p_battle_id and (select auth.uid()) = any(b.participant_ids)
  group by m.user_id,m.status;
$$;
revoke all on function public.battle_progress(uuid) from public,anon;
grant execute on function public.battle_progress(uuid) to authenticated;

create function public.challenge_progress(p_challenge_id uuid)
returns table(user_id uuid,status text,progress double precision)
language sql stable security invoker set search_path = ''
as $$
  select m.user_id,m.status,
    coalesce(sum(case when s.activity_id is null then 0 when c.kind = 'distance' then s.distance_meters else 1 end),0)::double precision
  from public.challenge_members m join public.challenges c on c.id = m.challenge_id
  left join (
    select activity_id,user_id,activity_type,started_at,distance_meters from public.activity_shares
      where user_id <> (select auth.uid())
    union all
    select id,user_id,activity_type,started_at,distance_meters from public.activities
      where user_id = (select auth.uid())
  ) s on s.user_id = m.user_id and s.activity_type = 'running'
    and s.started_at >= case when c.recurrence = 'monthly' then date_trunc('month',now()) else c.starts_at end
    and s.started_at < case when c.recurrence = 'monthly' then date_trunc('month',now()) + interval '1 month' else c.ends_at end
  where m.challenge_id = p_challenge_id and exists (
    select 1 from public.challenges visible where visible.id = p_challenge_id
  )
  group by m.user_id,m.status;
$$;
revoke all on function public.challenge_progress(uuid) from public,anon;
grant execute on function public.challenge_progress(uuid) to authenticated;
