drop trigger award_activity_badges on public.activities;
create trigger award_activity_badges after insert on public.activities
for each row when (new.verification_status = 'normal')
execute function private.award_activity_badges();

drop trigger notify_goal_completion on public.activities;
create trigger notify_goal_completion after insert on public.activities
for each row when (new.verification_status = 'normal')
execute function private.notify_goal_completion();
