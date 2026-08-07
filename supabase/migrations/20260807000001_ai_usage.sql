-- Track AI calls, which bill to the app owner's API key regardless of who
-- triggered them.
--
-- Token counts rather than just call counts, so actual spend can be worked
-- out per feature and per user.
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 'import' | 'macro_grams' | 'macro_match' | 'ingredient_alias'
  feature text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index ai_usage_created_idx on public.ai_usage (created_at desc);
create index ai_usage_user_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

-- Users write their own rows and can see their own. Cross-user totals are
-- deliberately not exposed to the app — query them from the dashboard, which
-- runs as a privileged role:
--
--   select u.email, a.feature, count(*) as calls,
--          sum(a.input_tokens) as input_tokens,
--          sum(a.output_tokens) as output_tokens
--   from public.ai_usage a
--   join auth.users u on u.id = a.user_id
--   group by u.email, a.feature
--   order by calls desc;
create policy "users record own ai usage" on public.ai_usage
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "users read own ai usage" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));
