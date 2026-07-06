# Skillet 🍳

A personal recipe box, meal planner, macro tracker, and smart shopping list.

- **Recipes** — NYT Cooking–style view with a portion multiplier; add recipes by
  pasting a TikTok/Instagram caption (Claude drafts the structured recipe) or by hand.
- **Meal planning** — a monthly calendar plus a weekly meal-prep view with macro totals.
- **Shopping** — a grocery list generated from the week's planned meals, minus the
  pantry staples you already keep on hand.

## Tech

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Supabase (Postgres, Auth, RLS)
· USDA FoodData Central (nutrition) · Anthropic Claude (recipe parsing).

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment variables

Copy `.env.example` to `.env.local` and fill in as you reach each phase:

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API |
| `USDA_API_KEY` | https://fdc.nal.usda.gov/api-key-signup.html (free) |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/ |

The Supabase URL and anon key are safe to expose to the browser — Row Level
Security protects the data. `USDA_API_KEY` and `ANTHROPIC_API_KEY` are server-only.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build (also the fastest full typecheck) |
| `npm run lint` | Run ESLint |

## Roadmap

1. ✅ Foundation — scaffold, Supabase clients, responsive app shell
2. Auth · 3. Database schema + RLS · 4. Recipes · 5. Macros · 6. Meal planning · 7. Shopping list
