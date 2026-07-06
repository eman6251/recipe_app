@AGENTS.md

# Skillet — Recipes & Meal Prep

Personal app for one primary user: a recipe box, meal planner, macro tracker,
and smart shopping list. Used mainly on desktop (Mac), with the recipe and
shopping views tuned for one-handed phone use in the kitchen / at the store.

## Stack

- **Next.js 16** (App Router, TypeScript, `src/` dir, Turbopack) — see AGENTS.md:
  this Next version has breaking changes vs. older training data; the auth-session
  refresher lives in `src/proxy.ts` (NOT `middleware.ts` — that convention is
  deprecated in v16). Read `node_modules/next/dist/docs/01-app/` before using an
  unfamiliar Next API.
- **Tailwind CSS v4** for styling (config-less; `@import "tailwindcss"` in
  `globals.css`).
- **Supabase** (Postgres + Auth + Row Level Security) — backend/DB.
  - Browser client: `src/lib/supabase/client.ts`
  - Server client: `src/lib/supabase/server.ts`
  - Session refresh (proxy): `src/lib/supabase/middleware.ts`
- **USDA FoodData Central** — nutrition source for macros (per-ingredient,
  computed from gram weights).
- **Anthropic Claude API** — parses pasted TikTok/Instagram recipe captions into
  structured recipes + gram estimates + suggested USDA matches.

## Key design decisions

- **Ingredients are structured data** (`{quantity, unit, item}`), never free text.
  This is what enables portion multipliers, macro math, shopping aggregation, and
  pantry logic.
- **Macros = Σ(grams × USDA per-100g)**, computed and cached, so they stay correct
  under portion multipliers.
- **Recipe input:** AI-paste (Claude) + a manual form fallback. Most of the ~100
  starter recipes are video-only (IG/TikTok), so paste-the-caption is the fast path.

## Roadmap

1. ✅ Foundation — scaffold, Supabase clients, responsive app shell
2. Auth — sign up / log in, protected routes
3. Schema + RLS — recipes, ingredients, meal plans, shopping, pantry
4. Recipes CRUD — AI-paste importer, manual form, NYT-style recipe view
5. Macros — USDA lookup + per-serving/week computation
6. Meal planning — month calendar + weekly prep view with macro totals
7. Shopping list — aggregate week's ingredients minus pantry staples

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build (also the fastest full typecheck)
- `npm run lint` — ESLint
