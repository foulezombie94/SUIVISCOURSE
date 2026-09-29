insert into public.achievements(code,title,description)
values ('challenge_finisher','Défi relevé','Terminer un Challenge Élan ou entre amis.');

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('friend_accepted','battle_invite','challenge_invite',
    'run_together_invite','goal_complete','challenge_complete'));

create function private.complete_challenge(p_user uuid,p_challenge uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare c record;
declare current_progress double precision;
declare start_time timestamptz;
declare end_time timestamptz;
begin
  select * into c from public.challenges where id = p_challenge;
  if not found then return; end if;
  if not exists (select 1 from public.challenge_members
    where challenge_id = p_challenge and user_id = p_user and status = 'accepted') then return; end if;
  start_time := case when c.recurrence = 'monthly' then date_trunc('month',now()) else c.starts_at end;
  end_time := case when c.recurrence = 'monthly' then date_trunc('month',now()) + interval '1 month' else c.ends_at end;
  select coalesce(sum(case when c.kind = 'distance' then distance_meters else 1 end),0)
    into current_progress from public.activity_shares
    where user_id = p_user and activity_type = 'running'
      and started_at >= start_time and started_at < end_time;
  if current_progress < c.target_value then return; end if;
  insert into public.user_achievements(user_id,code)
  values (p_user,'challenge_finisher') on conflict do nothing;
  insert into public.notifications(user_id,kind,entity_id,title,body,dedupe_key)
  values (p_user,'challenge_complete',p_challenge,'Challenge réussi',c.title,
    'challenge-complete:' || p_challenge::text || ':' || start_time::date::text)
  on conflict do nothing;
end;
$$;
revoke all on function private.complete_challenge(uuid,uuid) from public,anon,authenticated;

create function private.award_shared_challenges() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare membership record;
begin
  for membership in select challenge_id from public.challenge_members
    where user_id = new.user_id and status = 'accepted'
  loop
    perform private.complete_challenge(new.user_id,membership.challenge_id);
  end loop;
  return new;
end;
$$;
revoke all on function private.award_shared_challenges() from public,anon,authenticated;
create trigger award_shared_challenges after insert or update of distance_meters,started_at
on public.activity_shares for each row execute function private.award_shared_challenges();

create function private.award_joined_challenge() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'accepted' then
    perform private.complete_challenge(new.user_id,new.challenge_id);
  end if;
  return new;
end;
$$;
revoke all on function private.award_joined_challenge() from public,anon,authenticated;
create trigger award_joined_challenge after insert or update of status
on public.challenge_members for each row execute function private.award_joined_challenge();
