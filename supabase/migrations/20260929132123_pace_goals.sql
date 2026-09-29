alter table public.goals drop constraint goals_kind_check;
alter table public.goals add constraint goals_kind_check
  check (kind in ('distance','runs','best_5k','best_10k'));
alter table public.goals drop constraint goals_period_check;
alter table public.goals add constraint goals_period_check
  check (period in ('week','month','all_time'));
alter table public.goals add constraint goals_kind_period_check
  check ((kind in ('distance','runs') and period in ('week','month'))
    or (kind in ('best_5k','best_10k') and period = 'all_time'));

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
    and g.period in ('week','month')
    and a.started_at >= case when g.period = 'week' then date_trunc('week',now()) else date_trunc('month',now()) end
    and a.started_at < case when g.period = 'week' then date_trunc('week',now()) + interval '1 week'
      else date_trunc('month',now()) + interval '1 month' end
  where g.user_id = (select auth.uid())
  group by g.id,g.kind,g.period,g.target_value,g.user_id;
$$;

create or replace function private.notify_goal_completion() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare g record;
declare progress double precision;
declare period_start timestamptz;
begin
  if new.activity_type <> 'running' or new.distance_meters <= 0 then return new; end if;
  for g in select * from public.goals where user_id = new.user_id and kind in ('distance','runs') loop
    period_start := case when g.period = 'week' then date_trunc('week',new.started_at)
      else date_trunc('month',new.started_at) end;
    select coalesce(sum(case when g.kind = 'distance' then distance_meters else 1 end),0)
      into progress from public.activities
      where user_id = new.user_id and activity_type = 'running'
        and verification_status = 'normal'
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

create function private.notify_pace_goal() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare g record;
begin
  for g in select * from public.goals where user_id = new.user_id
    and kind = case when new.record_type = 'fastest_5k' then 'best_5k'
      when new.record_type = 'fastest_10k' then 'best_10k' else '' end
    and target_value >= new.value
  loop
    insert into public.notifications(user_id,kind,entity_id,title,body,dedupe_key)
    values (new.user_id,'goal_complete',g.id,'Objectif chrono atteint',
      'Tu as atteint ton objectif de temps.','goal:' || g.id::text || ':all')
    on conflict do nothing;
  end loop;
  return new;
end;
$$;
revoke all on function private.notify_pace_goal() from public,anon,authenticated;
create trigger notify_pace_goal after insert or update of value on public.personal_records
for each row execute function private.notify_pace_goal();
