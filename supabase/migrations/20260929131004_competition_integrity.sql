-- Keep submitted activity metrics immutable after initial sync and classify implausible runs.
create function private.classify_activity() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.verification_status := case
    when new.distance_meters > new.moving_seconds * 12
      or new.distance_meters > 300000
      or new.elapsed_seconds > 172800
      or (new.distance_meters > 100 and new.moving_seconds < 1)
      then 'suspicious'
    else 'normal'
  end;
  return new;
end;
$$;
revoke all on function private.classify_activity() from public,anon,authenticated;
create trigger classify_activity before insert on public.activities
for each row execute function private.classify_activity();

revoke update on public.activities from authenticated;
grant update (visibility,title,shared_route,hide_radius_meters) on public.activities to authenticated;
