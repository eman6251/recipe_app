/**
 * Marks a session as having been opened by a password-reset link.
 *
 * Without it, anyone who found an already-signed-in browser could change the
 * password and lock the owner out. With it, the reset page asks for the
 * current password unless the user just proved they control the mailbox.
 *
 * Short-lived on purpose: it's a receipt for a reset that just happened, not
 * a standing permission.
 */
export const RECOVERY_COOKIE = "skillet-recovery";
export const RECOVERY_WINDOW_SECONDS = 15 * 60;
