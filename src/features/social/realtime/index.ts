

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

export {
routeSocialSocketEvent,
type RoutedSocialEvent,
type RawSocketEvent,
} from "./social-event-router";

export {
validateSocialPayload,
type ValidationResult,
} from "./validate-social-payload";

export {
EventDeduplicator,
useEventDeduplicator,
EventDeduplicatorContext,
type EventDeduplicatorInterface,
} from "./event-deduplicator";

export {
EventSequenceGuard,
useEventSequenceGuard,
EventSequenceGuardContext,
type EventSequenceGuardInterface,
type SequenceGuardDecision,
} from "./event-sequence-guard";

export {
useSocialRealtimeEvent,
type UseSocialRealtimeEventOptions,
type SocialRealtimeDispatch,
} from "./use-social-realtime-event";

export {
REALTIME_WS_ERROR_CODES,
REALTIME_WS_ERROR_COPY,
getRealtimeWsErrorCopy,
isRealtimeWsErrorCode,
mapWsErrorToRealtimeCode,
type RealtimeWsErrorCode,
type RealtimeWsErrorCopy,
} from "./realtime-ws-error-copy";