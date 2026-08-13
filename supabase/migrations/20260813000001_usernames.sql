-- Usernames as the public identity.
--
-- Profiles are readable by anonymous visitors so author names can show on
-- shared recipes, and display names were being seeded from the email
-- local-part — which made "elliot.hughes21" visible to strangers, and a good
-- guess at the address. Nothing about an account's email should be inferable
-- from what the app displays.

alter table public.profiles
  add column if not exists username text unique;

-- Lowercase, no dots or @, so a username can never resemble an email.
alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

-- Give existing accounts a neutral username derived from their id.
update public.profiles
set username = 'cook_' || substr(replace(id::text, '-', ''), 1, 8)
where username is null;

-- Replace any display name that is still the email local-part.
update public.profiles p
set display_name = p.username
from auth.users u
where u.id = p.id
  and p.display_name = split_part(u.email, '@', 1);

alter table public.profiles alter column username set not null;

-- New signups: take the requested username, falling back to a neutral one
-- rather than anything derived from the email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested text;
  final_name text;
begin
  requested := lower(coalesce(new.raw_user_meta_data->>'username', ''));

  if requested ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where username = requested)
  then
    final_name := requested;
  else
    final_name := 'cook_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, final_name, final_name)
  on conflict (id) do nothing;

  return new;
end;
$$;
