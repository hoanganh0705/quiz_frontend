import type { ConfirmKind } from "@/components/primitives/ConfirmDialog/confirm-copy";

export type ConfirmAction =
  | "bookmark.collection.delete"
  | "collection.bulk-remove"
  | "bookmark.recent.clear"
  // Attempts
  | "attempt.submit-and-complete"
  | "attempt.withdraw"
  | "attempt.abandon"
  // Quiz authoring
  | "quiz.publish"
  | "quiz.version.delete"
  | "quiz.question.bulk-remove"
  // Reviews
  | "review.delete"
  // Account
  | "account.delete";

export const CONFIRM_ACTION_NAMES: readonly ConfirmAction[] = [
  "bookmark.collection.delete",
  "collection.bulk-remove",
  "bookmark.recent.clear",
  "attempt.submit-and-complete",
  "attempt.withdraw",
  "attempt.abandon",
  "quiz.publish",
  "quiz.version.delete",
  "quiz.question.bulk-remove",
  "review.delete",
  "account.delete",
] as const;


export const CONFIRM_ACTION_KIND: Record<ConfirmAction, ConfirmKind> =
  Object.freeze({
    "bookmark.collection.delete": "destructive-permanent",
    "collection.bulk-remove": "destructive-idempotent",
    "bookmark.recent.clear": "destructive-idempotent",

    "attempt.submit-and-complete": "state-changing",
    "attempt.withdraw": "state-changing",
    "attempt.abandon": "state-changing",

    "quiz.publish": "state-changing",

    "quiz.version.delete": "destructive-permanent",
    "quiz.question.bulk-remove": "destructive-idempotent",

    "review.delete": "destructive-permanent",

    "account.delete": "typed-confirm",
  });


export function getConfirmKind(action: string): ConfirmKind {
  if ((CONFIRM_ACTION_NAMES as readonly string[]).includes(action)) {
    return CONFIRM_ACTION_KIND[action as ConfirmAction];
  }
  return "destructive-permanent";
}

export function actionsForKind(kind: ConfirmKind): readonly ConfirmAction[] {
  return CONFIRM_ACTION_NAMES.filter((a) => CONFIRM_ACTION_KIND[a] === kind);
}
