/**
 * `confirm-dialog-vocabulary.ts` — Shared confirm-dialog copy registry.
 *
 * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
 * Source story:  Story 6.6.
 * Source ticket: TKT-6.6.F1 (unfollow), TKT-6.6.G2 (unblock deferred),
 *                TKT-6.7.F1 (block + unblock).
 *
 * ## Purpose
 *
 * Centralised, typed copy table for every non-idempotent DELETE confirm
 * dialog in the social feature. Each entry carries the title, body,
 * button labels, and optional icon identifier that the dialog
 * components render. The file is language-agnostic — components read
 * from the vocabulary rather than hardcoding strings.
 *
 * ## Extensibility
 *
 * New entries are added here as future Phase 6 epics author
 * non-idempotent DELETE dialogs:
 *
 *   - `UNFOLLOW`   ← TKT-6.6.F1 (Story 6.6)
 *   - `BLOCK`      ← TKT-6.7.F1 (Story 6.7 — bidirectional side effects)
 *   - `UNBLOCK`    ← TKT-6.7.F1 (Story 6.7 — non-idempotent DELETE)
 *   - `UNFRIEND`   ← Epic 6.8 (still scaffolded)
 *   - `CANCEL_FRIEND_REQUEST` ← Epic 6.8 (still scaffolded)
 *
 * ## Vocabulary shape
 *
 * Every entry conforms to `DialogVocabulary`:
 *
 *   - `title`          — Short heading displayed in the dialog header.
 *   - `body`           — One-sentence explanation of the action and its
 *                        consequences.
 *   - `confirmLabel`   — Label for the destructive confirm button.
 *   - `cancelLabel`   — Label for the cancel button.
 *   - `icon?`         — Optional icon identifier (Lucide icon name).
 *                        Defaults to `"AlertTriangle"` for irreversible actions.
 *   - `dataTestid`     — Stable `data-testid` value for QA automation.
 *
 * ## Non-idempotent DELETE note
 *
 * The body copy should explain the practical consequence of the action,
 * not the HTTP semantics. The fact that the backend returns
 * `SOCIAL_FOLLOW_NOT_FOUND` (a 404) when the relationship does not
 * exist is an implementation detail — users are not shown HTTP codes.
 * The body copy focuses on the user-visible outcome. The same applies
 * to `SOCIAL_USER_NOT_BLOCKED` (the block-side 404) for the unblock
 * action.
 *
 * ## Bidirectional block
 *
 * The `BLOCK` entry must explicitly surface bidirectionality: once
 * blocked, the target user cannot see the actor's content, cannot
 * follow the actor, and cannot send the actor a friend request. The
 * block entry also warns about the silent follow-removal side effect
 * (if the actor was following the target, that follow is silently
 * removed server-side).
 */

// ─── Type ────────────────────────────────────────────────────────────────

/**
 * Shape of a single vocabulary entry. All string fields are required
 * except `icon` (defaults to `"AlertTriangle"` in the dialog).
 */
export interface DialogVocabulary {
  /** Heading text displayed in the dialog header. */
  readonly title: string;
  /**
   * Body text explaining the action and its consequences.
   * One sentence preferred (master plan rule 3).
   */
  readonly body: string;
  /** Label for the destructive confirm button. */
  readonly confirmLabel: string;
  /** Label for the cancel button. */
  readonly cancelLabel: string;
  /**
   * Lucide icon identifier. Defaults to `"AlertTriangle"` in the
   * dialog for irreversible actions.
   */
  readonly icon?: string;
  /**
   * Stable `data-testid` value for QA automation. Format:
   * `confirm-dialog.{action}`.
   */
  readonly dataTestid: string;
}

/**
 * Action name discriminator for the vocabulary.
 * Each entry in `CONFIRM_DIALOGS` is keyed by one of these values.
 */
export type ConfirmDialogAction =
  | "unfollow"
  | "block"
  | "unblock"
  | "unfriend"
  | "cancel_friend_request";

// ─── UNFOLLOW entry ───────────────────────────────────────────────────

/**
 * Vocabulary for the unfollow confirmation dialog.
 *
 * Body reflects:
 *   (a) The target user will no longer receive activity notifications
 *       about the actor's actions.
 *   (b) The action is irreversible — the actor must send a new
 *       follow request to re-follow.
 *
 * The HTTP `404 + SOCIAL_FOLLOW_NOT_FOUND` response (non-idempotent
 * DELETE) is an implementation detail and is NOT surfaced in copy.
 */
const UNFOLLOW_VOCABULARY: DialogVocabulary = Object.freeze({
  title: "Unfollow?",
  body: "Are you sure? This user will no longer receive notifications about your activity. This action cannot be undone — send a new follow request to follow them again.",
  confirmLabel: "Unfollow",
  cancelLabel: "Cancel",
  icon: "UserMinus",
  dataTestid: "confirm-dialog.unfollow",
});

// ─── BLOCK entry (Epic 6.7 / TKT-6.7.F1) ───────────────────────────────

/**
 * Vocabulary for the block confirmation dialog.
 *
 * Body reflects three explicit side-effects of the block action:
 *
 *   (a) **Bidirectionality.** Once blocked, the target user cannot see
 *       the actor's content, cannot follow the actor, and cannot send
 *       the actor a friend request.
 *   (b) **Silent follow removal.** If the actor is currently following
 *       the target, that follow is silently removed server-side; the
 *       actor will need to send a new follow request to re-follow
 *       after an unblock.
 *   (c) **Mutual block recovery.** Unblocking later restores the
 *       prior relationship state, subject to each side's privacy
 *       settings.
 *
 * The HTTP semantics (POST → 201 / 204; side effects are server-driven)
 * are NOT surfaced in copy.
 */
const BLOCK_VOCABULARY: DialogVocabulary = Object.freeze({
  title: "Block this user?",
  body: "Once blocked, they won't be able to see your content, follow you, or send you friend requests. If you're currently following them, that follow will be removed.",
  confirmLabel: "Block",
  cancelLabel: "Cancel",
  icon: "Ban",
  dataTestid: "confirm-dialog.block",
});

// ─── UNBLOCK entry (Epic 6.7 / TKT-6.7.F1 — was deferred from TKT-6.6.G2) ──

/**
 * Vocabulary for the unblock confirmation dialog.
 *
 * Body reflects:
 *   (a) **Prior-relationship-state restoration.** Unblocking restores
 *       the prior relationship (followed / not-followed, pending
 *       friend request / none) as it was before the block, subject to
 *       each side's privacy settings.
 *   (b) **Non-idempotent DELETE semantics.** Unblocking an
 *       already-unblocked user has no effect; the backend returns
 *       `SOCIAL_USER_NOT_BLOCKED` (404) and the hook treats this as
 *       a successful terminal state — no error banner is shown.
 *
 * The HTTP 404 + code semantics are NOT surfaced in copy.
 */
const UNBLOCK_VOCABULARY: DialogVocabulary = Object.freeze({
  title: "Unblock?",
  body: "Unblocking will restore the ability to see your content, follow you, and send you friend requests, based on their current privacy settings.",
  confirmLabel: "Unblock",
  cancelLabel: "Cancel",
  icon: "UserPlus",
  dataTestid: "confirm-dialog.unblock",
});

// ─── UNFRIEND entry (Epic 6.8 / TKT-6.8.F2) ─────────────────────────────

/**
 * Vocabulary for the unfriend confirmation dialog.
 *
 * Body reflects:
 *
 *   (a) **Non-idempotent DELETE semantics.** Unfriending a user who is
 *       not currently a friend has no effect; the backend returns
 *       `SOCIAL_FRIENDSHIP_NOT_FOUND` (404) and the hook treats this as
 *       a successful terminal state — no error banner is shown.
 *   (b) **Friend-request lifecycle side effect.** Unfriending does NOT
 *       auto-cancel a pending friend request. If the viewer has a
 *       pending outgoing request, the request must be cancelled
 *       separately via the outgoing-list Cancel dialog.
 *   (c) **Visibility side effect.** The unfriended user will no longer
 *       see the actor's friend-only content (per the receiver's
 *       privacy settings).
 *
 * The HTTP 404 + code semantics are NOT surfaced in copy.
 */
const UNFRIEND_VOCABULARY: DialogVocabulary = Object.freeze({
  title: "Unfriend?",
  body: "Unfriending does not cancel a pending friend request. Cancel any pending request separately. This user will no longer see your friend-only content. This action cannot be undone.",
  confirmLabel: "Unfriend",
  cancelLabel: "Cancel",
  icon: "UserMinus",
  dataTestid: "confirm-dialog.unfriend",
});

// ─── CANCEL_FRIEND_REQUEST entry (Epic 6.8 / TKT-6.8.F2) ─────────────────

/**
 * Vocabulary for the cancel-friend-request confirmation dialog.
 *
 * Body reflects:
 *
 *   (a) **Non-idempotent DELETE semantics.** Cancelling a request that
 *       is no longer pending has no effect; the backend returns
 *       `SOCIAL_FRIEND_REQUEST_NOT_FOUND` (404) and the hook treats
 *       this as a successful terminal state — no error banner is
 *       shown.
 *   (b) **Visibility side effect.** The recipient will no longer see
 *       this request in their incoming list. The sender's
 *       relationship state returns to `none`.
 *
 * The HTTP 404 + code semantics are NOT surfaced in copy.
 */
const CANCEL_FRIEND_REQUEST_VOCABULARY: DialogVocabulary = Object.freeze({
  title: "Cancel friend request?",
  body: "The recipient will no longer see this request in their incoming list. They will not be notified that you cancelled. This action cannot be undone.",
  confirmLabel: "Cancel request",
  cancelLabel: "Keep request",
  icon: "XCircle",
  dataTestid: "confirm-dialog.cancel-friend-request",
});

// ─── Table ────────────────────────────────────────────────────────────

/**
 * The complete vocabulary table, keyed by `ConfirmDialogAction`.
 * Consumers access an entry by action name:
 *
 *   const copy = CONFIRM_DIALOGS[action];
 *   <Dialog title={copy.title} body={copy.body} ... />
 *
 * New entries are added as future epics author confirm dialogs.
 */
export const CONFIRM_DIALOGS: Readonly<Record<ConfirmDialogAction, DialogVocabulary>> =
  Object.freeze({
    unfollow: UNFOLLOW_VOCABULARY,
    block: BLOCK_VOCABULARY,
    unblock: UNBLOCK_VOCABULARY,
    unfriend: UNFRIEND_VOCABULARY,
    cancel_friend_request: CANCEL_FRIEND_REQUEST_VOCABULARY,
  });

/**
 * Get the vocabulary for a given action.
 *
 * @example
 *   const copy = getConfirmDialogCopy("unfollow");
 */
export function getConfirmDialogCopy(
  action: ConfirmDialogAction,
): DialogVocabulary {
  return CONFIRM_DIALOGS[action];
}
