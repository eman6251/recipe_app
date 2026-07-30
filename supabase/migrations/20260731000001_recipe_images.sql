-- Storage for recipe photos.
--
-- Public-read bucket so <img> can load photos without signed URLs; writes are
-- restricted to the owner by keying each object under their user id
-- (recipe-images/<user_id>/<recipe_id>.<ext>).

insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

drop policy if exists "recipe images are publicly readable" on storage.objects;
create policy "recipe images are publicly readable" on storage.objects
  for select
  using (bucket_id = 'recipe-images');

drop policy if exists "users upload own recipe images" on storage.objects;
create policy "users upload own recipe images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users update own recipe images" on storage.objects;
create policy "users update own recipe images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users delete own recipe images" on storage.objects;
create policy "users delete own recipe images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
