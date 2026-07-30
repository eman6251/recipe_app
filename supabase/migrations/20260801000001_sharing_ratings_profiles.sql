-- Sharing, ratings, and the signals the home page recommends from.
--
-- Sharing is opt-in per recipe: everything stays private until its owner
-- flips is_public, so existing recipes are unaffected by this migration.

-- ============================================================= profiles
-- auth.users isn't readable across accounts, so authorship needs a public
-- table of display names.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by signed-in users" on public.profiles
  for select to authenticated using (true);

create policy "users manage own profile" on public.profiles
  for all
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Give every new signup a profile, defaulting the name to their email handle.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this migration.
insert into public.profiles (id, display_name)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- ====================================================== recipe sharing
alter table public.recipes
  add column if not exists is_public boolean not null default false;

create index recipes_public_idx on public.recipes (is_public) where is_public;

-- Additive: the existing owner-only policy still governs writes, this just
-- opens reads on recipes their owner chose to share.
create policy "shared recipes are readable" on public.recipes
  for select to authenticated using (is_public);

create policy "shared recipe ingredients are readable"
  on public.recipe_ingredients
  for select to authenticated using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.is_public
    )
  );

-- ============================================================== ratings
create table public.recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

create index recipe_ratings_recipe_idx on public.recipe_ratings (recipe_id);

alter table public.recipe_ratings enable row level security;

-- Readable by all signed-in users so averages can be shown on shared
-- recipes; writable only by the rater.
create policy "ratings are readable" on public.recipe_ratings
  for select to authenticated using (true);

create policy "users manage own ratings" on public.recipe_ratings
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ======================================================= recently viewed
-- One row per user/recipe, timestamp bumped on revisit — a viewing history
-- rather than a log, so it can't grow without bound.
create table public.recipe_views (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index recipe_views_recent_idx
  on public.recipe_views (user_id, viewed_at desc);

alter table public.recipe_views enable row level security;

create policy "users manage own views" on public.recipe_views
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
