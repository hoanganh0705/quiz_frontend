

import type { UpdatePreferencesDtoQuietHoursStart } from './updatePreferencesDtoQuietHoursStart';
import type { UpdatePreferencesDtoQuietHoursEnd } from './updatePreferencesDtoQuietHoursEnd';

export interface UpdatePreferencesDto {

inAppEnabled?: boolean;

emailEnabled?: boolean;

pushEnabled?: boolean;

achievementEnabled?: boolean;

tournamentEnabled?: boolean;

rankEnabled?: boolean;

friendEnabled?: boolean;

commentEnabled?: boolean;

summaryEnabled?: boolean;

marketingEnabled?: boolean;

rankImprovementThreshold?: number;

quietHoursStart?: UpdatePreferencesDtoQuietHoursStart;

quietHoursEnd?: UpdatePreferencesDtoQuietHoursEnd;
}
