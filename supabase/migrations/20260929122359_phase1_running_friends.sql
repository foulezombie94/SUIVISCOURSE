-- Phase 1 only. No public social feed or media tables.
create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  bio text check (char_length(bio) <= 180),
  friend_code text not null unique default ('RUN-' || upper(encode(extensions.gen_random_bytes(6), 'hex'))),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);
create unique index one_pending_request_per_pair on public.friend_requests
  (least(sender_id,receiver_id),greatest(sender_id,receiver_id)) where status = 'pending';
create index friend_requests_sender_idx on public.friend_requests(sender_id,created_at desc);
create index friend_requests_receiver_idx on public.friend_requests(receiver_id,created_at desc);

create table public.friendships (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a,user_b),
  check (user_a < user_b)
);
create index friendships_user_b_idx on public.friendships(user_b);

create table public.activities (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null check (activity_type in ('running','walking','trail')),
  started_at timestamptz not null,
  ended_at timestamptz not null check (ended_at >= started_at),
  elapsed_seconds integer not null check (elapsed_seconds >= 0),
  moving_seconds integer not null check (moving_seconds >= 0 and moving_seconds <= elapsed_seconds),
  distance_meters double precision not null check (distance_meters >= 0),
  average_pace_sec_per_km double precision check (average_pace_sec_per_km > 0),
  elevation_gain_meters double precision not null default 0 check (elevation_gain_meters >= 0),
  elevation_loss_meters double precision not null default 0 check (elevation_loss_meters >= 0),
  visibility text not null default 'private' check (visibility in ('private','friends')),
  title text not null check (char_length(title) between 1 and 100),
  -- Only a sanitized route may be placed here; full GPS track lives in activity_points.
  shared_route jsonb not null default '[]'::jsonb,
  hide_radius_meters integer not null default 400 check (hide_radius_meters in (0,200,400,800)),
  verification_status text not null default 'normal' check (verification_status in ('normal','suspicious','manual')),
  created_at timestamptz not null default now(),
  unique (id,user_id)
);
create index activities_owner_date_idx on public.activities(user_id,started_at desc);
create index activities_friends_date_idx on public.activities(started_at desc) where visibility = 'friends';

create table public.activity_points (
  activity_id uuid not null,
  user_id uuid not null,
  sequence integer not null check (sequence >= 0),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  altitude double precision,
  accuracy double precision,
  speed double precision,
  recorded_at timestamptz not null,
  primary key (activity_id,sequence),
  foreign key (activity_id,user_id) references public.activities(id,user_id) on delete cascade
);
create index activity_points_owner_idx on public.activity_points(user_id,activity_id);

create table public.activity_splits (
  activity_id uuid not null,
  user_id uuid not null,
  kilometer integer not null check (kilometer > 0),
  moving_seconds integer not null check (moving_seconds > 0),
  elapsed_seconds integer not null check (elapsed_seconds > 0),
  primary key (activity_id,kilometer),
  foreign key (activity_id,user_id) references public.activities(id,user_id) on delete cascade
);
create index activity_splits_owner_idx on public.activity_splits(user_id,activity_id);

create table public.personal_records (
  user_id uuid not null references public.profiles(id) on delete cascade,
  record_type text not null check (record_type in ('fastest_1k','fastest_5k','fastest_10k','longest_run')),
  value double precision not null check (value > 0),
  activity_id uuid not null references public.activities(id) on delete cascade,
  achieved_at timestamptz not null,
  primary key (user_id,record_type)
);

create function private.create_profile() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id,username,display_name)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data ->> 'username','runner_' || left(replace(new.id::text,'-',''),12))),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name',''),'Runner')
  );
  return new;
end;
$$;
revoke all on function private.create_profile() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.create_profile();

create function private.keep_request_identity() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.sender_id <> old.sender_id or new.receiver_id <> old.receiver_id then
    raise exception 'Request participants cannot change';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger keep_request_identity before update on public.friend_requests
for each row execute function private.keep_request_identity();

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.activities enable row level security;
alter table public.activity_points enable row level security;
alter table public.activity_splits enable row level security;
alter table public.personal_records enable row level security;

create policy profile_read on public.profiles for select to authenticated using (
  id = (select auth.uid()) or exists (
    select 1 from public.friendships f
    where (f.user_a = id and f.user_b = (select auth.uid()))
       or (f.user_b = id and f.user_a = (select auth.uid()))
  )
);
create policy profile_update on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy request_read on public.friend_requests for select to authenticated
using (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()));
create policy request_send on public.friend_requests for insert to authenticated
with check (
  sender_id = (select auth.uid()) and status = 'pending'
  and not exists (
    select 1 from public.friendships f
    where f.user_a = least(sender_id,receiver_id)
      and f.user_b = greatest(sender_id,receiver_id)
  )
);
create policy request_answer on public.friend_requests for update to authenticated
using (receiver_id = (select auth.uid()) and status = 'pending')
with check (receiver_id = (select auth.uid()) and status in ('accepted','rejected'));

create policy friendship_read on public.friendships for select to authenticated
using (user_a = (select auth.uid()) or user_b = (select auth.uid()));
create policy friendship_insert on public.friendships for insert to authenticated
with check (
  (user_a = (select auth.uid()) or user_b = (select auth.uid()))
  and exists (
    select 1 from public.friend_requests r
    where r.status = 'accepted'
      and least(r.sender_id,r.receiver_id) = user_a
      and greatest(r.sender_id,r.receiver_id) = user_b
      and r.receiver_id = (select auth.uid())
  )
);
create policy friendship_delete on public.friendships for delete to authenticated
using (user_a = (select auth.uid()) or user_b = (select auth.uid()));

create policy activity_read on public.activities for select to authenticated using (
  user_id = (select auth.uid()) or (
    visibility = 'friends' and exists (
      select 1 from public.friendships f
      where (f.user_a = user_id and f.user_b = (select auth.uid()))
         or (f.user_b = user_id and f.user_a = (select auth.uid()))
    )
  )
);
create policy activity_insert on public.activities for insert to authenticated
with check (user_id = (select auth.uid()));
create policy activity_update on public.activities for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy activity_delete on public.activities for delete to authenticated
using (user_id = (select auth.uid()));
create policy points_read on public.activity_points for select to authenticated
using (user_id = (select auth.uid()));
create policy points_insert on public.activity_points for insert to authenticated
with check (user_id = (select auth.uid()));
create policy splits_read on public.activity_splits for select to authenticated
using (user_id = (select auth.uid()));
create policy splits_insert on public.activity_splits for insert to authenticated
with check (user_id = (select auth.uid()));
create policy records_read on public.personal_records for select to authenticated
using (user_id = (select auth.uid()));
create policy records_insert on public.personal_records for insert to authenticated
with check (user_id = (select auth.uid()));
create policy records_update on public.personal_records for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- A narrow lookup reveals only the account needed for a friend request.
create function public.find_friend_by_code(p_code text)
returns table(id uuid, username text, display_name text)
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_code !~ '^RUN-[0-9A-F]{12}$' then return; end if;
  return query
    select p.id,p.username,p.display_name
    from public.profiles p where p.friend_code = p_code limit 1;
end;
$$;
revoke all on function public.find_friend_by_code(text) from public, anon;
grant execute on function public.find_friend_by_code(text) to authenticated;

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name,bio,avatar_url,updated_at) on public.profiles to authenticated;
grant select,insert,update on public.friend_requests to authenticated;
grant select,insert,delete on public.friendships to authenticated;
grant select,insert,update,delete on public.activities to authenticated;
grant select,insert on public.activity_points,public.activity_splits to authenticated;
grant select,insert,update on public.personal_records to authenticated;
