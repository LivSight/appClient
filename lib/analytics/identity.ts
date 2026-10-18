export type IdentityAction = "identify" | "reset" | "none";

/** Decides how to sync the auth state with PostHog when the logged-in user changes. */
export function resolveIdentityAction(
  currentUserId: string | null,
  previousUserId: string | null,
): IdentityAction {
  if (currentUserId) {
    return currentUserId === previousUserId ? "none" : "identify";
  }
  return previousUserId ? "reset" : "none";
}
