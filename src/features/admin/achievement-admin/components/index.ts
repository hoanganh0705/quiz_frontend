/**
 * `features/admin/achievement-admin/components/index.ts`
 *
 * Barrel export for all achievement-admin components.
 *
 * Source epic:   Epic 7.8.
 * Source ticket: TKT-7.8.D1–D5, E1, E2.
 */

// Primitives
export { AchievementAdminSkeleton } from './AchievementAdminSkeleton';
export { AchievementAdminEmptyState } from './AchievementAdminEmptyState';
export { AchievementAdminErrorState } from './AchievementAdminErrorState';

// Re-evaluate components
export { ReevaluateButton } from './ReevaluateButton';
export type { ReevaluateButtonProps } from './ReevaluateButton';

export { ReevaluateRunningIndicator } from './ReevaluateRunningIndicator';
export type { ReevaluateRunningIndicatorProps } from './ReevaluateRunningIndicator';

export { ReevaluateResultSummary } from './ReevaluateResultSummary';
export type { ReevaluateResultSummaryProps } from './ReevaluateResultSummary';

// Revoke dialog
export { RevokeBadgeDialog } from './RevokeBadgeDialog';
export type { RevokeBadgeDialogProps } from './RevokeBadgeDialog';

// History panel
export { UserAchievementHistoryPanel } from './UserAchievementHistoryPanel';
export type { UserAchievementHistoryPanelProps } from './UserAchievementHistoryPanel';

// Row + list
export { UserBadgeRow } from './UserBadgeRow';
export type { UserBadgeRowProps } from './UserBadgeRow';

export { AchievementAdminBadgeList } from './AchievementAdminBadgeList';
export type { AchievementAdminBadgeListProps } from './AchievementAdminBadgeList';

// Page
export { AchievementAdminUserPage } from './AchievementAdminUserPage';
export type { AchievementAdminUserPageProps } from './AchievementAdminUserPage';
