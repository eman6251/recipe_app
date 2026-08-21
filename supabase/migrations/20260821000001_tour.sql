-- Remember whether someone has been offered the walkthrough.
--
-- On the profile rather than in localStorage: whether you've seen the tour is
-- a fact about you, not about the browser you happened to use. Otherwise the
-- prompt reappears on every new device, which reads as a bug.
alter table public.profiles
  add column if not exists tour_seen_at timestamptz;
