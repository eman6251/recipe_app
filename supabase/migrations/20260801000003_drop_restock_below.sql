-- Drop the manual restock floor.
--
-- Superseded by a per-category packaging allowance: staples get weighed in
-- their container, so the number entered always overstates how much food is
-- actually there. Subtracting a typical container weight captures the same
-- "buy it before you run out" intent without asking for a second number.
alter table public.pantry_items drop column if exists restock_below_g;
