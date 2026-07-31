/**
 * Profile fallbacks — default values for nullable profile fields.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source ticket: TKT-2.5.14.
 *
 * ## Purpose
 *
 * Provides fallback values for nullable profile fields (avatar, bio, displayName)
 * without mutating the original server data. These utilities ensure consistent
 * UI rendering even when optional profile fields are null.
 *
 * ## Usage
 *
 * ```typescript
 * import { getAvatarUrl, getDisplayName, getBio } from '@/features/users/utils';
 *
 * // In a component
 * const avatarUrl = getAvatarUrl(user);
 * const displayName = getDisplayName(user);
 * const bio = getBio(user);
 * ```
 *
 * ## Design Decisions
 *
 * - Null avatar → Use default avatar SVG
 * - Null displayName → Fall back to username
 * - Null bio → Empty string (not placeholder text)
 *
 * These choices ensure the UI is functional but not misleading.
 */

import type { UserMeResponseDto } from '@/features/users/types';

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Default avatar SVG data URI.
 * A simple person silhouette.
 */
export const DEFAULT_AVATAR_URL =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394a3b8"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';

/**
 * Fallback display name prefix when displayName is null.
 */
export const ANONYMOUS_DISPLAY_NAME = 'Anonymous User';

// ─── Type-Safe Fallback Functions ─────────────────────────────────────────────

/**
 * Get the avatar URL, returning the default if null.
 * Does NOT mutate the original user object.
 */
export function getAvatarUrl(user: UserMeResponseDto | null | undefined): string {
  if (!user) return DEFAULT_AVATAR_URL;
  if (user.avatarUrl === null || user.avatarUrl === undefined || user.avatarUrl === '') {
    return DEFAULT_AVATAR_URL;
  }
  return user.avatarUrl;
}

/**
 * Get the display name, falling back to username if null.
 * Does NOT mutate the original user object.
 */
export function getDisplayName(
  user: UserMeResponseDto | null | undefined,
  options?: { anonymousLabel?: string }
): string {
  if (!user) return options?.anonymousLabel ?? ANONYMOUS_DISPLAY_NAME;

  if (user.displayName !== null && user.displayName !== undefined && user.displayName !== '') {
    return user.displayName;
  }

  // Fall back to username
  return user.username;
}

/**
 * Get the bio, returning empty string if null.
 * Does NOT mutate the original user object.
 */
export function getBio(user: UserMeResponseDto | null | undefined): string {
  if (!user) return '';
  if (user.bio === null || user.bio === undefined) return '';
  return user.bio;
}

/**
 * Get a formatted display string for the user.
 * Useful for tooltips and accessibility labels.
 */
export function getUserDisplayString(
  user: UserMeResponseDto | null | undefined
): string {
  if (!user) return ANONYMOUS_DISPLAY_NAME;

  const displayName = getDisplayName(user);
  const username = user.username;

  if (displayName === username) {
    return `@${username}`;
  }

  return `${displayName} (@${username})`;
}

/**
 * Check if the user has completed their profile.
 */
export function isProfileComplete(user: UserMeResponseDto | null | undefined): boolean {
  if (!user) return false;
  return user.displayName !== null && user.displayName !== undefined && user.displayName !== '';
}

/**
 * Check if the user has set a custom avatar.
 */
export function hasCustomAvatar(user: UserMeResponseDto | null | undefined): boolean {
  if (!user) return false;
  return user.avatarUrl !== null && user.avatarUrl !== undefined && user.avatarUrl !== '';
}
