/**
 * Colour theme preference.
 *
 * Kept in a cookie rather than localStorage so the server can stamp the right
 * theme onto <html> while rendering. Reading it in the browser would mean the
 * first paint is whatever the OS says, then a flash to the chosen theme.
 */

export const THEME_COOKIE = "skillet-theme";

export type ThemeChoice = "light" | "dark" | "system";

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * What to put in the data-theme attribute, or null to leave it off.
 *
 * "system" stamps nothing on purpose: with no attribute, the
 * prefers-color-scheme rules in globals.css decide, which is the whole point
 * of following the OS.
 */
export function themeAttribute(choice: ThemeChoice): "light" | "dark" | null {
  return choice === "system" ? null : choice;
}
