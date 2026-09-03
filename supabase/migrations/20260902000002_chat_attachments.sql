-- Photos and files in chat.
--
-- Unlike recipe images and avatars, this bucket is private. Those are meant to
-- be seen — a shared recipe is published. A conversation isn't, and a public
-- bucket makes every object readable by anyone who has or guesses the URL,
-- which would quietly undo the membership rules on the messages themselves.
-- Access goes through signed URLs, minted only for members.
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-attachments', 'chat-attachments', false, 26214400) -- 25 MB
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit;

/**
 * Whether the caller belongs to the conversation an object was filed under.
 *
 * Objects live at {conversation_id}/{uuid}-{filename}, so the first path
 * segment is the conversation. The uuid check has to happen before the cast:
 * a policy that casts an arbitrary folder name straight to uuid throws on the
 * first object someone uploads to a path that isn't one, and a throwing policy
 * takes the whole query with it rather than just denying a row.
 */
create or replace function public.can_reach_chat_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  folder text := (storage.foldername(object_name))[1];
begin
  if folder !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;
  return public.is_conversation_member(folder::uuid);
end;
$$;

drop policy if exists "members read chat attachments" on storage.objects;
create policy "members read chat attachments" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.can_reach_chat_object(name)
  );

drop policy if exists "members upload chat attachments" on storage.objects;
create policy "members upload chat attachments" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and public.can_reach_chat_object(name)
  );

-- Unsending a message should take its files with it, and nothing else should
-- be able to remove them.
drop policy if exists "senders delete own chat attachments" on storage.objects;
create policy "senders delete own chat attachments" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and owner = (select auth.uid())
  );

-- ============================================================ attachments
create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  /** Set for images, so the bubble can hold its shape before the file loads. */
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index message_attachments_message_idx
  on public.message_attachments (message_id);

alter table public.message_attachments enable row level security;

/** The conversation a message belongs to, read past RLS to avoid recursion. */
create or replace function public.message_conversation(msg uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select conversation_id from public.messages where id = msg;
$$;

create policy "read attachments in own conversations" on public.message_attachments
  for select to authenticated
  using (public.is_conversation_member(public.message_conversation(message_id)));

-- Only onto your own message, which already had to be in a conversation you
-- belong to before it could exist.
create policy "attach to own messages" on public.message_attachments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id and m.sender_id = (select auth.uid())
    )
  );

-- An empty message is fine now, so long as something came with it. The
-- action enforces that pairing; the column just stops being the thing that
-- forbids it.
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages
  add constraint messages_body_check check (char_length(body) <= 4000);
