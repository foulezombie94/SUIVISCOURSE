-- Resolve each table's actor column only in its own trigger branch.
create or replace function private.limit_social_creations() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare recent_count integer;
declare actor uuid;
begin
  if tg_table_name = 'friend_requests' then
    actor := new.sender_id;
  elsif tg_table_name = 'activity_participants' then
    actor := new.host_id;
  else
    actor := new.creator_id;
  end if;
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
  elsif tg_table_name = 'activity_participants' then
    select count(*) into recent_count from public.activity_participants
      where host_id = actor and invited_at >= now() - interval '1 day';
    if recent_count >= 30 then raise exception 'Daily Run Together invitation limit reached'; end if;
  end if;
  return new;
end;
$$;
