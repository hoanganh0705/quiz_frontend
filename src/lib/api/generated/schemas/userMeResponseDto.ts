

import type { UserMeResponseDtoSettings } from './userMeResponseDtoSettings';

export interface UserMeResponseDto {

userId: string;

username: string;

email: string;

displayName?: string | null;

avatarUrl?: string | null;

bio?: string | null;

xpTotal: number;

currentStreak: number;

longestStreak: number;

settings: UserMeResponseDtoSettings;

createdAt: string;

updatedAt: string;
}
