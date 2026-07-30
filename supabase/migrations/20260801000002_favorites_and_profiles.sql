-- Favoriting shared recipes, plus profile avatars and preferences.
--
-- A shared recipe stays out of your recipe box until you favorite it, so
-- browsing other people's cooking doesn't clutter your own collection.

-- ============================================================ favorites
create table public.recipe_favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index recipe_favorites_user_idx
  on public.recipe_favorites (user_id, created_at desc);

alter table public.recipe_favorites enable row level security;

create policy "users manage own favorites" on public.recipe_favorites
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ======================================================= profile fields
alter table public.profiles
  add column if not exists avatar_url text,
  -- When on, new recipes are shared the moment they're created; otherwise
  -- each one has to be shared deliberately.
  add column if not exists share_new_recipes boolean not null default false;

-- ========================================================= avatar images
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users update own avatar" on storage.objects;
create policy "users update own avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
