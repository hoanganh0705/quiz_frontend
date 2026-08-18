

import type { UserMeResponseDto } from '@/features/users/types';

export const DEFAULT_AVATAR_URL =
'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394a3b8"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';

export const ANONYMOUS_DISPLAY_NAME = 'Anonymous User';

export function getAvatarUrl(user: UserMeResponseDto | null | undefined): string {
if (!user) return DEFAULT_AVATAR_URL;
if (user.avatarUrl === null || user.avatarUrl === undefined || user.avatarUrl === '') {
return DEFAULT_AVATAR_URL;
  }
return user.avatarUrl;
}

export function getDisplayName(
user: UserMeResponseDto | null | undefined,
options?: { anonymousLabel?: string }
): string {
if (!user) return options?.anonymousLabel ?? ANONYMOUS_DISPLAY_NAME;

if (user.displayName !== null && user.displayName !== undefined && user.displayName !== '') {
return user.displayName;
  }

return user.username;
}

export function getBio(user: UserMeResponseDto | null | undefined): string {
if (!user) return '';
if (user.bio === null || user.bio === undefined) return '';
return user.bio;
}

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

export function isProfileComplete(user: UserMeResponseDto | null | undefined): boolean {
if (!user) return false;
return user.displayName !== null && user.displayName !== undefined && user.displayName !== '';
}

export function hasCustomAvatar(user: UserMeResponseDto | null | undefined): boolean {
if (!user) return false;
return user.avatarUrl !== null && user.avatarUrl !== undefined && user.avatarUrl !== '';
}
