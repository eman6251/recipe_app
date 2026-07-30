-- Pantry rework + shopping-list ingredient aliases.
--
-- 1. Staples get user-defined categories (fats, seasonings, carbs, …).
-- 2. Restock tracking flips from "flag if a week needs more than X" to
--    "here's how much I actually have" — you weigh the jar, enter the grams,
--    and the shopping list flags a restock when the week would run you out.
-- 3. Ingredient aliases let the shopping list merge names for the same
--    product ("scallion" → "green onion") so quantities add up instead of
--    listing separately.

-- ================================================== pantry_categories
create table public.pantry_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index pantry_categories_user_idx
  on public.pantry_categories (user_id, position, name);

alter table public.pantry_categories enable row level security;

create policy "own pantry categories" on public.pantry_categories
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ======================================================= pantry_items
alter table public.pantry_items
  add column category_id uuid references public.pantry_categories (id) on delete set null,
  -- How much of the staple is on hand, in grams. null = "always stocked,
  -- never flag" (the old default behaviour).
  add column on_hand_g numeric,
  -- Restock once the remaining amount would fall below this. null = 0, i.e.
  -- only flag when the week would use up everything.
  add column restock_below_g numeric;

create index pantry_items_category_idx on public.pantry_items (category_id);

-- Superseded by on_hand_g: it meant "flag if a week needs more than this",
-- which is a different quantity, so the values aren't worth migrating.
alter table public.pantry_items drop column if exists small_amount_g;

-- ================================================== ingredient_aliases
-- Maps a normalized ingredient name to the canonical name it should be
-- grouped under on the shopping list. Learned once, then reused — so the
-- resolver stops needing to ask the model about names it has already seen.
create table public.ingredient_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  alias text not null,
  canonical text not null,
  created_at timestamptz not null default now(),
  unique (user_id, alias)
);

create index ingredient_aliases_user_idx on public.ingredient_aliases (user_id);

alter table public.ingredient_aliases enable row level security;

create policy "own ingredient aliases" on public.ingredient_aliases
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
