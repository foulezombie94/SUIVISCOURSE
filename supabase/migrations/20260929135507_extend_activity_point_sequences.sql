-- Keep original local point indexes when syncing a sampled route, including long runs.
alter table public.activity_points drop constraint activity_points_sequence_limit;
alter table public.activity_points add constraint activity_points_sequence_limit
  check (sequence < 200000);
