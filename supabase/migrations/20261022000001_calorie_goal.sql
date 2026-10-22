-- A daily calorie target, for comparing a week's prep against.
--
-- Daily rather than weekly because that's the number people are given and the
-- one they remember; the weekly figure is derived from it. Nullable because
-- not everyone is counting, and a goal of zero is a different statement from
-- no goal at all.
alter table public.profiles
  add column if not exists daily_calorie_goal integer
  check (daily_calorie_goal is null or daily_calorie_goal between 500 and 10000);
