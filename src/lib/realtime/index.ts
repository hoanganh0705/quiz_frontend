

export { ConnectionRegistry } from "./connection-registry";
export { emitPhase5Invalidation, CROSS_TAB_INVALIDATION_CHANNEL } from "./cross-tab-invalidation";
export type {
Phase5InvalidationPayload,
Phase5InvalidationSource,
} from "./cross-tab-invalidation";

export {

INSTANCES_NAMESPACE,
NOTIFICATIONS_NAMESPACE,
COMMENTS_NAMESPACE,
COINS_NAMESPACE,
INSTANCE_JOINED,
INSTANCE_LEFT,
INSTANCE_STARTED,
INSTANCE_CLOSED,
PLAYER_JOINED,
PLAYER_LEFT,
QUESTION_REVEALED,
ANSWER_RESULT,
LEADERBOARD_UPDATED,
NOTIFICATION_SENT,
NOTIFICATION_DELETED,
NOTIFICATION_READ,
COMMENT_CREATED,
COMMENT_EDITED,
COMMENT_DELETED,
COMMENT_HIDDEN,
COMMENT_RESTORED,
VOTE_CAST,
VOTE_REMOVED,
COIN_BALANCE_CHANGED,
COIN_TRANSACTION_RECORDED,
INSTANCE_EVENT_NAMES,
NOTIFICATION_EVENT_NAMES,
COMMENT_EVENT_NAMES,
COIN_EVENT_NAMES,

type InstanceEventName,
type NotificationEventName,
type CommentEventName,
type CoinEventName,
type InstanceEventPayload,
type NotificationEventPayload,
type CommentEventPayload,
type CoinEventPayload,
type InstanceSocketEvent,
type NotificationSocketEvent,
type CommentSocketEvent,
type CoinSocketEvent,
type WsErrorPayload,

type CoinBalanceChangedPayload,
type CoinTransactionRecordedPayload,
} from "./events";

export {

normalizeArray,
normalizePaginated,
normalizeSingle,
normalizeBadgeArray,
type CursorPaginatedResult,
type OffsetPaginatedResult,
type NormalizedPaginatedResult,
type NormalizedBadge,
} from "./dto-adapters";

export {

decodeWsError,
getWsUserCopy,
KNOWN_WS_ERROR_CODES,
type WsError,
} from "./ws-error";

export {

ConnectionStateReducer,
INITIAL_CONNECTION_CONTEXT,
MAX_RETRY_COUNT,
type SocketConnectionState,
type ConnectionStateContext,
type ConnectionStateEvent,
} from "./connection-state";

export {

useSocket,
type UseSocketOptions,
type UseSocketReturn,
} from "./useSocket";

export {
useRealtimeEvent,
type UseRealtimeEventOptions,
} from "./useRealtimeEvent";

export {
useRealtimeQuery,
type RealtimeInvalidationRule,
type UseRealtimeQueryOptions,
} from "./useRealtimeQuery";
