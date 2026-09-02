-- Whether a batch is shopped for at its planned portions or at full recipe.
--
-- Planning one dinner from a recipe that makes four doesn't mean buying a
-- quarter of the ingredients — you can't cook a quarter of a stew, you cook
-- the pot and eat the rest later. So the default is the whole recipe, and
-- buying only the planned portions is an explicit choice, which some recipes
-- genuinely want: half a fourteen-sandwich batch is seven sandwiches.
--
-- Stored per planned row rather than per recipe: it's a decision about one
-- week's cook, not a standing property of the recipe.
alter table public.planned_meals
  add column if not exists scale_to_portions boolean not null default false;
