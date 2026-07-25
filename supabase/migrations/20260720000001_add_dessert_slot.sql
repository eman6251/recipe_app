-- Add 'dessert' as a meal slot (high-protein desserts get meal-prepped and
-- tracked like any other meal).
--
-- The original constraint was declared inline, so its generated name isn't
-- guaranteed. Drop whatever check constraint governs meal_slot, then re-add
-- the widened one under a known name.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'planned_meals'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%meal_slot%'
  loop
    execute format(
      'alter table public.planned_meals drop constraint %I', c.conname
    );
  end loop;
end $$;

alter table public.planned_meals
  add constraint planned_meals_meal_slot_check
  check (meal_slot in ('breakfast', 'lunch', 'dinner', 'dessert', 'snack'));
