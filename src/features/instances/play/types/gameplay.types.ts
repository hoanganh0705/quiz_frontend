/**
 * `gameplay.types.ts` — Story 5.8 player-safe gameplay types, event
 * payload projections, cache-key factories, and WS error code union.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.A1.
 *
 * ## Purpose
 *
 * Single source of truth for the player-safe gameplay domain types,
 * event payload discriminated unions, the `GameplayWsErrorCode` union
 * consumed by every gameplay hook in this story, and the SWR
 * cache-key factories used by the gameplay REST hooks.
 *
 * ## Type philosophy
 *
 * Types are feature-level projections of the verified service wrapper
 * outputs from Stories 5.1, 5.6, and 5.7. Author-only correctness
 * fields (`isCorrect`, `correctOptionId`, `explanation`, `solution`,
 * `weight`, `correctness`) are explicitly excluded from every
 * player-facing type. The `AnswerResultDto` permits `accepted` without
 * `isCorrect` so the player UI can render submission state before the
 * server-approved reveal stage.
 *
 * ## Event envelope contract
 *
 * Every gameplay Socket.IO event is wrapped in a
 * `GameplayEventEnvelope<T>` that carries `instanceId`, `eventSequence`,
 * `emittedAt`, and `payloadVersion`. The `eventSequence` enables
 * monotonic ordering and deduplication in the per-instance gameplay
 * store (TKT-5.8.C1) and the `useSocketEventSequence` hook
 * (TKT-5.8.B7). The `payloadVersion` enables version-gated rejection
 * of stale payloads.
 *
 * ## Server authority
 *
 * The current question, answer window, scoring, player progress,
 * leaderboard, and instance closure are all sourced exclusively from
 * server-emitted envelopes. The client never infers correctness from
 * local state and never transitions the answer window client-side.
 */

// ─── Question / Option types ────────────────────────────────────────────────

/**
 * Player-view question timing contract.
 *
 * Derived from the server-emitted `question_revealed` envelope's
 * `questionTiming` field. The client uses `serverNow` to compute clock
 * drift against the local `Date` and derives `isWindowOpen` and
 * `remainingMs` from that drift. The client tick is used only for
 * display refresh — it never starts, stops, or transitions the window.
 *
 * @example
 *   const serverTime = new Date(timing.serverNow).getTime();
 *   const clientTime = Date.now();
 *   const driftMs = serverTime - clientTime;
 *   const effectiveNow = clientTime + driftMs;
 *   const remainingMs = Math.max(0, (timing.startsAt + timing.durationMs) - effectiveNow);
 */
export interface QuestionTimingDto {
  /** ISO 8601 — moment the answer window opens. */
  startsAt: string;
  /** Answer window duration in milliseconds. */
  durationMs: number;
  /** ISO 8601 — server's "now" at the moment of emission. */
  serverNow: string;
}

/**
 * Player-view single-choice question projection.
 *
 * Mirrors the published quiz `QuizQuestionResponseDto` with only the
 * player-safe fields. Author-only fields are explicitly absent:
 * `explanation`, `solution`, `correctOptionId`, `correctness`, and
 * per-option `weight` / `correctness` / `explanation` / `solution`.
 *
 * `basePoints` and `difficultyMultiplier` are published to players as
 * public scoring metadata and are therefore permitted.
 */
export interface PlayerQuestionDto {
  id: string;
  instanceId: string;
  quizId: string;
  quizTitle: string;
  /** 1-based index of this question within the instance's question set. */
  index: number;
  /** Total number of questions in the instance. */
  total: number;
  text: string;
  mediaUrl?: string;
  category?: string;
  difficulty?: string;
  difficultyMultiplier?: number;
  basePoints?: number;
  questionTiming: QuestionTimingDto;
}

/**
 * Player-view single-choice answer option projection.
 *
 * The canonical author DTO (`QuizAnswerOptionResponseDto`) carries
 * `isCorrect`, `correctness`, `explanation`, and `solution` — none
 * of these appear here. The option is rendered in the player surface
 * with no correctness indicator at any stage.
 *
 * The **only** path that exposes `isCorrect` to the player is through
 * `AnswerResultDto` after the server-approved `revealed: true` stage.
 */
export interface PlayerAnswerOptionDto {
  id: string;
  /** 0-based display index within the question's options. */
  index: number;
  text: string;
  mediaUrl?: string;
}

/**
 * Player-view question + options bundle.
 *
 * The unit of a `question_revealed` Socket.IO envelope. Components
 * consume this bundle — never the raw backend DTO.
 */
export interface PlayerQuestionBundleDto {
  question: PlayerQuestionDto;
  options: PlayerAnswerOptionDto[];
}

// ─── Answer submission types ────────────────────────────────────────────────

/**
 * Player answer submission payload emitted over Socket.IO.
 *
 * The client does not compute scoring or correctness. `submittedAt`
 * is the client's timestamp at emit time and is not authoritative —
 * the server uses its own clock to determine whether the window was
 * open.
 *
 * `clientToken` is an optional client-generated idempotency key. The
 * backend may use it to detect duplicate submissions from reconnect
 * storms.
 */
export interface AnswerSubmissionDto {
  questionId: string;
  optionId: string;
  submittedAt: string;
  clientToken?: string;
}

/**
 * Server acknowledgement of a successful answer submission.
 *
 * Returned synchronously by the Socket.IO emit acknowledgement. The
 * `submissionId` can be used for telemetry; it is not used for
 * rendering.
 */
export interface AnswerSubmissionAckDto {
  questionId: string;
  playerId: string;
  submittedAt: string;
  accepted: true;
  submissionId: string;
}

/**
 * Authoritative per-question answer result emitted by the server.
 *
 * Emitted via the `answer_result` Socket.IO envelope after the answer
 * window closes and the server has scored the response. The player
 * surface must NOT surface `isCorrect` or `awardedPoints` until
 * `revealed: true` — this is enforced by `useInstanceLifecycle`
 * (TKT-5.8.B6) and verified by the lint invariant (TKT-5.8.H4).
 *
 * Before `revealed`, the player UI can only show `accepted` and
 * `submittedOptionId` (the player knows what they submitted).
 */
export interface AnswerResultDto {
  questionId: string;
  playerId: string;
  /** The option the player submitted. `null` if they never submitted. */
  submittedOptionId: string | null;
  /** `true` when the server accepted the submission; `false` on rejection. */
  accepted: boolean;
  /**
   * Points awarded for this question. Only meaningful when
   * `revealed === true`.
   */
  awardedPoints: number;
  /**
   * Whether correctness has been revealed to the player.
   * `isCorrect` is only meaningful when this is `true`.
   */
  revealed: boolean;
  /** `true` when the player's submission was correct. Valid only if `revealed`. */
  isCorrect: boolean;
  /** ISO 8601 — server's "now" at the moment of emission. */
  serverNow: string;
  /** Monotonic event sequence for ordering and deduplication. */
  eventSequence: number;
}

// ─── Player progress types ─────────────────────────────────────────────────

/**
 * Per-player progress snapshot emitted periodically by the server.
 *
 * Emitted via the `player_progress` Socket.IO envelope (name confirmed
 * by the gateway catalogue). Used by `PlayerProgressPanel` and by the
 * leaderboard reconciliation in `useLiveLeaderboard`.
 *
 * The client never computes `currentScore`, `rank`, or `answeredCount`
 * locally — these are exclusively sourced from this payload.
 */
export interface PlayerProgressDto {
  instanceId: string;
  playerId: string;
  answeredCount: number;
  totalQuestions: number;
  currentScore: number;
  rank: number | null;
  isConnected: boolean;
  eventSequence: number;
}

// ─── Leaderboard types ──────────────────────────────────────────────────────

/**
 * Single leaderboard row emitted by `leaderboard_updated`.
 *
 * The `score` is server-computed. The client never re-ranks or
 * re-tallies. Ties are broken by `score` descending then
 * `playerId` ascending (deterministic, consistent across all clients).
 */
export interface LeaderboardEntryDto {
  playerId: string;
  displayName: string;
  avatarUrl?: string;
  score: number;
  rank: number;
  answeredCount: number;
  /** ISO 8601 — moment this player was last awarded points. `null` if none yet. */
  lastAwardedAt: string | null;
  eventSequence: number;
}

/**
 * Emitted via the `leaderboard_updated` Socket.IO envelope.
 * The leaderboard is authoritative server state — the client
 * reconciles entries by `playerId` and `eventSequence`.
 */
export interface LeaderboardUpdatedEventDto {
  instanceId: string;
  entries: LeaderboardEntryDto[];
  updatedAt: string;
  eventSequence: number;
}

/**
 * Final post-game leaderboard, emitted via `instance_closed` and
 * `instance_final_leaderboard` envelopes.
 *
 * Consumed by `GameResult` and `useLiveLeaderboard`. The winner
 * is the player with `rank === 1` in `entries`; `winnerPlayerId` is
 * the server-confirmed winner for convenience.
 */
export interface FinalLeaderboardDto {
  instanceId: string;
  closedAt: string;
  entries: LeaderboardEntryDto[];
  winnerPlayerId: string;
  totalQuestions: number;
}

/**
 * Emitted via the `instance_closed` Socket.IO envelope when the host
 * closes the instance. The server may include a `finalLeaderboard`
 * or set it to `null` if the leaderboard is not yet available.
 *
 * The client transitions to the closed state exclusively through
 * this payload — no client-side timer or local status transition.
 */
export interface InstanceClosedEventDto {
  instanceId: string;
  status: "closed" | "cancelled";
  closedAt: string;
  reason: string;
  finalLeaderboard: FinalLeaderboardDto | null;
  eventSequence: number;
}

// ─── Event discriminated union ─────────────────────────────────────────────

/**
 * Every gameplay-phase event name emitted by the `/instances`
 * Socket.IO namespace during Story 5.8.
 *
 * The lobby-phase events (`instance:started`, `player:joined`, etc.)
 * are defined in `instance.types.ts`. This union covers only the
 * play-phase events unique to Story 5.8.
 */
export type GameplayEventName =
  | "question_revealed"
  | "answer_result"
  | "leaderboard_updated"
  | "instance_closed"
  | "instance_final_leaderboard";

/**
 * Discriminated union of every gameplay-phase event data payload.
 * Used by `GameplayEventEnvelope<T>` to resolve the typed data shape.
 */
export type GameplayEventData =
  | { name: "question_revealed"; data: PlayerQuestionBundleDto }
  | { name: "answer_result"; data: AnswerResultDto }
  | { name: "leaderboard_updated"; data: LeaderboardUpdatedEventDto }
  | { name: "instance_closed"; data: InstanceClosedEventDto }
  | { name: "instance_final_leaderboard"; data: FinalLeaderboardDto };

/**
 * Typed Socket.IO event envelope wrapping every gameplay event.
 *
 * - `event` — the discriminated union discriminator.
 * - `data`  — the typed payload (use `name` to narrow the union).
 * - `instanceId` — enables the per-instance store key.
 * - `eventSequence` — monotonic counter for ordering and deduplication.
 * - `emittedAt` — ISO 8601 server timestamp of emission.
 * - `payloadVersion` — incremented when the backend changes the
 *   envelope shape; mismatched versions surface
 *   `PAYLOAD_VERSION_MISMATCH` in the client.
 */
export interface GameplayEventEnvelope<T = unknown> {
  event: GameplayEventName;
  data: T;
  instanceId: string;
  eventSequence: number;
  emittedAt: string;
  payloadVersion: number;
}

// ─── Socket connection state ────────────────────────────────────────────────

/**
 * Socket.IO connection state for the Story 5.8 gameplay hook.
 *
 * Mirrors `InstanceSocketConnectionState` from `instance.types.ts`
 * for consistency; the states are intentionally identical.
 */
export type GameplaySocketConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "auth_failed";

// ─── WS error code union ────────────────────────────────────────────────────

/**
 * Error codes returned by the gameplay Socket.IO endpoints and the
 * answer submission emit.
 *
 * These codes are surfaced by `useInstanceGameSocket` (TKT-5.8.B1)
 * and `useSubmitInstanceAnswer` (TKT-5.8.B3). Components branch on
 * these codes using `getUserCopy` from Epic 5.1 D3 — never on HTTP
 * status codes. The REST error path is never used for socket errors.
 *
 * The union is intentionally distinct from
 * `InstanceLifecycleErrorCode` in `instance.types.ts` — the gameplay
 * phase has its own error surface (duplicate submission, window
 * closed, invalid option, etc.) that is orthogonal to the lobby phase
 * errors.
 */
export type GameplayWsErrorCode =
  | "DUPLICATE_ANSWER"
  | "ANSWER_WINDOW_CLOSED"
  | "INVALID_OPTION"
  | "NOT_PARTICIPANT"
  | "INSTANCE_NOT_STARTED"
  | "INSTANCE_CLOSED"
  | "INSTANCE_NOT_FOUND"
  | "SEQUENCE_MISMATCH"
  | "PAYLOAD_VERSION_MISMATCH"
  | "MALFORMED_EVENT"
  | "AUTH_REQUIRED"
  | "TIMEOUT"
  | "DISCONNECT"
  | "FORBIDDEN"
  | "UNKNOWN";

/**
 * Every `GameplayWsErrorCode` value as a readonly array.
 *
 * Useful for type-level tests and exhaustive `switch` checks.
 */
export const GAMEPLAY_WS_ERROR_CODES = [
  "DUPLICATE_ANSWER",
  "ANSWER_WINDOW_CLOSED",
  "INVALID_OPTION",
  "NOT_PARTICIPANT",
  "INSTANCE_NOT_STARTED",
  "INSTANCE_CLOSED",
  "INSTANCE_NOT_FOUND",
  "SEQUENCE_MISMATCH",
  "PAYLOAD_VERSION_MISMATCH",
  "MALFORMED_EVENT",
  "AUTH_REQUIRED",
  "TIMEOUT",
  "DISCONNECT",
  "FORBIDDEN",
  "UNKNOWN",
] as const satisfies readonly GameplayWsErrorCode[];

// ─── SWR cache keys ────────────────────────────────────────────────────────

/**
 * SWR cache keys for the Story 5.8 gameplay surfaces.
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are safe
 * to call inside `useMemo` and `useEffect` dependency arrays.
 *
 * ## Invalidation strategy
 *
 * After a `leaderboard_updated` event, the `leaderboard` and `final`
 * keys may be revalidated:
 *   1. `leaderboard` — current live leaderboard snapshot
 *   2. `final` — post-game final leaderboard (only after closure)
 *
 * Use `GAMEPLAY_CACHE_KEYS.all(instanceId)` to get the full
 * invalidation set in one call.
 */
export const GAMEPLAY_CACHE_KEYS = {
  /**
   * SWR key for a single instance question bundle.
   * Keyed by both `instanceId` and `questionId` since the instance
   * may advance questions.
   */
  bundle(instanceId: string, questionId: string) {
    return ["instances", "play", "bundle", instanceId, questionId] as const;
  },

  /**
   * SWR key for the live leaderboard of an instance.
   */
  leaderboard(instanceId: string) {
    return ["instances", "play", "leaderboard", instanceId] as const;
  },

  /**
   * SWR key for the post-game final leaderboard of an instance.
   */
  final(instanceId: string) {
    return ["instances", "play", "final", instanceId] as const;
  },

  /**
   * SWR key for the per-instance gameplay realtime store.
   *
   * Used by `useRealtimeGameplay` (C1) to read the realtime-derived
   * merge state. REST hooks do not consult this key — it is owned
   * exclusively by the realtime bridge.
   */
  realtime(instanceId: string) {
    return ["instances", "play", "realtime", instanceId] as const;
  },

  /**
   * Returns the full invalidation key set for an instance.
   */
  all(instanceId: string) {
    return {
      leaderboard: this.leaderboard(instanceId),
      final: this.final(instanceId),
      realtime: this.realtime(instanceId),
    } as const;
  },
} as const;

/**
 * Type helper for `GAMEPLAY_CACHE_KEYS.all()` return value.
 */
export type GameplayInvalidationKeys = ReturnType<
  (typeof GAMEPLAY_CACHE_KEYS)["all"]
>;

// ─── Submission state machine ────────────────────────────────────────────────

/**
 * Local submission state machine for the answer CTA.
 *
 * Mirrors the `InstanceLifecycleMutationState` in `instance.types.ts`
 * and the `RegistrationMutationState` in Epic 5.3.
 *
 * State transitions:
 *   idle → pending   (on submit call)
 *   pending → accepted (on ack)
 *   pending → rejected (on WS error)
 *   accepted → idle   (on reset or new question)
 *   rejected → idle   (on reset or retry)
 */
export type AnswerSubmissionState =
  | "idle"
  | "pending"
  | "accepted"
  | "rejected";
