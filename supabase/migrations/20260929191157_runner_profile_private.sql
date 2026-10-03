-- Running measurements are private. public.profiles is readable by friends.
create table public.runner_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  age smallint check (age between 10 and 110),
  weight_kg numeric(5, 2) check (weight_kg between 25 and 300),
  height_cm smallint check (height_cm between 100 and 250),
  running_level text check (running_level in ('beginner', 'occasional', 'regular')),
  runs_per_week smallint check (runs_per_week in (1, 3, 5)),
  updated_at timestamptz not null default now()
);

alter table public.runner_profiles enable row level security;
revoke all on public.runner_profiles from public, anon;
grant select, insert, update on public.runner_profiles to authenticated;

create policy runner_profile_select on public.runner_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy runner_profile_insert on public.runner_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy runner_profile_update on public.runner_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
