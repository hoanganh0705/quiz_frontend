// Tournaments components barrel

// Status badge
export { TournamentStatusBadge } from "./TournamentStatusBadge";

// Card
export { TournamentCard } from "./TournamentCard";

// Header
export { TournamentHeader } from "./TournamentHeader";

// Filter bar
export { TournamentFilters } from "./TournamentFilters";
export type { TournamentFiltersProps } from "./TournamentFilters";

// List composition
export { TournamentList } from "./TournamentList";
export type { TournamentListProps } from "./TournamentList";

// Page compositions
export { TournamentsPage } from "./TournamentsPage";
export type { TournamentsPageProps } from "./TournamentsPage";

export { TournamentDetailPage } from "./TournamentDetailPage";
export type { TournamentDetailPageProps } from "./TournamentDetailPage";

// Participant list
export { ParticipantList } from "./ParticipantList";
export type { ParticipantListProps } from "./ParticipantList";

// Leaderboard
export { TournamentLeaderboard } from "./TournamentLeaderboard";
export type { TournamentLeaderboardProps } from "./TournamentLeaderboard";

// Placeholder (feature flag fallback)
export { TournamentPlaceholder } from "./TournamentPlaceholder";
export type { TournamentPlaceholderProps } from "./TournamentPlaceholder";

// Shared primitives
export {
  TournamentCardSkeleton,
  TournamentDetailSkeleton,
} from "./shared/TournamentSkeleton";
export {
  TournamentEmptyState,
} from "./shared/TournamentEmptyState";
export type { TournamentEmptyStateVariant } from "./shared/TournamentEmptyState";
export {
  TournamentErrorState,
} from "./shared/TournamentErrorState";
export {
  TournamentStaleState,
} from "./shared/TournamentStaleState";
export {
  TournamentListSkeleton,
} from "./shared/TournamentListSkeleton";
export {
  ParticipantListSkeleton,
} from "./shared/ParticipantListSkeleton";
export {
  LeaderboardSkeleton,
} from "./shared/LeaderboardSkeleton";

// Story 5.3 — Registration components
export {
  WithdrawDialog,
} from "./shared/WithdrawDialog";
export type { WithdrawDialogProps } from "./shared/WithdrawDialog";

export {
  RegistrationErrorBanner,
} from "./shared/RegistrationErrorBanner";
export type { RegistrationErrorBannerProps } from "./shared/RegistrationErrorBanner";

export {
  TournamentCapacityIndicator,
} from "./shared/TournamentCapacityIndicator";
export type { TournamentCapacityIndicatorProps } from "./shared/TournamentCapacityIndicator";

export {
  TournamentRegistrationCta,
} from "./TournamentRegistrationCta";
export type { TournamentRegistrationCtaProps } from "./TournamentRegistrationCta";

export {
  RegistrationState,
} from "./RegistrationState";
export type { RegistrationStateProps } from "./RegistrationState";
