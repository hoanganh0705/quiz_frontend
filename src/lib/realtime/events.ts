/**
 * Typed Socket.IO event catalogue for Phase 5 namespaces.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.C1.
 *
 * ## Purpose
 *
 * Every Socket.IO event emitted by the Phase 5 namespaces (`/instances`,
 * `/notifications`) has a typed constant here. Components and hooks import
 * event names from this catalogue — never raw strings — so typos are caught
 * at compile time and renaming is a single-file change.
 *
 * Payload interfaces mirror the shapes confirmed by the backend gateway.
 * Until the backend team confirms the exact event names (see action item in
 * TKT-5.1.A1 evidence), this file uses stub names derived from the master
 * plan's Phase 5 description. The `// BACKEND_CONFIRM:` comments mark every
 * value that requires backend sign-off.
 *
 * ## Event name constants
 *
 * Each constant is `as const` so TypeScript narrows it to a string literal
 * type, not `string`. This makes discriminated unions on event names valid.
 *
 * ## Error discriminated union
 *
 * Socket.IO error frames arrive as `{ event: 'error', data: { code, message } }`.
 * `WsErrorPayload` is the single error type in both `InstanceSocketEvent` and
 * `NotificationSocketEvent` discriminated unions.
 *
 * `WsErrorPayload` is defined inline here so `events.ts` has no dependency on
 * `ws-error.ts`. The `ws-error.ts` module (TKT-5.1.D1) re-exports it from here
 * to avoid duplication.
 */

export interface WsErrorPayload {
  code: string;
  message: string;
}

// ─── Namespace constants ────────────────────────────────────────────────────────

/** Socket.IO namespace for multiplayer quiz instances. */
export const INSTANCES_NAMESPACE = "/instances" as const;

/** Socket.IO namespace for user notifications. */
export const NOTIFICATIONS_NAMESPACE = "/notifications" as const;

/** Socket.IO namespace for quiz comments. */
export const COMMENTS_NAMESPACE = "/comments" as const;

// ─── Instance event names ───────────────────────────────────────────────────────

/**
 * Emitted to all participants when a player joins an instance.
 * BACKEND_CONFIRM: event name and payload fields.
 */
export const INSTANCE_JOINED = "instance:joined" as const;

/**
 * Emitted to all participants when a player leaves (or is removed from) an
 * instance.
 * BACKEND_CONFIRM: event name.
 */
export const INSTANCE_LEFT = "instance:left" as const;

/**
 * Emitted to all participants when the host starts the instance.
 * BACKEND_CONFIRM: event name and payload fields.
 */
export const INSTANCE_STARTED = "instance:started" as const;

/**
 * Emitted to all participants when the instance is closed (finished, cancelled,
 * or forcibly terminated).
 * BACKEND_CONFIRM: event name and payload fields.
 */
export const INSTANCE_CLOSED = "instance:closed" as const;

/**
 * Emitted to all participants when a player joins. Synonym for `INSTANCE_JOINED`
 * from the player's perspective.
 * BACKEND_CONFIRM: event name.
 */
export const PLAYER_JOINED = "player:joined" as const;

/**
 * Emitted to all participants when a player leaves.
 * BACKEND_CONFIRM: event name.
 */
export const PLAYER_LEFT = "player:left" as const;

/**
 * Emitted to all participants when a new question is revealed and the timer
 * begins.
 * BACKEND_CONFIRM: event name and payload fields.
 */
export const QUESTION_REVEALED = "question:revealed" as const;

/**
 * Emitted to the answering player after they submit an answer, with the result
 * (correct/incorrect, points earned).
 * BACKEND_CONFIRM: event name and payload fields.
 */
export const ANSWER_RESULT = "answer:result" as const;

/**
 * Emitted to all participants when the leaderboard is updated (e.g., after a
 * score change).
 * BACKEND_CONFIRM: event name and payload fields.
 */
export const LEADERBOARD_UPDATED = "leaderboard:updated" as const;

/** Every instance event name literal. */
export type InstanceEventName =
  | typeof INSTANCE_JOINED
  | typeof INSTANCE_LEFT
  | typeof INSTANCE_STARTED
  | typeof INSTANCE_CLOSED
  | typeof PLAYER_JOINED
  | typeof PLAYER_LEFT
  | typeof QUESTION_REVEALED
  | typeof ANSWER_RESULT
  | typeof LEADERBOARD_UPDATED;

// ─── Notification event names ──────────────────────────────────────────────────

/**
 * Emitted to the logged-in user when a new notification is created.
 * BACKEND_CONFIRM: event name and payload fields.
 */
export const NOTIFICATION_SENT = "notification:sent" as const;

/**
 * Emitted to the logged-in user when an existing notification is deleted.
 * BACKEND_CONFIRM: event name and payload fields.
 */
export const NOTIFICATION_DELETED = "notification:deleted" as const;

/**
 * Emitted to the logged-in user when a notification is marked as read.
 * BACKEND_CONFIRM: event name and payload fields.
 */
export const NOTIFICATION_READ = "notification:read" as const;

/** Every notification event name literal. */
export type NotificationEventName =
  | typeof NOTIFICATION_SENT
  | typeof NOTIFICATION_DELETED
  | typeof NOTIFICATION_READ;

// ─── Instance payload interfaces ────────────────────────────────────────────────

/**
 * Payload for `instance:joined`.
 * BACKEND_CONFIRM: all fields.
 */
export interface InstanceJoinedPayload {
  instanceId: string;
  userId: string;
  username: string;
  joinedAt: string; // ISO 8601
}

/**
 * Payload for `instance:left`.
 * BACKEND_CONFIRM: all fields.
 */
export interface InstanceLeftPayload {
  instanceId: string;
  userId: string;
  reason?: "left" | "kicked" | "disconnected";
}

/**
 * Payload for `instance:started`.
 * BACKEND_CONFIRM: all fields.
 */
export interface InstanceStartedPayload {
  instanceId: string;
  startedAt: string; // ISO 8601
}

/**
 * Payload for `instance:closed`.
 * BACKEND_CONFIRM: all fields.
 */
export interface InstanceClosedPayload {
  instanceId: string;
  reason: "finished" | "cancelled" | "timeout";
  closedAt: string; // ISO 8601
}

/**
 * Alias for `InstanceJoinedPayload` from the participant's perspective.
 * BACKEND_CONFIRM: same shape as `InstanceJoinedPayload`.
 */
export type PlayerJoinedPayload = InstanceJoinedPayload;

/**
 * Alias for `InstanceLeftPayload` from the participant's perspective.
 * BACKEND_CONFIRM: same shape as `InstanceLeftPayload`.
 */
export type PlayerLeftPayload = InstanceLeftPayload;

/**
 * Payload for `question:revealed`.
 * BACKEND_CONFIRM: all fields.
 */
export interface QuestionRevealedPayload {
  instanceId: string;
  questionId: string;
  roundId: string;
  questionNumber: number; // 1-indexed
  questionText: string;
  options?: string[]; // Multiple-choice options
  timeLimitSeconds: number;
  revealedAt: string; // ISO 8601
}

/**
 * Payload for `answer:result`.
 * BACKEND_CONFIRM: all fields.
 */
export interface AnswerResultPayload {
  instanceId: string;
  questionId: string;
  correct: boolean;
  correctAnswer?: string;
  pointsEarned: number;
  totalScore: number;
  answeredAt: string; // ISO 8601
}

/**
 * Payload for `leaderboard:updated`.
 * BACKEND_CONFIRM: all fields.
 */
export interface LeaderboardUpdatedPayload {
  instanceId: string;
  /** Ordered from rank 1 (top) to lowest. */
  entries: Array<{
    rank: number;
    userId: string;
    username: string;
    score: number;
  }>;
  updatedAt: string; // ISO 8601
}

/** Every non-error instance payload type. */
export type InstanceEventPayload =
  | InstanceJoinedPayload
  | InstanceLeftPayload
  | InstanceStartedPayload
  | InstanceClosedPayload
  | PlayerJoinedPayload
  | PlayerLeftPayload
  | QuestionRevealedPayload
  | AnswerResultPayload
  | LeaderboardUpdatedPayload;

// ─── Notification payload interfaces ───────────────────────────────────────────

/**
 * Payload for `notification:sent`.
 * BACKEND_CONFIRM: all fields.
 */
export interface NotificationSentPayload {
  notificationId: string;
  type: string; // e.g. "tournament_start", "instance_invite"
  title: string;
  body?: string;
  read: boolean;
  createdAt: string; // ISO 8601
  data?: Record<string, unknown>; // Additional context (instanceId, tournamentId, etc.)
}

/**
 * Payload for `notification:deleted`.
 * BACKEND_CONFIRM: all fields.
 */
export interface NotificationDeletedPayload {
  notificationId: string;
}

/**
 * Payload for `notification:read`.
 * BACKEND_CONFIRM: all fields.
 */
export interface NotificationReadPayload {
  notificationId: string;
  readAt: string; // ISO 8601
}

/** Every non-error notification payload type. */
export type NotificationEventPayload =
  | NotificationSentPayload
  | NotificationDeletedPayload
  | NotificationReadPayload;

// ─── Discriminated union envelopes ─────────────────────────────────────────────

/**
 * Any socket message on the `/instances` namespace — either a typed event
 * or an error frame.
 *
 * Usage:
 * ```ts
 * socket.on("instance:joined", (frame: InstanceSocketEvent) => {
 *   if (frame.event === "instance:joined") {
 *     // frame.data is InstanceJoinedPayload
 *   }
 * });
 * ```
 */
export interface InstanceSocketEvent {
  event: InstanceEventName;
  data: InstanceEventPayload | WsErrorPayload;
}

/**
 * Any socket message on the `/notifications` namespace.
 */
export interface NotificationSocketEvent {
  event: NotificationEventName;
  data: NotificationEventPayload | WsErrorPayload;
}

// ─── Aggregate exports ─────────────────────────────────────────────────────────

/** All Phase 5 instance event names as a readonly array (useful for type tests). */
export const INSTANCE_EVENT_NAMES = [
  INSTANCE_JOINED,
  INSTANCE_LEFT,
  INSTANCE_STARTED,
  INSTANCE_CLOSED,
  PLAYER_JOINED,
  PLAYER_LEFT,
  QUESTION_REVEALED,
  ANSWER_RESULT,
  LEADERBOARD_UPDATED,
] as const;

/** All Phase 5 notification event names as a readonly array. */
export const NOTIFICATION_EVENT_NAMES = [
  NOTIFICATION_SENT,
  NOTIFICATION_DELETED,
  NOTIFICATION_READ,
] as const;

// ─── Comment event names ──────────────────────────────────────────────────────

export const COMMENT_CREATED = "comment:created" as const;
export const COMMENT_EDITED = "comment:edited" as const;
export const COMMENT_DELETED = "comment:deleted" as const;
export const COMMENT_HIDDEN = "comment:hidden" as const;
export const COMMENT_RESTORED = "comment:restored" as const;
export const VOTE_CAST = "vote:cast" as const;
export const VOTE_REMOVED = "vote:removed" as const;

/** Every comment event name literal. */
export type CommentEventName =
  | typeof COMMENT_CREATED
  | typeof COMMENT_EDITED
  | typeof COMMENT_DELETED
  | typeof COMMENT_HIDDEN
  | typeof COMMENT_RESTORED
  | typeof VOTE_CAST
  | typeof VOTE_REMOVED;

export const COMMENT_EVENT_NAMES = [
  COMMENT_CREATED,
  COMMENT_EDITED,
  COMMENT_DELETED,
  COMMENT_HIDDEN,
  COMMENT_RESTORED,
  VOTE_CAST,
  VOTE_REMOVED,
] as const;

// ─── Comment payload interfaces ────────────────────────────────────────────────

/**
 * Full comment snapshot for realtime application.
 * Included in events so clients can update their local state directly without refetch.
 */
export interface CommentSnapshot {
  id: string;
  quizId: string;
  parentCommentId: string | null;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  body: string;
  isHidden: boolean;
  votesCount: number;
  upvotesCount: number;
  downvotesCount: number;
  repliesCount: number;
  userVote: "upvote" | "downvote" | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isReply: boolean;
}

export interface CommentCreatedPayload {
  eventType: "comment_created";
  commentId: string;
  quizId: string;
  parentCommentId: string | null;
  authorId: string;
  authorUsername: string;
  isReply: boolean;
  timestamp: string;
  /** Full comment snapshot for direct state application */
  snapshot?: CommentSnapshot;
}

export interface CommentEditedPayload {
  eventType: "comment_edited";
  commentId: string;
  quizId: string;
  authorId: string;
  timestamp: string;
  /** Full comment snapshot for direct state application */
  snapshot?: CommentSnapshot;
}

export interface CommentDeletedPayload {
  eventType: "comment_deleted";
  commentId: string;
  quizId: string;
  authorId: string;
  timestamp: string;
  /** Parent comment ID for thread updates */
  parentCommentId?: string | null;
}

export interface CommentHiddenPayload {
  eventType: "comment_hidden";
  commentId: string;
  quizId: string;
  moderatorId: string;
  timestamp: string;
  /** Full comment snapshot for direct state application */
  snapshot?: CommentSnapshot;
}

export interface CommentRestoredPayload {
  eventType: "comment_restored";
  commentId: string;
  quizId: string;
  moderatorId: string;
  timestamp: string;
  /** Full comment snapshot for direct state application */
  snapshot?: CommentSnapshot;
}

export interface VoteCastPayload {
  eventType: "vote_cast";
  commentId: string;
  quizId: string;
  voterId: string;
  value: "upvote" | "downvote";
  timestamp: string;
  /** Updated vote counts for direct state application */
  votesCount: number;
  upvotesCount: number;
  downvotesCount: number;
}

export interface VoteRemovedPayload {
  eventType: "vote_removed";
  commentId: string;
  quizId: string;
  voterId: string;
  timestamp: string;
  /** Updated vote counts for direct state application */
  votesCount: number;
  upvotesCount: number;
  downvotesCount: number;
}

/** Every non-error comment payload type. */
export type CommentEventPayload =
  | CommentCreatedPayload
  | CommentEditedPayload
  | CommentDeletedPayload
  | CommentHiddenPayload
  | CommentRestoredPayload
  | VoteCastPayload
  | VoteRemovedPayload;

// ─── Comment socket event envelope ───────────────────────────────────────────

export interface CommentSocketEvent {
  event: CommentEventName;
  data: CommentEventPayload | WsErrorPayload;
}

// ─── Coin event names (Phase 5 realtime — Story 5.9 coin economy) ────────────
//
// The coin economy is gated by `coin_economy_live` and uses the
// `/coins` Socket.IO namespace (`CoinGateway`, see backend
// `src/modules/coins/transport/gateway/coin.gateway.ts`).
//
// Two wire events are emitted to the user-scoped room (`user:{userId}`):
//
//   - `coin:balance_changed` — every wallet delta (both `coin.added`
//     and `coin.spent` from the outbox). The payload carries the new
//     balance + delta so the `<CoinBalancePill />` can update without
//     a refetch.
//
//   - `coin:transaction_recorded` — every new ledger row
//     (`coin_transactions`). The payload is a slim projection of
//     `CoinTransactionRecordedEvent`; the frontend uses it to prepend
//     to the transaction list and to fire a `<RewardToast />` on
//     positive deltas.

export const COINS_NAMESPACE = "/coins" as const;

export const COIN_BALANCE_CHANGED = "coin:balance_changed" as const;
export const COIN_TRANSACTION_RECORDED = "coin:transaction_recorded" as const;

/** Every coin event name literal. */
export type CoinEventName =
  | typeof COIN_BALANCE_CHANGED
  | typeof COIN_TRANSACTION_RECORDED;

export const COIN_EVENT_NAMES = [
  COIN_BALANCE_CHANGED,
  COIN_TRANSACTION_RECORDED,
] as const;

// ─── Coin payload interfaces ─────────────────────────────────────────────────

/**
 * Mirrors the backend `CoinBalanceChangedEvent` payload emitted by
 * `CoinGateway.serializeEvent`.
 */
export interface CoinBalanceChangedPayload {
  /** New balance after the delta was applied (server-authoritative). */
  newBalance: number;
  /** Signed delta — positive on rewards, negative on spends. */
  delta: number;
  /** Coarse reason code (`QUIZ_COMPLETION_REWARD`, `TIP_SENT`, …). */
  reason: string;
  /** Reference type discriminator for the ledger row, when applicable. */
  referenceType: string | null;
  /** Reference id (attempt id, user badge id, quiz id, …). */
  referenceId: string | null;
  /** ISO 8601 timestamp the outbox row was processed. */
  timestamp: string;
  /** User id of the wallet owner. */
  userId: string;
  /** Discriminator — always `'coin.balance_changed'`. */
  eventType: "coin.balance_changed";
}

/**
 * Mirrors the backend `CoinTransactionRecordedEvent` payload emitted by
 * `CoinGateway.serializeEvent`.
 */
export interface CoinTransactionRecordedPayload {
  /** Transaction id (`coin_transactions.transaction_id`). */
  transactionId: string;
  /** Wallet owner user id. */
  userId: string;
  /** Coarse reason code. */
  reason: string;
  /** Signed amount — positive on rewards, negative on spends. */
  amount: number;
  /** Wallet balance AFTER the ledger row was applied. */
  balanceAfter: number;
  /** Reference type discriminator for the ledger row, when applicable. */
  referenceType: string | null;
  /** Reference id. */
  referenceId: string | null;
  /** Optional structured metadata (sender for tips, badge for flairs, …). */
  metadata?: Record<string, unknown> | null;
  /** ISO 8601 timestamp the row was created. */
  createdAt: string;
  /** Discriminator — always `'coin.transaction_recorded'`. */
  eventType: "coin.transaction_recorded";
}

/** Every non-error coin payload type. */
export type CoinEventPayload =
  | CoinBalanceChangedPayload
  | CoinTransactionRecordedPayload;

/**
 * Any socket message on the `/coins` namespace.
 */
export interface CoinSocketEvent {
  event: CoinEventName;
  data: CoinEventPayload | WsErrorPayload;
}
