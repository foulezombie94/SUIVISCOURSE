-- Cover composite foreign keys for activity deletion and record lookup.
create index activity_points_activity_owner_fk_idx
  on public.activity_points(activity_id,user_id);
create index activity_splits_activity_owner_fk_idx
  on public.activity_splits(activity_id,user_id);
create index personal_records_activity_fk_idx
  on public.personal_records(activity_id);
