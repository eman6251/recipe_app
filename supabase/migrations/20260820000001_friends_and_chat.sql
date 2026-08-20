-- Friends and messaging.
--
-- Discovery works two ways: a friend code you hand out deliberately, and the
-- author byline on a shared recipe. There's no directory and no public room,
-- so nobody arrives in someone's inbox without either being handed a code or
-- being found through something they chose to publish.

-- ========================================================== friend codes
--
-- Deliberately NOT a column on profiles: that table is readable by anyone,
-- signed in or not, so a code stored there could be scraped for every user
-- and would be worth nothing. Here, RLS lets you read only your own, and the
-- only way to use someone else's is the lookup function below — which takes a
-- code and returns one profile, and can't be turned inside out to enumerate.
create table public.friend_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.friend_codes enable row level security;

create policy "read own friend code" on public.friend_codes
  for select to authenticated using (user_id = (select auth.uid()));

/**
 * A short code that survives being read aloud or typed from a text message.
 *
 * Crockford-style alphabet: no I, L, O, U, 0 or 1, so there's no O/0 or l/1
 * confusion and no accidental words.
 */
create or replace function public.generate_friend_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  candidate text;
  i integer;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate ||
        substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    -- Grouped for legibility: SKL-4F7K-2MQX
    candidate := 'SKL-' || substr(candidate, 1, 4) || '-' || substr(candidate, 5, 4);
    exit when not exists (select 1 from public.friend_codes where code = candidate);
  end loop;
  return candidate;
end;
$$;

insert into public.friend_codes (user_id, code)
select id, public.generate_friend_code() from auth.users
on conflict (user_id) do nothing;

-- ============================================================ friendships
--
-- One row per relationship, not one per direction: the pair is stored in a
-- fixed order so (a,b) and (b,a) can't both exist. requested_by remembers who
-- asked, which is what the pending state needs to render.
create table public.friendships (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete cascade,
  -- 'declined' rows are kept rather than deleted, so someone who's been told
  -- no can't just ask again in a loop.
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (user_a, user_b),
  constraint friendships_ordered check (user_a < user_b)
);

create index friendships_user_b_idx on public.friendships (user_b);

alter table public.friendships enable row level security;

create policy "read own friendships" on public.friendships
  for select to authenticated
  using (user_a = (select auth.uid()) or user_b = (select auth.uid()));

-- No insert or update policy on purpose. Both go through the security-definer
-- functions below, which enforce what a policy can't express: that you may
-- accept a request, but only one you didn't send yourself. With a plain update
-- policy, "accepted" would be a field anyone could set on their own request.
create policy "delete own friendships" on public.friendships
  for delete to authenticated
  using (user_a = (select auth.uid()) or user_b = (select auth.uid()));

/** True when these two have an accepted friendship. */
create or replace function public.are_friends(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and user_a = least((select auth.uid()), other)
      and user_b = greatest((select auth.uid()), other)
  );
$$;

/**
 * Look up one person by their friend code.
 *
 * Security definer so it can read a row nobody else may select. Returns a
 * single profile for an exact code and nothing for anything else, so it
 * answers "who owns this code" without ever answering "what codes exist".
 */
create or replace function public.find_by_friend_code(code text)
returns table (id uuid, username text, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url
  from public.friend_codes f
  join public.profiles p on p.id = f.user_id
  where upper(trim(find_by_friend_code.code)) = f.code
    and f.user_id <> (select auth.uid())
  limit 1;
$$;

/** Send a friend request, or accept one already pointed at you. */
create or replace function public.send_friend_request(other uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  a uuid := least(me, other);
  b uuid := greatest(me, other);
  existing public.friendships%rowtype;
begin
  if me is null then return 'not_signed_in'; end if;
  if me = other then return 'self'; end if;

  select * into existing from public.friendships where user_a = a and user_b = b;

  if found then
    if existing.status = 'accepted' then return 'already_friends'; end if;
    -- They asked first: asking back is the same as saying yes.
    if existing.status = 'pending' and existing.requested_by <> me then
      update public.friendships
      set status = 'accepted', responded_at = now()
      where user_a = a and user_b = b;
      return 'accepted';
    end if;
    if existing.status = 'declined' then return 'declined'; end if;
    return 'pending';
  end if;

  insert into public.friendships (user_a, user_b, requested_by)
  values (a, b, me);
  return 'sent';
end;
$$;

/** Accept or decline a request someone sent you. Never your own. */
create or replace function public.respond_to_friend_request(
  other uuid,
  accept boolean
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  a uuid := least(me, other);
  b uuid := greatest(me, other);
begin
  if me is null or me = other then return false; end if;

  update public.friendships
  set status = case when accept then 'accepted' else 'declined' end,
      responded_at = now()
  where user_a = a and user_b = b
    and status = 'pending'
    and requested_by = other;  -- you can't accept your own request

  return found;
end;
$$;

-- ========================================================== conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  title text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Denormalised so the conversation list can sort without touching messages.
  last_message_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index messages_conversation_idx
  on public.messages (conversation_id, created_at desc);

/**
 * Membership test used by every policy below.
 *
 * Security definer on purpose: a policy on conversation_members that queried
 * conversation_members would recurse forever. Reading through a definer
 * function breaks the cycle, and the function only ever answers about the
 * caller.
 */
create or replace function public.is_conversation_member(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv and user_id = (select auth.uid())
  );
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy "read own conversations" on public.conversations
  for select to authenticated using (public.is_conversation_member(id));

create policy "read members of own conversations" on public.conversation_members
  for select to authenticated using (public.is_conversation_member(conversation_id));

-- No update policy: the only field worth changing is last_read_at, and a
-- policy that checked just user_id would let someone repoint conversation_id
-- at any thread and thereby join it. mark_conversation_read does it instead.

-- Leaving a conversation is deleting your own membership.
create policy "leave own conversations" on public.conversation_members
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "read messages in own conversations" on public.messages
  for select to authenticated using (public.is_conversation_member(conversation_id));

create policy "send messages to own conversations" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_member(conversation_id)
  );

-- Unsending is allowed; editing history is not.
create policy "delete own messages" on public.messages
  for delete to authenticated using (sender_id = (select auth.uid()));

/** Move your own read cursor. The only membership field meant to change. */
create or replace function public.mark_conversation_read(conv uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = conv and user_id = (select auth.uid());
$$;

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

/**
 * The one-to-one conversation with a friend, created on first use.
 *
 * Going through a function rather than a plain insert keeps two people from
 * ending up with two parallel DM threads, and puts the friendship check where
 * it can't be skipped.
 */
create or replace function public.get_or_create_dm(other uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  conv uuid;
begin
  if me is null or me = other then
    raise exception 'invalid conversation';
  end if;
  if not public.are_friends(other) then
    raise exception 'not friends';
  end if;

  select c.id into conv
  from public.conversations c
  where c.is_group = false
    and exists (
      select 1 from public.conversation_members m
      where m.conversation_id = c.id and m.user_id = me
    )
    and exists (
      select 1 from public.conversation_members m
      where m.conversation_id = c.id and m.user_id = other
    )
    and (select count(*) from public.conversation_members m
         where m.conversation_id = c.id) = 2
  limit 1;

  if conv is not null then return conv; end if;

  insert into public.conversations (is_group, created_by)
  values (false, me)
  returning id into conv;

  insert into public.conversation_members (conversation_id, user_id)
  values (conv, me), (conv, other);

  return conv;
end;
$$;

/** Start a group thread. Everyone in it has to already be your friend. */
create or replace function public.create_group_conversation(
  group_title text,
  member_ids uuid[]
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  member uuid;
  conv uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if coalesce(array_length(member_ids, 1), 0) = 0 then
    raise exception 'a group needs someone in it';
  end if;
  if array_length(member_ids, 1) > 50 then
    raise exception 'groups top out at 50 people';
  end if;

  foreach member in array member_ids loop
    if member <> me and not public.are_friends(member) then
      raise exception 'you can only add friends to a group';
    end if;
  end loop;

  insert into public.conversations (is_group, title, created_by)
  values (true, nullif(btrim(group_title), ''), me)
  returning id into conv;

  insert into public.conversation_members (conversation_id, user_id)
  select conv, unnest(array_append(member_ids, me))
  on conflict do nothing;

  return conv;
end;
$$;

-- ================================================== new accounts get a code
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

  insert into public.friend_codes (user_id, code)
  values (new.id, public.generate_friend_code())
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke execute on function public.generate_friend_code() from anon, authenticated;

/**
 * Everything the conversation list needs, in one round trip.
 *
 * Unread counts and "who's in this thread" are both per-conversation
 * aggregates; assembling them client-side would mean a query per thread.
 * Security definer only to read through the membership join cleanly — every
 * row is still filtered to conversations the caller belongs to.
 */
create or replace function public.list_conversations()
returns table (
  id uuid,
  is_group boolean,
  title text,
  last_message_at timestamptz,
  last_message_body text,
  last_message_sender uuid,
  unread_count bigint,
  members jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select c.id, c.is_group, c.title, c.last_message_at, m.last_read_at
    from public.conversations c
    join public.conversation_members m
      on m.conversation_id = c.id and m.user_id = (select auth.uid())
  )
  select
    mine.id,
    mine.is_group,
    mine.title,
    mine.last_message_at,
    (select body from public.messages msg
      where msg.conversation_id = mine.id
      order by msg.created_at desc limit 1),
    (select sender_id from public.messages msg
      where msg.conversation_id = mine.id
      order by msg.created_at desc limit 1),
    (select count(*) from public.messages msg
      where msg.conversation_id = mine.id
        and msg.created_at > mine.last_read_at
        and msg.sender_id <> (select auth.uid())),
    (select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      )), '[]'::jsonb)
     from public.conversation_members cm
     join public.profiles p on p.id = cm.user_id
     where cm.conversation_id = mine.id and cm.user_id <> (select auth.uid()))
  from mine
  order by mine.last_message_at desc;
$$;

/** Your friends and outstanding requests, with the profile fields the UI shows. */
create or replace function public.list_friends()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  status text,
  /** 'incoming' when they asked you, 'outgoing' when you asked them. */
  direction text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    f.status,
    case when f.requested_by = (select auth.uid()) then 'outgoing' else 'incoming' end,
    f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end
  where (f.user_a = (select auth.uid()) or f.user_b = (select auth.uid()))
    and f.status in ('pending', 'accepted')
  order by p.display_name;
$$;

-- Live chat: without this the tables emit no realtime events and the client
-- falls back to its slower poll.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;  -- already published
end;
$$;
