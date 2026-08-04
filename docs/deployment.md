# Deploying a Next.js + Supabase app to Vercel

How Skillet is deployed, written so it can be followed for a different
project. The final section covers locking an app down to a single user, which
Skillet does *not* do — it allows open signups on purpose.

## Stack

| Piece | Choice | Notes |
|---|---|---|
| App | Next.js (App Router, TypeScript) | Server Components + Server Actions |
| Database & auth | Supabase (Postgres + Auth + Row Level Security) | Free tier |
| File storage | Supabase Storage | Public-read buckets, owner-only writes |
| Hosting | Vercel | Free (Hobby) tier, auto-deploys from GitHub |

Cost at this scale: $0, plus metered API usage if the app calls a paid API.

---

## 1. Repository

Vercel deploys from a Git remote, so the project needs to be on GitHub first.

If pushing over HTTPS fails with `could not read Username`, there's no stored
credential. The lowest-friction fix that needs no extra tooling is an SSH
**deploy key**, which is scoped to one repository rather than the whole
account:

```bash
ssh-keygen -t ed25519 -C "you@example.com" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub          # add at repo → Settings → Deploy keys
                                    # tick "Allow write access"
git remote set-url origin git@github.com:USER/REPO.git
```

Pre-trusting GitHub's host key avoids a first-push prompt that hangs in
non-interactive shells:

```bash
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
# verify against GitHub's published fingerprint before trusting it:
# SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU
```

## 2. Supabase

1. Create a project; save the database password somewhere durable — it's
   needed for CLI migrations and isn't recoverable, only resettable.
2. Collect from the dashboard:
   - **Project URL** (`https://<ref>.supabase.co`) — under Project Settings →
     Data API. Use the **base** URL; drop any `/rest/v1/` suffix, or auth
     calls 404 in confusing ways.
   - **Publishable key** (`sb_publishable_…`) — Project Settings → API Keys.
     This is safe in the browser; Row Level Security is what protects data.
   - Never ship the **service_role** key to the client. It bypasses RLS
     entirely and isn't needed for a normal app.

### Schema and RLS

Keep migrations as SQL files in `supabase/migrations/` and apply them with
`npx supabase db push` (prompts for the database password) or by pasting into
the dashboard SQL Editor.

Every table needs RLS explicitly enabled — without it, a table is readable by
anyone with the publishable key:

```sql
alter table public.things enable row level security;

create policy "own things" on public.things
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
```

Defaulting `user_id` to `auth.uid()` means application code never passes it:

```sql
user_id uuid not null default auth.uid() references auth.users (id) on delete cascade
```

### Storage

Public-read bucket, writes restricted by keying each object under the owner's
user id (`bucket/<user_id>/<file>`), so the policy can check ownership from the
path:

```sql
insert into storage.buckets (id, name, public) values ('files','files',true)
on conflict (id) do nothing;

create policy "public read" on storage.objects
  for select using (bucket_id = 'files');

create policy "own writes" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
```

## 3. Auth wiring

Use `@supabase/ssr` (the older `auth-helpers` package is deprecated) with three
clients:

- **Browser** — `createBrowserClient`, for client components.
- **Server** — `createServerClient` reading/writing cookies, for Server
  Components, Route Handlers, and Server Actions.
- **Session refresher** — runs on every request to keep the session fresh and
  to gate routes.

Two things that cause hard-to-debug logouts:

1. Call `supabase.auth.getUser()` immediately after creating the server client
   in the refresher, with no logic in between. It revalidates the token.
2. If the refresher issues a redirect, copy the refreshed auth cookies onto the
   redirect response, or the refresh is silently discarded.

> Next.js 16 renamed this file's concept from `middleware.ts` to `proxy.ts`.
> `src/middleware.ts` still works here; check `node_modules/next/dist/docs/`
> for the installed version's convention rather than trusting memory.

## 4. Vercel

1. [vercel.com/new](https://vercel.com/new) → sign in with GitHub → import the
   repo. Framework detection needs no changes for a standard Next.js app.
2. Expand **Environment Variables** and add every key from `.env.local`.
   `.env.local` is gitignored, so nothing ships without this and the app will
   fail on first load. The **Import .env** button takes the file directly.
3. Deploy. Subsequent pushes to the default branch deploy automatically.

### Environment variable rules

- `NEXT_PUBLIC_*` values are **baked into the browser bundle** at build time.
  Only the Supabase URL and publishable key belong there.
- Everything else (third-party API keys) must have no `NEXT_PUBLIC_` prefix, so
  it stays server-only.
- Changing a variable requires a redeploy to take effect.

### If the app uses email confirmation links

Add the deployed URL under Supabase → Authentication → URL Configuration
(Site URL and Redirect URLs). Plain email+password sign-in works without this.

---

## Gotchas worth knowing up front

**Server Action body limit.** Server Actions cap request bodies at 1 MB, and
Vercel's serverless functions cap around 4.5 MB regardless of framework
settings. Any file upload larger than a small image must go **from the browser
straight to Supabase Storage**, with the Server Action recording only the
resulting URL. Raising `serverActions.bodySizeLimit` works locally and then
breaks in production.

**Cache-busting replaced files.** Uploading over the same storage path serves
the stale file from CDN cache. Append `?v=<timestamp>` to the stored URL.

**Free-tier Supabase pauses.** Projects sleep after roughly a week of
inactivity, and the app then fails with `fetch failed`. Restore from the
dashboard; it's a button, not a data loss event.

**`next/image` with remote files.** Either configure `images.remotePatterns`
for the storage hostname, or pass `unoptimized` on those images.

**Verify the build locally first.** `npm run build` is the fastest full
typecheck and catches everything Vercel would, before waiting on a remote
build.

---

## Locking an app to a single user

Skillet is multi-user with open signups. For a private app — a personal
finance tool, say — where exactly one person should ever have access, layer
these:

**1. Turn off public signups.** Create the one account first, then Supabase →
Authentication → Sign In / Providers → Email → disable new user signups. This
is the single most important step: without it, anyone who finds the URL can
create an account. Note that RLS then keeps their data separate from yours,
but they'd still have a working login on your app.

**2. RLS on every table, no exceptions.** A table without RLS enabled is
readable by anyone holding the publishable key, which ships in the browser
bundle and is therefore public. Enable it everywhere and scope every policy to
`auth.uid()`. Verify by querying a table with the anon key and confirming it
returns nothing when signed out.

**3. Allow-list your own account.** Cheap defense-in-depth in the session
refresher, in case a signup path is ever left open by accident:

```ts
const ALLOWED = new Set(["you@example.com"]);
if (user && !ALLOWED.has(user.email ?? "")) {
  await supabase.auth.signOut();
  return redirectToLogin();
}
```

**4. Enable MFA.** Supabase Auth supports TOTP enrollment. Worth it for
financial data.

**5. Consider not exposing the app publicly at all.** Vercel offers deployment
protection (password or Vercel-account authentication) in front of the whole
site — check the current plan limits, as availability differs between Hobby
and Pro. That protects the app even before the login screen is reached.

**6. Keep secrets server-side.** Bank/ledger API keys go in non-`NEXT_PUBLIC_`
variables and are only ever read inside Server Actions or Route Handlers.
Anything referenced in a client component ends up in the browser bundle.
