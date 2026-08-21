/**
 * The guided walkthrough.
 *
 * Most of what Skillet does — planning a week, subtracting the pantry from a
 * shopping list, computing macros from gram weights — isn't in other recipe
 * apps, so there's no prior habit to lean on. The tour walks the actual pages
 * rather than describing them, because seeing the calendar with an arrow
 * pointing at it explains it faster than any paragraph.
 */

export type TourStep = {
  /** Route this step lives on. The tour navigates there before showing it. */
  path: string;
  /**
   * data-tour value of the element to point at. Omitted for steps with
   * nothing specific to indicate, which render centred with no arrow.
   */
  target?: string;
  title: string;
  body: string;
  /** A concrete "use it like this", shown under the body. */
  tip?: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    path: "/",
    title: "Welcome to Skillet",
    body: "This is a recipe box, a meal-prep planner, a macro tracker and a shopping list that all feed each other. Two minutes here will save you hunting around later.",
    tip: "You can leave at any point and pick it up again from your profile.",
  },
  {
    path: "/recipes/new",
    target: "import-panel",
    title: "Add a recipe by pasting it",
    body: "Most good recipes live in a video caption, not on a website. Paste the caption — or a TikTok link — and Claude pulls out the ingredients, quantities and steps, and estimates a gram weight for each line.",
    tip: "Ingredients are stored as structured data, not text. That's what lets everything else work: portion scaling, macro maths, shopping totals.",
  },
  {
    path: "/recipes",
    target: "page-header",
    title: "Macros come from the ingredients",
    body: "Open any recipe and compute its macros. Each ingredient is matched against the USDA food database and multiplied by its gram weight, so the numbers stay right when you scale the recipe up or down.",
    tip: "Matching isn't perfect yet — check the per-ingredient list if a number looks off.",
  },
  {
    path: "/recipe-box",
    target: "page-header",
    title: "Your recipe box",
    body: "Everything you've added, plus anything you've favourited from other people. Filter by meal, diet, time or equipment. The pill in the corner of each card toggles whether that recipe is shared.",
    tip: "Shared recipes show your username as the author — never your email.",
  },
  {
    path: "/calendar",
    target: "page-header",
    title: "Plan the month",
    body: "Drop a recipe onto a day and say how many portions. Because meal prep means cooking once and eating across several days, the portions spread themselves over consecutive days automatically.",
    tip: "Going out on Wednesday? Drag that meal to Friday — the plan bends around your week.",
  },
  {
    path: "/week",
    target: "page-header",
    title: "This week, at a glance",
    body: "Everything you're cooking this week with the macro totals underneath. Tick a recipe off once you've cooked it — that's per recipe, not per day, because one cook covers the whole batch.",
    tip: "Use this on a Sunday to see whether the week actually hits your protein.",
  },
  {
    path: "/shopping",
    target: "page-header",
    title: "The list builds itself",
    body: "Every ingredient from the week you're cooking, added up and scaled to the portions you planned. Names for the same thing get merged, so scallions from one recipe and green onions from another become one line.",
    tip: "A batch counts on the day you cook it, so meals you cooked last week and are still eating don't get shopped for twice.",
  },
  {
    path: "/pantry",
    target: "page-header",
    title: "Tell it what you already own",
    body: "Salt, olive oil, soy sauce — things you don't want on the list every week. Anything in here is left off automatically, and put back on when the week would run you out.",
    tip: "Weigh a jar and enter the grams, and it'll warn you before you run out mid-recipe.",
  },
  {
    path: "/friends",
    target: "page-header",
    title: "Cook with other people",
    body: "Share your friend code, or add someone from the author byline on a recipe they've shared. Once you're friends you can message each other and start group chats.",
    tip: "Nobody can find you by browsing — only by a code you hand out or a recipe you've published.",
  },
  {
    path: "/profile",
    target: "tour-button",
    title: "That's the tour",
    body: "Every page has an (i) next to its description with more detail on how it works. And this button replays the walkthrough whenever you want it.",
  },
];

/** Within a day of signing up — someone who has genuinely never seen this. */
export function isNewAccount(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const DAY_MS = 24 * 60 * 60 * 1000;
  return Date.now() - new Date(createdAt).getTime() < DAY_MS;
}

/**
 * Which introduction, if any, this person is due.
 *
 * "auto" drops a new account straight into the walkthrough. "prompt" offers
 * it to someone who was already using the app before it existed, since
 * hijacking a screen they know their way around would be rude. Null once
 * they've been asked — the flag records that they were offered it, not that
 * they watched it, because asking twice is the annoying failure.
 */
export function tourInvitation(
  createdAt: string | null | undefined,
  seenAt: string | null | undefined,
): "auto" | "prompt" | null {
  if (seenAt) return null;
  return isNewAccount(createdAt) ? "auto" : "prompt";
}
