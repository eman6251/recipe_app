-- Let signed-out visitors see shared recipes on the home page.
--
-- Only affects recipes their owner explicitly shared: is_public stays the
-- gate, and private recipes remain invisible to everyone but their owner.
-- What changes is the audience for shared ones — previously any signed-in
-- user, now anyone with the link.

drop policy if exists "shared recipes are readable" on public.recipes;
create policy "shared recipes are readable" on public.recipes
  for select to anon, authenticated using (is_public);

drop policy if exists "shared recipe ingredients are readable"
  on public.recipe_ingredients;
create policy "shared recipe ingredients are readable"
  on public.recipe_ingredients
  for select to anon, authenticated using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.is_public
    )
  );

-- Author names and avatars appear on shared recipe cards.
drop policy if exists "profiles are readable by signed-in users" on public.profiles;
create policy "profiles are readable" on public.profiles
  for select to anon, authenticated using (true);

-- Rating averages are shown on those same cards.
drop policy if exists "ratings are readable" on public.recipe_ratings;
create policy "ratings are readable" on public.recipe_ratings
  for select to anon, authenticated using (true);
