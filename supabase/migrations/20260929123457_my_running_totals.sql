create function public.my_running_totals()
returns table(run_count bigint, total_distance_meters double precision, total_elapsed_seconds bigint)
language sql security invoker set search_path = ''
as $$
  select count(*)::bigint,
    coalesce(sum(a.distance_meters),0)::double precision,
    coalesce(sum(a.elapsed_seconds),0)::bigint
  from public.activities a
  where a.user_id = auth.uid()
$$;
revoke all on function public.my_running_totals() from public, anon;
grant execute on function public.my_running_totals() to authenticated;
