/**
 * Checks if a username is missing or temporary and needs to be set.
 *
 * Users need to set a username if:
 * 1. No username is set (empty string)
 * 2. Username starts with "User" followed by 10 hex chars (temporary auto-generated username)
 *    Example: User1a2b3c4d5e
 *
 * @param username - The username to check
 * @returns true if username needs to be set, false otherwise
 */
export function needsUsernameSet(username: string | null | undefined): boolean {
  if (!username) return true;
  if (username.trim() === "") return true;
  // Check for temporary username pattern: User + 10 hex characters
  if (/^User[a-f0-9]{10}$/i.test(username)) return true;
  return false;
}

/**
 * Generates a username picker URL with optional redirect parameter.
 *
 * @param redirectTo - Optional path to redirect to after setting username
 * @returns URL string for username picker page
 */
export function getUsernamePickerUrl(redirectTo?: string): string {
  const baseUrl = "/protected/username";

  if (!redirectTo) {
    return baseUrl;
  }

  // Ensure redirectTo is a relative path
  const safePath = redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;
  const params = new URLSearchParams({ redirect: safePath });

  return `${baseUrl}?${params.toString()}`;
}
