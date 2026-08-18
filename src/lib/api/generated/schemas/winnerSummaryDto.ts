

import type { WinnerSummaryDtoDisplayName } from './winnerSummaryDtoDisplayName';
import type { WinnerSummaryDtoAvatarUrl } from './winnerSummaryDtoAvatarUrl';

export interface WinnerSummaryDto {

userId: string;

username: string;

displayName: WinnerSummaryDtoDisplayName;

avatarUrl: WinnerSummaryDtoAvatarUrl;

quizTitle: string;

amountWon: string;

timeAgo: string;

wonAt: string;
}
