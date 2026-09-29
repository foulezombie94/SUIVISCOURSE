alter table public.activity_points
  add column altitude_accuracy double precision
  check (altitude_accuracy is null or altitude_accuracy >= 0);
