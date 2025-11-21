/**
 * Checks if a username is temporary and needs to be set.
 *
 * Previously relied on pattern matching (User + 10 hex chars), which caused an infinite loop bug:
 * Users who CHOSE usernames like "User123abc" would be repeatedly prompted to change their username.
 *
 * Now uses an explicit database flag (username_is_temporary) to track whether a username is auto-generated.
 * - Set to true when user is created with temp username
 * - Set to false when user manually sets a username (even if it matches the pattern!)
 *
 * @param usernameIsTemporary - Boolean flag from database indicating if username is auto-generated
 * @returns true if username needs to be set, false otherwise
 */
export function needsUsernameSet(usernameIsTemporary: boolean | null | undefined): boolean {
  return usernameIsTemporary === true;
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
