-- Admin view of who's using the app.
--
-- auth.users isn't reachable through the API by design, so this exposes it
-- through security-definer functions that check admin membership internally.
-- Each function is guarded on its own — a function that only checks its
-- caller at the call site is one refactor away from leaking everything.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS on with no policies: unreachable through the API entirely. Only the
-- security-definer functions below can see it, so admin status can't be
-- read or granted by a signed-in user.
alter table public.app_admins enable row level security;

-- Seed the earliest account — the app owner.
insert into public.app_admins (user_id)
select id from auth.users order by created_at asc limit 1
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins where user_id = (select auth.uid())
  );
$$;

/** Accounts on the app. Returns nothing at all unless the caller is an admin. */
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  recipe_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.email::text,
    p.display_name,
    u.created_at,
    u.last_sign_in_at,
    (select count(*) from public.recipes r where r.user_id = u.id)
  from auth.users u
  left join public.profiles p on p.id = u.id
  where public.is_admin()
  order by u.created_at asc;
$$;

/** Per-user AI spend, since every call bills to the owner's key. */
create or replace function public.admin_ai_usage()
returns table (
  email text,
  feature text,
  calls bigint,
  input_tokens bigint,
  output_tokens bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.email::text,
    a.feature,
    count(*),
    sum(a.input_tokens),
    sum(a.output_tokens)
  from public.ai_usage a
  join auth.users u on u.id = a.user_id
  where public.is_admin()
  group by u.email, a.feature
  order by count(*) desc;
$$;

revoke execute on function public.admin_list_users() from anon;
revoke execute on function public.admin_ai_usage() from anon;
