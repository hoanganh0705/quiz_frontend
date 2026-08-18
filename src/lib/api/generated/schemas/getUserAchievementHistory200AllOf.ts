

import type { AdminAchievementHistoryItemDto } from './adminAchievementHistoryItemDto';
import type { GetUserAchievementHistory200AllOfMeta } from './getUserAchievementHistory200AllOfMeta';

export type GetUserAchievementHistory200AllOf = {
data?: AdminAchievementHistoryItemDto[];
meta?: GetUserAchievementHistory200AllOfMeta;
};
