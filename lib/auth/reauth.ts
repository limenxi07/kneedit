/** How recent a sign-in must be to delete an account. Matches delete_my_account(). */
export const REAUTH_AFTER_MS = 24 * 60 * 60 * 1000;

/** Whether the user must sign in again before a sensitive action. */
export function needsReauth(
  lastSignInAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!lastSignInAt) return true;
  const signedIn = new Date(lastSignInAt).getTime();
  if (Number.isNaN(signedIn)) return true;
  return now.getTime() - signedIn >= REAUTH_AFTER_MS;
}
