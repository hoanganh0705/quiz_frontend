

export interface NotificationPreferencesResponseDto {

inAppEnabled: boolean;

emailEnabled: boolean;

pushEnabled: boolean;

achievementEnabled: boolean;

tournamentEnabled: boolean;

rankEnabled: boolean;

friendEnabled: boolean;

commentEnabled: boolean;

summaryEnabled: boolean;

marketingEnabled: boolean;

rankImprovementThreshold: number;

quietHoursStart?: string | null;

quietHoursEnd?: string | null;
}
