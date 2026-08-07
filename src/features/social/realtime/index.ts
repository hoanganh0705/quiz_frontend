/**
 * `features/social/realtime/` — Story 6.10 realtime layer barrel.
 *
 * Source epic: Epic 6.10 — Realtime Social Notifications and Relationship
 *              Invalidation.
 *
 * The barrel exposes the event catalogue, the typed router, the
 * payload validator, and the dedup / sequence-guard primitives that
 * every listener hook (Batch E) and UI primitive (Batch F) consume.
 * Consumers should import from this barrel rather than reaching
 * into the individual files.
 */

// Event catalogue + DTOs
export type {
  SocialSocketEventPayload,
  SocialEventKind,
  RelationshipChangedPayload,
  BlockedChangedPayload,
  FriendRequestReceivedPayload,
  FriendRequestRespondedPayload,
  FriendRequestCancelledPayload,
  FriendAddedPayload,
  FriendRemovedPayload,
  FollowReceivedPayload,
  FeedItemAddedPayload,
} from "./social-event-payloads";

// Router
export {
  routeSocialSocketEvent,
  type RoutedSocialEvent,
  type RawSocketEvent,
} from "./social-event-router";

// Validator
export {
  validateSocialPayload,
  type ValidationResult,
} from "./validate-social-payload";

// Dedup primitive (TKT-6.10.D1)
export {
  EventDeduplicator,
  useEventDeduplicator,
  EventDeduplicatorContext,
  type EventDeduplicatorInterface,
} from "./event-deduplicator";

// Sequence guard primitive (TKT-6.10.D2)
export {
  EventSequenceGuard,
  useEventSequenceGuard,
  EventSequenceGuardContext,
  type EventSequenceGuardInterface,
  type SequenceGuardDecision,
} from "./event-sequence-guard";

// Shared listener wrapper (TKT-6.10.E7)
export {
  useSocialRealtimeEvent,
  type UseSocialRealtimeEventOptions,
  type SocialRealtimeDispatch,
} from "./use-social-realtime-event";

// WS error user-copy registry (TKT-6.10.F1)
export {
  REALTIME_WS_ERROR_CODES,
  REALTIME_WS_ERROR_COPY,
  getRealtimeWsErrorCopy,
  isRealtimeWsErrorCode,
  mapWsErrorToRealtimeCode,
  type RealtimeWsErrorCode,
  type RealtimeWsErrorCopy,
} from "./realtime-ws-error-copy";