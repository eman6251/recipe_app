# Skillet — recipes, meal prep, and a shopping list that thinks

A personal recipe box that plans the week and does the arithmetic: import a
recipe from a TikTok link, plan portions across days, get accurate macros, and
walk into the shop with a list that already knows what's in your pantry.

Built for my own meal prep, then opened up so friends and family could share
recipes with each other.

<!-- Screenshots: recipe view, week view, shopping list -->

## What it does

**Import recipes without typing them.** Paste a TikTok link and the caption is
fetched and parsed into structured data — ingredients split into
quantity/unit/item, ordered steps, tags, and an estimated gram weight per
ingredient. Instagram blocks caption access entirely, so those are pasted as
text and parsed the same way.

**Real macros, not guesses.** Each ingredient is matched to a USDA FoodData
Central entry and scaled by weight, then cached per ingredient. Matching is
the hard part: USDA's own search ranks "olive oil" below canned anchovies, so
candidates are re-scored locally and the final pick is made by an LLM, which
knows palm sugar is a sweetener rather than a vegetable.

**Plan by portions, not by meals.** Cooking five portions on Sunday fills
Sunday through Thursday automatically. The week view shows a prep list with one
checkbox per recipe — a batch is cooked once, however many days it's eaten
across — plus daily and weekly macro totals.

**A shopping list that does the arithmetic.** Ingredients aggregate per recipe
and scale to the portions planned, quantities merge across recipes, and
different names for the same product are combined ("scallions" and "green
onions" become one line). Pantry staples drop off unless the week would run you
out — which accounts for the packaging weight, because you weigh the jar, not
the spice.

**Cook from it.** A NYT-style recipe view with a portion multiplier, a
grams/ounces toggle, and tap-to-check-off steps. Opening a recipe from the
planner pre-scales it to the portions you actually planned.

**Share and discover.** Recipes are private until shared. Shared ones are
browsable by anyone, savable to your own box, and rateable — and the home page
recommends from what you've cooked and rated well.

## Stack

- **Next.js** (App Router, TypeScript) — Server Components and Server Actions
- **Supabase** — Postgres, Auth, Row Level Security, Storage
- **Anthropic Claude** — recipe parsing, gram estimation, USDA match selection,
  ingredient-name merging
- **USDA FoodData Central** — nutrition data
- **Tailwind CSS v4**
- **Vercel** — hosting

## Notes on the design

**Row Level Security does the access control.** Every table has RLS enabled and
policies keyed to `auth.uid()`; the browser only ever holds the publishable
key. Sharing is a column (`is_public`) rather than a code path, so a shared
recipe is readable because the database says so, not because a query
remembered to filter.

**Usernames are the public identity.** Emails are used to sign in and nothing
else — they're never displayed, and profiles carry no email column, so nothing
about an address is inferable from what the app shows.

**LLM calls are cached and bounded.** Ingredient matches, gram estimates, and
name merges are all persisted after the first resolution, so a given ingredient
costs one call ever rather than one per view. Usage is logged per user and
feature, since every call bills to one API key.

**Estimates are labelled as estimates.** Macros depend on gram estimates and
food matching, both of which can be wrong, so the UI says so and shows the
per-ingredient breakdown rather than presenting a total as fact.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

| Variable | Needed for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | everything | Project URL, no path suffix |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | everything | Publishable key; safe in the browser |
| `ANTHROPIC_API_KEY` | recipe import, macros | Server-only |
| `USDA_API_KEY` | macros | Free, server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | signing in by username | Optional; email sign-in works without it |

Apply the schema with `npx supabase db push`, or by running the files in
`supabase/migrations/` in order from the Supabase SQL editor.

`npm run build` is the fastest full typecheck.

## Deployment

See [docs/deployment.md](docs/deployment.md) for the full walkthrough —
Vercel setup, environment variables, and the platform limits worth knowing
before you hit them (Server Action body caps, storage policies, free-tier
Supabase pausing).
