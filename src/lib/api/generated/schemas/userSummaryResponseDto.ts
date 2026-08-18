

import type { LevelTitle } from './levelTitle';

export interface UserSummaryResponseDto {

userId: string;

username: string;

displayName?: string | null;

avatarUrl?: string | null;

bio?: string | null;

country?: string | null;

countryCode?: string | null;

bgImageUrl?: string | null;

createdAt: string;

updatedAt: string;

xpTotal: number;

level: number;

currentLevelXP: number;

nextLevelXP: number;

xpProgressPercent: number;

levelTitle: LevelTitle;

levelTitleLocalised: string;

currentStreak: number;

longestStreak: number;

quizzesCreated: number;

quizzesPublished: number;

quizzesTaken: number;

followers: number;

following: number;

friends: number;
}
