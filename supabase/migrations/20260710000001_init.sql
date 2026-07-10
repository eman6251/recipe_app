-- Skillet initial schema: recipes, ingredients, meal plans, pantry.
-- All tables are per-user with RLS; user_id defaults to auth.uid() so the
-- app never has to pass it explicitly.

-- Reusable updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================ recipes
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text,
  source_url text,          -- original TikTok/IG/web link
  source_note text,         -- e.g. "@creator on IG", "Mom's recipe"
  servings numeric not null default 1 check (servings > 0),
  prep_minutes integer,
  cook_minutes integer,
  instructions text[] not null default '{}',
  notes text,
  tags text[] not null default '{}',
  image_url text,
  -- Cached per-serving macros, recomputed whenever ingredients change:
  -- { "kcal": n, "protein_g": n, "carbs_g": n, "fat_g": n }
  macros_per_serving jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_user_id_idx on public.recipes (user_id);
create index recipes_tags_idx on public.recipes using gin (tags);

create trigger recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;

create policy "own recipes" on public.recipes
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ================================================== recipe_ingredients
-- Structured, one row per ingredient line. `grams` + `fdc_id` power the
-- USDA macro computation; `macros` caches the per-line result.
create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position integer not null default 0,
  group_name text,          -- optional section, e.g. "For the sauce"
  quantity numeric,         -- 2 (null for "to taste")
  unit text,                -- "tbsp", "cup", "g", "count"...
  item text not null,       -- "olive oil"
  note text,                -- "finely chopped"
  grams numeric,            -- estimated weight, for macro math
  fdc_id integer,           -- USDA FoodData Central food id
  macros jsonb,             -- cached { kcal, protein_g, carbs_g, fat_g } for `grams`
  created_at timestamptz not null default now()
);

create index recipe_ingredients_recipe_id_idx
  on public.recipe_ingredients (recipe_id, position);

alter table public.recipe_ingredients enable row level security;

-- Access follows the parent recipe.
create policy "own recipe ingredients" on public.recipe_ingredients
  for all
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = (select auth.uid())
    )
  );

-- ====================================================== planned_meals
-- One row = one recipe planned on one date. Powers both the month
-- calendar and the weekly prep view (a week is just a date range).
create table public.planned_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  planned_on date not null,
  meal_slot text not null default 'dinner'
    check (meal_slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  servings numeric not null default 1 check (servings > 0),
  cooked boolean not null default false,
  created_at timestamptz not null default now()
);

create index planned_meals_user_date_idx
  on public.planned_meals (user_id, planned_on);

alter table public.planned_meals enable row level security;

create policy "own planned meals" on public.planned_meals
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ======================================================= pantry_items
-- Staples assumed on hand. Shopping list subtracts these unless the
-- week needs more than `small_amount_g` in total (the buy-more signal).
create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,             -- matched against ingredient `item`, case-insensitive
  small_amount_g numeric,         -- null = never flag, always assumed stocked
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.pantry_items enable row level security;

create policy "own pantry items" on public.pantry_items
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
