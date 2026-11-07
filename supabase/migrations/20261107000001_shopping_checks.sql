-- Shopping-list ticks, so they follow you to the shop.
--
-- These lived in localStorage, which meant the laptop you planned on and the
-- phone in your hand disagreed about what was already in the basket. A tick is
-- a fact about the shop, not about the browser.
--
-- A row's existence is the tick; unchecking deletes it. Keyed by the list's
-- own canonical ingredient key ("olive oil"), which is derived the same way on
-- every device, so the two agree without needing to share a list id.
create table public.shopping_checks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_key text not null,
  checked_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

alter table public.shopping_checks enable row level security;

create policy "own shopping checks" on public.shopping_checks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
