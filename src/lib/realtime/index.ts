/**
 * Phase 5 realtime integration primitives.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.B2 (core), TKT-5.1.C1 (events), TKT-5.1.C2 (DTO adapters),
 *                TKT-5.1.D1 (WS errors), TKT-5.1.D2 (connection state),
 *                TKT-5.1.E1 (useSocket), TKT-5.1.E2 (useRealtimeEvent),
 *                TKT-5.1.E3 (useRealtimeQuery).
 *
 * ## What's here
 *
 * This module provides the foundational realtime primitives shared by all
 * Phase 5 feature stories (5.2–5.8):
 *
 *   - `ConnectionRegistry` — singleton manager that tracks open Socket.IO
 *     connections per namespace, prevents duplicate listeners, and provides
 *     cleanup on unmount.
 *   - `Phase5InvalidationPayload` and the Phase 5 `BroadcastChannel`
 *     integration for cross-tab invalidation.
 *   - `emitPhase5Invalidation` — the broadcast emitter used by service
 *     wrappers and realtime hooks to invalidate SWR caches in sibling tabs.
 *   - Typed Socket.IO event catalogue (`events.ts`) — event name constants,
 *     payload interfaces, and discriminated union envelopes.
 *   - DTO adapters (`dto-adapters.ts`) — normalise bare arrays, mixed
 *     pagination, and nullable singleton responses.
 *   - WS error decoder (`ws-error.ts`) — parses Socket.IO error frames
 *     with retryability and auth-required flags.
 *   - Connection state machine (`connection-state.ts`) — typed state
 *     reducer for Socket.IO connection lifecycle.
 *   - `useSocket` — authenticated Socket.IO connection manager hook.
 *   - `useRealtimeEvent` — typed Socket.IO event listener hook.
 *   - `useRealtimeQuery` — SWR invalidation driven by socket events.
 *
 * ## Module map
 *
 * | File                   | Purpose                                          |
 * |------------------------|--------------------------------------------------|
 * | `connection-registry.ts`| Singleton socket registry + listener management    |
 * | `cross-tab-invalidation.ts`  | Cross-tab BroadcastChannel invalidation           |
 * | `events.ts`            | Typed event names, payloads, discriminated unions |
 * | `dto-adapters.ts`      | Response normalisation utilities                  |
 * | `ws-error.ts`         | Socket.IO error decoder                         |
 * | `connection-state.ts`  | Connection state machine reducer                 |
 * | `useSocket.ts`         | Authenticated Socket.IO connection manager hook  |
 * | `useRealtimeEvent.ts`  | Typed event listener hook                       |
 * | `useRealtimeQuery.ts`  | SWR invalidation driven by socket events         |
 *
 * ## SSR-safety
 *
 * All exports gracefully no-op during SSR (`typeof window === 'undefined'`).
 */

export { ConnectionRegistry } from "./connection-registry";
export { emitPhase5Invalidation, CROSS_TAB_INVALIDATION_CHANNEL } from "./cross-tab-invalidation";
export type {
  Phase5InvalidationPayload,
  Phase5InvalidationSource,
} from "./cross-tab-invalidation";

export {
  // Event catalogue
  INSTANCES_NAMESPACE,
  NOTIFICATIONS_NAMESPACE,
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
  INSTANCE_EVENT_NAMES,
  NOTIFICATION_EVENT_NAMES,
  // Types
  type InstanceEventName,
  type NotificationEventName,
  type InstanceEventPayload,
  type NotificationEventPayload,
  type InstanceSocketEvent,
  type NotificationSocketEvent,
  type WsErrorPayload,
} from "./events";

export {
  // DTO adapters
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
  // WS error decoder
  decodeWsError,
  getWsUserCopy,
  KNOWN_WS_ERROR_CODES,
  type WsError,
} from "./ws-error";

export {
  // Connection state machine
  ConnectionStateReducer,
  INITIAL_CONNECTION_CONTEXT,
  MAX_RETRY_COUNT,
  type SocketConnectionState,
  type ConnectionStateContext,
  type ConnectionStateEvent,
} from "./connection-state";

export {
  // Hooks
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
