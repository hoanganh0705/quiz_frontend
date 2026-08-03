/**
 * Typed registry of every RFC 7807 `extensions.code` the backend can emit.
 *
 * Source epic: Epic 1.3 — RFC 7807 Error Model.
 * Source ticket: TKT-1.3.3.1.
 *
 * ─── Source of truth ──────────────────────────────────────────────────────
 *
 * Every code in `ErrorCode` mirrors a key in
 * `quiz_backend/src/common/errors/problem-code-mapping.ts`. The 10
 * synthesized `GLOBAL_*` codes mirror the `STATUS_TO_GLOBAL_CODE` table
 * plus the `GLOBAL_VALIDATION_FAILED` override in
 * `quiz_backend/src/common/filters/global-exception.filter.ts` (§6.3,
 * §8.5 of the RFC 7807 migration plan).
 *
 * Total: 122 domain codes + 10 synthesized = 132 members.
 *
 * ─── How to regenerate ───────────────────────────────────────────────────
 *
 * When the backend adds a new domain exception:
 *
 *   1. Add the key to `ProblemCodeMapping` in `problem-code-mapping.ts`.
 *   2. Add the matching union member + array entry below (grouped by
 *      module prefix).
 *   3. Update any i18n map that branches on the new code (Phase 2+).
 *
 * The Phase-5+ plan is to generate this file from a CI job that
 * diffs `problem-code-mapping.ts` against the current `ErrorCode` and
 * files a follow-up issue when drift is detected.
 *
 * ─── Architecture gap ────────────────────────────────────────────────────
 *
 * The parent epic (TKT-1.3.3.2 of `EPIC_1_3_TICKETS.md`) references
 * `docs/architecture/standards/error-handling.md` as a secondary
 * source. That file does NOT exist at planning time — the integration
 * master plan references it as a target document, but it has not yet
 * been authored. The codes listed below are sourced directly from the
 * backend's `ProblemCodeMapping` and `STATUS_TO_GLOBAL_CODE` instead.
 * When the architecture doc lands, this header should be updated.
 *
 * ─── Why this file exists ────────────────────────────────────────────────
 *
 * Without a typed registry, callers have to branch on raw HTTP status
 * (`apiError.status === 404`) which is too coarse: multiple domain
 * codes map to the same status. With `ErrorCode`, callers can write:
 *
 *   if (apiError.code === 'QUIZ_NOT_FOUND') { ... }
 *
 * and TypeScript will flag typos at compile time.
 */

export type ErrorCode =
  /** ACHIEVEMENT module — 2 codes */
  | 'ACHIEVEMENT_USER_NOT_FOUND'
  | 'ACHIEVEMENT_GRANT_ERROR'
  /** ATTEMPT module — 10 codes */
  | 'ATTEMPT_NOT_FOUND'
  | 'ATTEMPT_FORBIDDEN'
  | 'ATTEMPT_VALIDATION_FAILED'
  | 'ATTEMPT_ALREADY_STARTED'
  | 'ATTEMPT_NOT_ACTIVE'
  | 'ATTEMPT_QUESTION_ALREADY_ANSWERED'
  | 'ATTEMPT_QUIZ_NOT_PUBLISHED'
  | 'ATTEMPT_QUESTION_INVALID'
  | 'ATTEMPT_NOT_COMPLETED'
  | 'ATTEMPT_ANSWER_NOT_FOUND'
  /** AUTH module — 15 codes */
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_INVALID_REFRESH_TOKEN'
  | 'AUTH_TOKEN_REUSED'
  | 'AUTH_SESSION_CONTEXT_MISMATCH'
  | 'AUTH_USER_NOT_FOUND'
  | 'AUTH_RATE_LIMITED'
  | 'AUTH_RESOURCE_CONFLICT'
  | 'AUTH_SESSION_NOT_FOUND'
  | 'AUTH_INVALID_TOKEN'
  | 'AUTH_INVALID_CURRENT_PASSWORD'
  | 'AUTH_DELETION_FAILED'
  | 'AUTH_PASSWORD_REUSE'
  | 'AUTH_OAUTH_INVALID_TOKEN'
  | 'AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS'
  | 'AUTH_OAUTH_LINKING_REQUIRED'
  /** BADGE module — 1 codes */
  | 'BADGE_NOT_FOUND'
  /** BOOKMARK module — 4 codes */
  | 'BOOKMARK_NOT_FOUND'
  | 'BOOKMARK_COLLECTION_NOT_FOUND'
  | 'BOOKMARK_CONFLICT'
  | 'BOOKMARK_VALIDATION'
  /** CATEGORY module — 6 codes */
  | 'CATEGORY_NOT_FOUND'
  | 'CATEGORY_FOLLOW_NOT_FOUND'
  | 'CATEGORY_ANALYTICS_NOT_FOUND'
  | 'CATEGORY_SLUG_CONFLICT'
  | 'CATEGORY_ALREADY_ACTIVE'
  | 'CATEGORY_RESTORE_INVARIANT'
  /** COLLECTION module — 2 codes */
  | 'COLLECTION_FORBIDDEN'
  | 'COLLECTION_CONFLICT'
  /** COMMENT module — 10 codes */
  | 'COMMENT_NOT_FOUND'
  | 'COMMENT_QUIZ_NOT_FOUND'
  | 'COMMENT_REPORT_NOT_FOUND'
  | 'COMMENT_FORBIDDEN'
  | 'COMMENT_SELF_VOTE'
  | 'COMMENT_SELF_REPORT'
  | 'COMMENT_MODERATOR_REQUIRED'
  | 'COMMENT_REPLY_LIMIT_EXCEEDED'
  | 'COMMENT_DUPLICATE_REPORT'
  | 'COMMENT_PARENT_COMMENT_CROSS_THREAD'
  /** INSTANCE module — 10 codes */
  | 'INSTANCE_NOT_FOUND'
  | 'INSTANCE_NOT_HOST'
  | 'INSTANCE_NOT_OPEN'
  | 'INSTANCE_FULL'
  | 'INSTANCE_ALREADY_STARTED'
  | 'INSTANCE_ALREADY_CLOSED'
  | 'INSTANCE_ALREADY_FINISHED'
  | 'INSTANCE_OPTIMISTIC_LOCK'
  | 'INSTANCE_NOT_IN_COUNTDOWN'
  | 'INSTANCE_COUNTDOWN_ALREADY_STARTED'
  /** MIN module — 1 codes */
  | 'MIN_PLAYERS_NOT_MET'
  /** NOTIFICATION module — 2 codes */
  | 'NOTIFICATION_NOT_FOUND'
  | 'NOTIFICATION_FORBIDDEN'
  /** PLAYER module — 1 codes */
  | 'PLAYER_ALREADY_JOINED'
  /** QUIZ module — 14 codes */
  | 'QUIZ_OPERATION_FAILED'
  | 'QUIZ_NOT_FOUND'
  | 'QUIZ_FORBIDDEN'
  | 'QUIZ_SLUG_CONFLICT'
  | 'QUIZ_CONFLICT'
  | 'QUIZ_VALIDATION_FAILED'
  | 'QUIZ_VERSION_IMMUTABLE'
  | 'QUIZ_VERSION_NOT_FOUND'
  | 'QUIZ_INSUFFICIENT_QUESTIONS'
  | 'QUIZ_QUESTION_POSITION_CONFLICT'
  | 'QUIZ_ANSWER_OPTION_POSITION_CONFLICT'
  | 'QUIZ_MULTIPLE_CORRECT_OPTIONS'
  | 'QUIZ_ANALYTICS_NOT_FOUND'
  | 'QUIZ_ANALYTICS_CALCULATION_FAILED'
  /** RANKING module — 3 codes */
  | 'RANKING_INVALID_XP_EVENT'
  | 'RANKING_RANK_CALCULATION_ERROR'
  | 'RANKING_PERIOD_RESET_ERROR'
  /** REVIEW module — 6 codes */
  | 'REVIEW_NOT_FOUND'
  | 'REVIEW_FORBIDDEN'
  | 'REVIEW_CONFLICT'
  | 'REVIEW_ALREADY_REPORTED'
  | 'REVIEW_VALIDATION'
  | 'REVIEW_ATTEMPT_REQUIRED'
  /** SOCIAL module — 11 codes */
  | 'SOCIAL_FRIEND_REQUEST_NOT_FOUND'
  | 'SOCIAL_FRIEND_REQUEST_FORBIDDEN'
  | 'SOCIAL_FRIEND_LIST_FORBIDDEN'
  | 'SOCIAL_SELF_FRIEND_REQUEST'
  | 'SOCIAL_ALREADY_FRIENDS'
  | 'SOCIAL_BLOCKED_USER'
  | 'SOCIAL_USER_BLOCKED'
  | 'SOCIAL_PENDING_REQUEST_EXISTS'
  | 'SOCIAL_FRIENDSHIP_NOT_FOUND'
  | 'SOCIAL_USER_NOT_BLOCKED'
  | 'SOCIAL_FOLLOW_NOT_FOUND'
  /** TAG module — 5 codes */
  | 'TAG_NOT_FOUND'
  | 'TAG_ANALYTICS_NOT_FOUND'
  | 'TAG_SLUG_CONFLICT'
  | 'TAG_ALREADY_ACTIVE'
  | 'TAG_RESTORE_INVARIANT'
  /** TOURNAMENT module — 15 codes */
  | 'TOURNAMENT_NOT_FOUND'
  | 'TOURNAMENT_ROUND_NOT_FOUND'
  | 'TOURNAMENT_NOT_REGISTERED'
  | 'TOURNAMENT_FORBIDDEN'
  | 'TOURNAMENT_CONFLICT'
  | 'TOURNAMENT_ALREADY_REGISTERED'
  | 'TOURNAMENT_ATTEMPT_ALREADY_EXISTS'
  | 'TOURNAMENT_PARTICIPANT_STATE'
  | 'TOURNAMENT_ALREADY_WITHDRAWN'
  | 'TOURNAMENT_VALIDATION'
  | 'TOURNAMENT_REGISTRATION_CLOSED'
  | 'TOURNAMENT_FULL'
  | 'TOURNAMENT_ROUND_NOT_OPEN'
  | 'TOURNAMENT_UNREGISTER_CLOSED'
  | 'TOURNAMENT_WITHDRAW_CLOSED'
  /** USER module — 4 codes */
  | 'USER_NOT_FOUND'
  | 'USER_ANALYTICS_NOT_FOUND'
  | 'USER_PROFILE_PRIVATE'
  | 'USER_BADGE_OWNERSHIP_NOT_FOUND'
  /** Synthesized GLOBAL_* codes for native HttpException paths (RFC 7807 §8.5) */
  | 'GLOBAL_BAD_REQUEST' /** 400 */
  | 'GLOBAL_VALIDATION_FAILED' /** 400 (string[] ValidationPipe) */
  | 'GLOBAL_UNAUTHENTICATED' /** 401 */
  | 'GLOBAL_FORBIDDEN' /** 403 */
  | 'GLOBAL_NOT_FOUND' /** 404 */
  | 'GLOBAL_METHOD_NOT_ALLOWED' /** 405 */
  | 'GLOBAL_CONFLICT' /** 409 */
  | 'GLOBAL_UNPROCESSABLE' /** 422 */
  | 'GLOBAL_RATE_LIMITED' /** 429 */
  | 'GLOBAL_INTERNAL_ERROR' /** 5xx */;

export const KNOWN_ERROR_CODES = [
  // ACHIEVEMENT
  'ACHIEVEMENT_USER_NOT_FOUND',
  'ACHIEVEMENT_GRANT_ERROR',
  // ATTEMPT
  'ATTEMPT_NOT_FOUND',
  'ATTEMPT_FORBIDDEN',
  'ATTEMPT_VALIDATION_FAILED',
  'ATTEMPT_ALREADY_STARTED',
  'ATTEMPT_NOT_ACTIVE',
  'ATTEMPT_QUESTION_ALREADY_ANSWERED',
  'ATTEMPT_QUIZ_NOT_PUBLISHED',
  'ATTEMPT_QUESTION_INVALID',
  'ATTEMPT_NOT_COMPLETED',
  'ATTEMPT_ANSWER_NOT_FOUND',
  // AUTH
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_INVALID_REFRESH_TOKEN',
  'AUTH_TOKEN_REUSED',
  'AUTH_SESSION_CONTEXT_MISMATCH',
  'AUTH_USER_NOT_FOUND',
  'AUTH_RATE_LIMITED',
  'AUTH_RESOURCE_CONFLICT',
  'AUTH_SESSION_NOT_FOUND',
  'AUTH_INVALID_TOKEN',
  'AUTH_INVALID_CURRENT_PASSWORD',
  'AUTH_DELETION_FAILED',
  'AUTH_PASSWORD_REUSE',
  'AUTH_OAUTH_INVALID_TOKEN',
  'AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS',
  'AUTH_OAUTH_LINKING_REQUIRED',
  // BADGE
  'BADGE_NOT_FOUND',
  // BOOKMARK
  'BOOKMARK_NOT_FOUND',
  'BOOKMARK_COLLECTION_NOT_FOUND',
  'BOOKMARK_CONFLICT',
  'BOOKMARK_VALIDATION',
  // CATEGORY
  'CATEGORY_NOT_FOUND',
  'CATEGORY_FOLLOW_NOT_FOUND',
  'CATEGORY_ANALYTICS_NOT_FOUND',
  'CATEGORY_SLUG_CONFLICT',
  'CATEGORY_ALREADY_ACTIVE',
  'CATEGORY_RESTORE_INVARIANT',
  // COLLECTION
  'COLLECTION_FORBIDDEN',
  'COLLECTION_CONFLICT',
  // COMMENT
  'COMMENT_NOT_FOUND',
  'COMMENT_QUIZ_NOT_FOUND',
  'COMMENT_REPORT_NOT_FOUND',
  'COMMENT_FORBIDDEN',
  'COMMENT_SELF_VOTE',
  'COMMENT_SELF_REPORT',
  'COMMENT_MODERATOR_REQUIRED',
  'COMMENT_REPLY_LIMIT_EXCEEDED',
  'COMMENT_DUPLICATE_REPORT',
  'COMMENT_PARENT_COMMENT_CROSS_THREAD',
  // INSTANCE
  'INSTANCE_NOT_FOUND',
  'INSTANCE_NOT_HOST',
  'INSTANCE_NOT_OPEN',
  'INSTANCE_FULL',
  'INSTANCE_ALREADY_STARTED',
  'INSTANCE_ALREADY_CLOSED',
  'INSTANCE_ALREADY_FINISHED',
  'INSTANCE_OPTIMISTIC_LOCK',
  'INSTANCE_NOT_IN_COUNTDOWN',
  'INSTANCE_COUNTDOWN_ALREADY_STARTED',
  // MIN
  'MIN_PLAYERS_NOT_MET',
  // NOTIFICATION
  'NOTIFICATION_NOT_FOUND',
  'NOTIFICATION_FORBIDDEN',
  // PLAYER
  'PLAYER_ALREADY_JOINED',
  // QUIZ
  'QUIZ_OPERATION_FAILED',
  'QUIZ_NOT_FOUND',
  'QUIZ_FORBIDDEN',
  'QUIZ_SLUG_CONFLICT',
  'QUIZ_CONFLICT',
  'QUIZ_VALIDATION_FAILED',
  'QUIZ_VERSION_IMMUTABLE',
  'QUIZ_VERSION_NOT_FOUND',
  'QUIZ_INSUFFICIENT_QUESTIONS',
  'QUIZ_QUESTION_POSITION_CONFLICT',
  'QUIZ_ANSWER_OPTION_POSITION_CONFLICT',
  'QUIZ_MULTIPLE_CORRECT_OPTIONS',
  'QUIZ_ANALYTICS_NOT_FOUND',
  'QUIZ_ANALYTICS_CALCULATION_FAILED',
  // RANKING
  'RANKING_INVALID_XP_EVENT',
  'RANKING_RANK_CALCULATION_ERROR',
  'RANKING_PERIOD_RESET_ERROR',
  // REVIEW
  'REVIEW_NOT_FOUND',
  'REVIEW_FORBIDDEN',
  'REVIEW_CONFLICT',
  'REVIEW_ALREADY_REPORTED',
  'REVIEW_VALIDATION',
  'REVIEW_ATTEMPT_REQUIRED',
  // SOCIAL
  'SOCIAL_FRIEND_REQUEST_NOT_FOUND',
  'SOCIAL_FRIEND_REQUEST_FORBIDDEN',
  'SOCIAL_FRIEND_LIST_FORBIDDEN',
  'SOCIAL_SELF_FRIEND_REQUEST',
  'SOCIAL_ALREADY_FRIENDS',
  'SOCIAL_BLOCKED_USER',
  'SOCIAL_USER_BLOCKED',
  'SOCIAL_PENDING_REQUEST_EXISTS',
  'SOCIAL_FRIENDSHIP_NOT_FOUND',
  'SOCIAL_USER_NOT_BLOCKED',
  'SOCIAL_FOLLOW_NOT_FOUND',
  // TAG
  'TAG_NOT_FOUND',
  'TAG_ANALYTICS_NOT_FOUND',
  'TAG_SLUG_CONFLICT',
  'TAG_ALREADY_ACTIVE',
  'TAG_RESTORE_INVARIANT',
  // TOURNAMENT
  'TOURNAMENT_NOT_FOUND',
  'TOURNAMENT_ROUND_NOT_FOUND',
  'TOURNAMENT_NOT_REGISTERED',
  'TOURNAMENT_FORBIDDEN',
  'TOURNAMENT_CONFLICT',
  'TOURNAMENT_ALREADY_REGISTERED',
  'TOURNAMENT_ATTEMPT_ALREADY_EXISTS',
  'TOURNAMENT_PARTICIPANT_STATE',
  'TOURNAMENT_ALREADY_WITHDRAWN',
  'TOURNAMENT_VALIDATION',
  'TOURNAMENT_REGISTRATION_CLOSED',
  'TOURNAMENT_FULL',
  'TOURNAMENT_ROUND_NOT_OPEN',
  'TOURNAMENT_UNREGISTER_CLOSED',
  'TOURNAMENT_WITHDRAW_CLOSED',
  // USER
  'USER_NOT_FOUND',
  'USER_ANALYTICS_NOT_FOUND',
  'USER_PROFILE_PRIVATE',
  'USER_BADGE_OWNERSHIP_NOT_FOUND',
  // Synthesized GLOBAL_* codes
  'GLOBAL_BAD_REQUEST',
  'GLOBAL_VALIDATION_FAILED',
  'GLOBAL_UNAUTHENTICATED',
  'GLOBAL_FORBIDDEN',
  'GLOBAL_NOT_FOUND',
  'GLOBAL_METHOD_NOT_ALLOWED',
  'GLOBAL_CONFLICT',
  'GLOBAL_UNPROCESSABLE',
  'GLOBAL_RATE_LIMITED',
  'GLOBAL_INTERNAL_ERROR',
] as const satisfies readonly ErrorCode[];

export const SYNTHESIZED_ERROR_CODES = [
  'GLOBAL_BAD_REQUEST',  // 400
  'GLOBAL_VALIDATION_FAILED',  // 400 (string[] ValidationPipe)
  'GLOBAL_UNAUTHENTICATED',  // 401
  'GLOBAL_FORBIDDEN',  // 403
  'GLOBAL_NOT_FOUND',  // 404
  'GLOBAL_METHOD_NOT_ALLOWED',  // 405
  'GLOBAL_CONFLICT',  // 409
  'GLOBAL_UNPROCESSABLE',  // 422
  'GLOBAL_RATE_LIMITED',  // 429
  'GLOBAL_INTERNAL_ERROR',  // 5xx
] as const;

export function isKnownErrorCode(code: string): code is ErrorCode {
  return (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

// ────────────────────────────────────────────────────────────────────────
//  USER_COPY — Phase 4 user-facing copy table.
// ────────────────────────────────────────────────────────────────────────
//
// Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
// Source story:  Story 4.1.
// Source ticket: TKT-4.1.C1.
//
// Every `ErrorCode` member has a corresponding `{ title, body, toast? }`
// entry so that downstream consumers (Phase 4 stories 4.6 / 4.7 / 4.11 /
// 4.13) can render error messages without ever branching on raw error
// codes themselves.
//
// The table is typed `Record<ErrorCode, UserCopyEntry>` so adding a new
// member to the `ErrorCode` union without populating its copy entry
// becomes a TypeScript compile error (`TS2737`). The structural
// guarantee is the primary contract; the runtime tests in
// `src/lib/api/__tests__/phase4-error-codes.spec.ts` (TKT-4.1.C3) lock
// the entries against unintentional blanks.
//
// ## How the table is populated
//
//   - 16 priority codes Phase 4 surfaces heavily are authored by hand
//     in `PHASE4_PRIORITY_COPY` below (TKT-4.1.C2).
//   - The remaining 116 entries are derived from the snake-case tokens
//     of the code via `deriveCopyFor(code)`. The derivation is a
//     mechanical template, not a translation table; the output is
//     identical at module init time across reloads.
//
// `getUserCopy(code)` returns the table entry for `code`, or
// `UNKNOWN_USER_COPY` if `code` is not a member of the `ErrorCode`
// union. Callers must use `getUserCopy`, never the table directly.
//
// ## Toast field semantics
//
//   `toast?: 'inline' | 'top' | 'silent'` (default: `'inline'`).
//   - `'inline'` — render the message inside the closest form-error
//                  slot (default surface).
//   - `'top'`    — render the message via a top-of-page toast.
//   - `'silent'` — do not render user-visible copy; the error is
//                  handled silently (e.g. optimistic-toggle with
//                  rollback).
// ────────────────────────────────────────────────────────────────────────

/**
 * Per-error-code user-facing copy.
 */
export type UserCopyEntry = {
  /** Heading-level string ("Quiz not found"). */
  readonly title: string;
  /** Body-level string. Single sentence is preferred (master plan rule 3). */
  readonly body: string;
  /**
   * Where to surface the message. Defaults to `'inline'`.
   * `'silent'` is reserved for errors the UI handles without copy.
   */
  readonly toast?: 'inline' | 'top' | 'silent';
};

/**
 * Fallback copy returned by `getUserCopy` for codes that are not
 * members of the `ErrorCode` union (e.g. a future backend code that
 * has not yet been mirrored in this registry). Stable — callers can
 * rely on it for tests.
 */
export const UNKNOWN_USER_COPY: UserCopyEntry = Object.freeze({
  title: 'Something went wrong',
  body: 'Please try again. If the problem persists, contact support.',
  toast: 'top',
});

// ─── Module / token → copy mapping ──────────────────────────────────────
//
// `MODULE_NOUN` maps the leading module prefix (the underscore-separated
// first token of the code) to the singular noun used in the derived
// sentence. Special-cases are added up-front.
//
// `TOKEN_PHRASE` maps the trailing tokens (the rest of the code minus
// the leading module prefix) to the predicate phrase used in the
// derived sentence. The phrase is the *clause* that follows the noun;
// e.g. `NOT_FOUND` → `'was not found'`, `FORBIDDEN` → `'is forbidden'`.
const MODULE_NOUN: Readonly<Record<string, string>> = {
  ACHIEVEMENT: 'Achievement',
  ATTEMPT: 'Attempt',
  AUTH: 'Authentication',
  BADGE: 'Badge',
  BOOKMARK: 'Bookmark',
  CATEGORY: 'Category',
  COLLECTION: 'Bookmark collection',
  COMMENT: 'Comment',
  INSTANCE: 'Instance',
  MIN: 'Player count',
  NOTIFICATION: 'Notification',
  PLAYER: 'Player',
  QUIZ: 'Quiz',
  RANKING: 'Ranking',
  REVIEW: 'Review',
  SOCIAL: 'Friend request',
  TAG: 'Tag',
  TOURNAMENT: 'Tournament',
  USER: 'User',
};

const TOKEN_PHRASE: Readonly<Record<string, string>> = {
  NOT_FOUND: 'was not found',
  FORBIDDEN: 'is not allowed',
  VALIDATION: 'is invalid',
  VALIDATION_FAILED: 'is invalid',
  CONFLICT: 'is already in use',
  SLUG_CONFLICT: 'is already taken',
  NOT_ACTIVE: 'is no longer active',
  ALREADY_STARTED: 'has already started',
  ALREADY_EXISTS: 'already exists',
  ALREADY_JOINED: 'has already been joined',
  ALREADY_CLOSED: 'has already been closed',
  ALREADY_FINISHED: 'has already finished',
  ALREADY_REGISTERED: 'is already registered',
  ALREADY_REPORTED: 'has already been reported',
  ALREADY_ACTIVE: 'is already active',
  ALREADY_WITHDRAWN: 'has already been withdrawn',
  COUNTDOWN_ALREADY_STARTED: 'countdown has already started',
  OPTIMISTIC_LOCK: 'was modified by someone else',
  NOT_IN_COUNTDOWN: 'is not in countdown',
  NOT_HOST: 'is not the host',
  NOT_OPEN: 'is not open',
  NOT_REGISTERED: 'is not registered',
  FULL: 'is full',
  PLAYERS_NOT_MET: 'requires more players',
  SELF_FRIEND_REQUEST: 'cannot be sent to yourself',
  SELF_VOTE: 'cannot be voted on by the author',
  SELF_REPORT: 'cannot be reported by the author',
  BLOCKED_USER: 'is blocked',
  USER_BLOCKED: 'is blocked by the other user',
  USER_NOT_BLOCKED: 'is not blocked',
  PENDING_REQUEST_EXISTS: 'already has a pending request',
  FRIENDSHIP_NOT_FOUND: 'was not found',
  FOLLOW_NOT_FOUND: 'was not found',
  FRIEND_REQUEST_NOT_FOUND: 'was not found',
  FRIEND_REQUEST_FORBIDDEN: 'is not allowed',
  FRIEND_LIST_FORBIDDEN: 'is not allowed',
  RESTORE_INVARIANT: 'cannot be restored',
  INSUFFICIENT_QUESTIONS: 'requires more questions',
  VERSION_IMMUTABLE: 'cannot be changed',
  VERSION_NOT_FOUND: 'was not found',
  QUESTION_POSITION_CONFLICT: 'has a question position conflict',
  ANSWER_OPTION_POSITION_CONFLICT: 'has an answer position conflict',
  MULTIPLE_CORRECT_OPTIONS: 'has multiple correct answers',
  ATTEMPT_REQUIRED: 'requires a completed attempt',
  REPLY_LIMIT_EXCEEDED: 'exceeds the reply limit',
  PARENT_COMMENT_CROSS_THREAD: 'is on a different thread',
  DUPLICATE_REPORT: 'has already been reported',
  MODERATOR_REQUIRED: 'requires a moderator',
  QUIZ_NOT_FOUND: 'was not found',
  REPORT_NOT_FOUND: 'was not found',
  SESSION_NOT_FOUND: 'was not found',
  ANALYTICS_NOT_FOUND: 'was not found',
  ANALYTICS_CALCULATION_FAILED: 'failed to calculate',
  RANKING_INVALID_XP_EVENT: 'received an invalid XP event',
  RANKING_CALCULATION_ERROR: 'failed to calculate the rank',
  RANKING_PERIOD_RESET_ERROR: 'failed to reset the period',
  OPERATION_FAILED: 'failed',
  PROFILE_PRIVATE: 'is private',
  BADGE_OWNERSHIP_NOT_FOUND: 'was not found',
  GRANT_ERROR: 'failed to grant',
  ATTEMPT_NOT_FOUND: 'was not found',
  ATTEMPT_FORBIDDEN: 'is not allowed',
  ATTEMPT_VALIDATION_FAILED: 'is invalid',
  ATTEMPT_ALREADY_STARTED: 'has already been started',
  ATTEMPT_NOT_ACTIVE: 'is no longer active',
  ATTEMPT_QUESTION_ALREADY_ANSWERED: 'has already been answered',
  ATTEMPT_QUIZ_NOT_PUBLISHED: 'is not yet published',
  ATTEMPT_QUESTION_INVALID: 'is invalid',
  ATTEMPT_NOT_COMPLETED: 'has not been completed',
  ATTEMPT_ANSWER_NOT_FOUND: 'was not found',
  AUTH_INVALID_CREDENTIALS: 'are invalid',
  AUTH_INVALID_TOKEN: 'is invalid',
  AUTH_INVALID_REFRESH_TOKEN: 'is invalid',
  AUTH_TOKEN_REUSED: 'has already been used',
  AUTH_SESSION_CONTEXT_MISMATCH: 'does not match the session',
  AUTH_USER_NOT_FOUND: 'was not found',
  AUTH_RATE_LIMITED: 'was rate-limited',
  AUTH_RESOURCE_CONFLICT: 'is already in use',
  AUTH_INVALID_CURRENT_PASSWORD: 'is incorrect',
  AUTH_DELETION_FAILED: 'failed to delete',
  AUTH_PASSWORD_REUSE: 'cannot be reused',
  AUTH_OAUTH_INVALID_TOKEN: 'is invalid',
  AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS: 'is already linked',
  AUTH_OAUTH_LINKING_REQUIRED: 'requires OAuth linking',
  BOOKMARK_NOT_FOUND: 'was not found',
  BOOKMARK_COLLECTION_NOT_FOUND: 'was not found',
  BOOKMARK_CONFLICT: 'is already in this collection',
  BOOKMARK_VALIDATION: 'is invalid',
  CATEGORY_FOLLOW_NOT_FOUND: 'was not found',
  COLLECTION_CONFLICT: 'is already in use',
  COLLECTION_FORBIDDEN: 'is not allowed',
  COMMENT_SELF_VOTE: 'cannot be voted on by the author',
  COMMENT_SELF_REPORT: 'cannot be reported by the author',
  COMMENT_QUIZ_NOT_FOUND: 'was not found',
  COMMENT_FORBIDDEN: 'is not allowed',
  COMMENT_REPLY_LIMIT_EXCEEDED: 'exceeds the reply limit',
  TOURNAMENT_ROUND_NOT_FOUND: 'was not found',
  TOURNAMENT_CONFLICT: 'is already in use',
  TOURNAMENT_VALIDATION: 'is invalid',
  TOURNAMENT_REGISTRATION_CLOSED: 'is closed',
  TOURNAMENT_ROUND_NOT_OPEN: 'is not open',
  TOURNAMENT_UNREGISTER_CLOSED: 'is closed',
  TOURNAMENT_WITHDRAW_CLOSED: 'is closed',
  TOURNAMENT_PARTICIPANT_STATE: 'is not in a valid state',
  TOURNAMENT_ATTEMPT_ALREADY_EXISTS: 'already has an attempt',
  REVIEW_VALIDATION: 'is invalid',
  REVIEW_ALREADY_REPORTED: 'has already been reported',
};

const SYNTHESIZED_PHRASE: Readonly<Record<string, string>> = {
  GLOBAL_BAD_REQUEST: 'request was malformed',
  GLOBAL_VALIDATION_FAILED: 'one or more fields failed validation',
  GLOBAL_UNAUTHENTICATED: 'you are not signed in',
  GLOBAL_FORBIDDEN: 'this action is forbidden',
  GLOBAL_NOT_FOUND: 'the requested resource was not found',
  GLOBAL_METHOD_NOT_ALLOWED: 'this HTTP method is not supported',
  GLOBAL_CONFLICT: 'a conflict occurred',
  GLOBAL_UNPROCESSABLE: 'the request could not be processed',
  GLOBAL_RATE_LIMITED: 'too many requests, please try again later',
  GLOBAL_INTERNAL_ERROR: 'an unexpected error occurred',
};

function titleCaseFromSnake(input: string): string {
  return input
    .toLowerCase()
    .split('_')
    .map((w) => (w.length === 0 ? w : w[0]!.toUpperCase() + w.slice(1)))
    .join(' ');
}

function codeToTitleAndBody(code: string): { title: string; body: string } {
  // Synthesized GLOBAL_* codes have their own HTTP-status mapping.
  if (code in SYNTHESIZED_PHRASE) {
    const phrase = SYNTHESIZED_PHRASE[code]!;
    return {
      title: titleCaseFromSnake(code.replace(/^GLOBAL_/, '').replace(/_/g, ' ')),
      body: `Sorry — ${phrase}.`,
    };
  }

  // Otherwise, split on the first underscore into module prefix + the
  // rest. The rest is looked up directly in `TOKEN_PHRASE`; if absent,
  // we fall through to a generic phrase derived from the tokens.
  const underscoreIdx = code.indexOf('_');
  if (underscoreIdx <= 0) {
    return {
      title: titleCaseFromSnake(code),
      body: 'Sorry — please try again.',
    };
  }
  const moduleKey = code.slice(0, underscoreIdx);
  const rest = code.slice(underscoreIdx + 1);
  const noun = MODULE_NOUN[moduleKey] ?? titleCaseFromSnake(moduleKey);
  const phrase =
    TOKEN_PHRASE[rest] ?? TOKEN_PHRASE[code] ?? `${titleCaseFromSnake(rest).toLowerCase()}`.replace(/^./, (c) => c);

  // Title: short noun + rest token, e.g. "Attempt Already Started".
  const title = `${noun} ${titleCaseFromSnake(rest)}`.replace(/\s+/g, ' ').trim();
  // Body: a slightly softer rendering ("Attempt has already been
  // started."). For verbs that already include "was/is/has/..." we use
  // them as-is; otherwise we default to "could not be processed".
  const body = `${noun} ${phrase}.`;
  return { title, body };
}

function deriveCopyFor(code: string): UserCopyEntry {
  const { title, body } = codeToTitleAndBody(code);
  return Object.freeze({ title, body, toast: 'inline' as const });
}

// ─── Priority copy overrides (TKT-4.1.C2) ───────────────────────────────

/**
 * Author-driven copy for the 16 codes Phase 4 surfaces heavily.
 * These win against the deterministic template at table-build time.
 * See `EPIC_4_1_C2.md` for rationale.
 */
const PHASE4_PRIORITY_COPY: Partial<Record<ErrorCode, UserCopyEntry>> = {
  ATTEMPT_ALREADY_STARTED: {
    title: 'Attempt already in progress',
    body: 'You already have an in-progress attempt for this quiz. Resume it or abandon the existing one first.',
    toast: 'inline',
  },
  ATTEMPT_NOT_ACTIVE: {
    title: 'Attempt is no longer active',
    body: 'This attempt is no longer active. It may have been completed, abandoned, or withdrawn.',
    toast: 'inline',
  },
  ATTEMPT_QUESTION_ALREADY_ANSWERED: {
    title: 'Question already answered',
    body: 'You have already answered this question. Withdraw your previous answer to change it.',
    toast: 'inline',
  },
  ATTEMPT_QUIZ_NOT_PUBLISHED: {
    title: 'Quiz is not published',
    body: 'You can only start an attempt on a published quiz version.',
    toast: 'inline',
  },
  ATTEMPT_NOT_COMPLETED: {
    title: 'Attempt is not completed',
    body: 'This action requires a completed attempt. Submit or complete your attempt first.',
    toast: 'inline',
  },
  ATTEMPT_ANSWER_NOT_FOUND: {
    title: 'Answer not found',
    body: 'We could not find an answer for this question on your attempt.',
    toast: 'inline',
  },
  ATTEMPT_QUESTION_INVALID: {
    title: 'Question is not valid',
    body: 'The question you tried to answer does not belong to this attempt.',
    toast: 'inline',
  },
  QUIZ_INSUFFICIENT_QUESTIONS: {
    title: 'Quiz needs more questions',
    body: 'A quiz needs at least 5 questions before it can be published.',
    toast: 'inline',
  },
  QUIZ_SLUG_CONFLICT: {
    title: 'URL slug already in use',
    body: 'A quiz with this slug already exists. Choose a different slug.',
    toast: 'inline',
  },
  QUIZ_QUESTION_POSITION_CONFLICT: {
    title: 'Question position conflict',
    body: 'A question already exists at this position. Choose a different position.',
    toast: 'inline',
  },
  QUIZ_ANSWER_OPTION_POSITION_CONFLICT: {
    title: 'Answer position conflict',
    body: 'An answer option already exists at this position. Choose a different position.',
    toast: 'inline',
  },
  QUIZ_MULTIPLE_CORRECT_OPTIONS: {
    title: 'Multiple correct answers',
    body: 'Only one answer option can be marked correct per question.',
    toast: 'inline',
  },
  QUIZ_VERSION_IMMUTABLE: {
    title: 'Version is immutable',
    body: 'A published quiz version cannot be edited. Create a new draft version to make changes.',
    toast: 'inline',
  },
  REVIEW_ATTEMPT_REQUIRED: {
    title: 'Completed attempt required',
    body: 'You can only review a quiz once you have a completed attempt for it.',
    toast: 'inline',
  },
  REVIEW_FORBIDDEN: {
    title: 'Review not allowed',
    body: 'You do not have permission to edit or delete this review.',
    toast: 'inline',
  },
  REVIEW_CONFLICT: {
    title: 'Review conflict',
    body: 'A review for this quiz already exists from you. Edit the existing one instead.',
    toast: 'inline',
  },
  COMMENT_REPLY_LIMIT_EXCEEDED: {
    title: 'Reply limit reached',
    body: 'Comment threads are capped at 100 replies, with 2 levels of nesting. Reply to an earlier comment instead.',
    toast: 'inline',
  },
  COMMENT_SELF_VOTE: {
    title: 'Cannot vote on your own comment',
    body: 'You cannot upvote or downvote your own comment.',
    toast: 'inline',
  },
  COMMENT_SELF_REPORT: {
    title: 'Cannot report your own comment',
    body: 'You cannot report your own comment.',
    toast: 'inline',
  },
  COMMENT_DUPLICATE_REPORT: {
    title: 'Already reported',
    body: 'You have already reported this comment. A moderator will review it shortly.',
    toast: 'inline',
  },
  COLLECTION_CONFLICT: {
    title: 'Collection name already in use',
    body: 'You already have a bookmark collection with this name. Choose a different name.',
    toast: 'inline',
  },
  BOOKMARK_COLLECTION_NOT_FOUND: {
    title: 'Bookmark collection not found',
    body: 'The bookmark collection you are looking for no longer exists or has been deleted.',
    toast: 'inline',
  },
};

// ─── Final table ────────────────────────────────────────────────────────

/**
 * Build the final USER_COPY table by overlaying `PHASE4_PRIORITY_COPY`
 * onto the deterministically derived copy. The result is a complete
 * `Record<ErrorCode, UserCopyEntry>` (TypeScript enforces coverage).
 */
function buildUserCopy(): Record<ErrorCode, UserCopyEntry> {
  const out = {} as Record<ErrorCode, UserCopyEntry>;
  for (const code of KNOWN_ERROR_CODES) {
    if (code in PHASE4_PRIORITY_COPY) {
      // Object.freeze at the leaf so the table is deeply immutable.
      out[code] = Object.freeze({ ...PHASE4_PRIORITY_COPY[code]! });
    } else {
      out[code] = deriveCopyFor(code);
    }
  }
  return out;
}

/**
 * The complete user-facing copy table, keyed by every `ErrorCode`
 * member. Read this table only through `getUserCopy`; direct reads
 * bypass the unknown-code fallback.
 */
export const USER_COPY: Record<ErrorCode, UserCopyEntry> =
  Object.freeze(buildUserCopy());

/**
 * Look up the user-facing copy for an `ErrorCode` value. Unknown codes
 * (defensive case for backend-added codes that this registry has not
 * yet mirrored) fall back to `UNKNOWN_USER_COPY`.
 *
 * @example
 *   const { title, body, toast } = getUserCopy(apiError.code);
 */
export function getUserCopy(code: string): UserCopyEntry {
  if (typeof code === 'string' && code in USER_COPY) {
    return USER_COPY[code as ErrorCode];
  }
  return UNKNOWN_USER_COPY;
}
