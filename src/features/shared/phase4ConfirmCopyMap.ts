

import type { ConfirmKind } from '@/components/primitives/ConfirmDialog/confirm-copy';

export type Phase4Action =

| 'bookmark.collection.delete'
  | 'collection.bulk-remove'
  | 'bookmark.recent.clear'
  // Attempts (story 4.11 / 4.15)
  | 'attempt.submit-and-complete'
  | 'attempt.withdraw'
  | 'attempt.abandon'
  // Quiz authoring (story 4.6 / 4.11)
  | 'quiz.publish'
  | 'quiz.version.delete'
  | 'quiz.question.bulk-remove'
  // Reviews (story 4.13)
  | 'review.delete'
  // Account (story 4.6 / personal area)
  | 'account.delete';

export const PHASE4_ACTION_NAMES: readonly Phase4Action[] = [
'bookmark.collection.delete',
'collection.bulk-remove',
'bookmark.recent.clear',
'attempt.submit-and-complete',
'attempt.withdraw',
'attempt.abandon',
'quiz.publish',
'quiz.version.delete',
'quiz.question.bulk-remove',
'review.delete',
'account.delete',
] as const;

export const PHASE4_CONFIRM_KIND: Record<Phase4Action, ConfirmKind> =
Object.freeze({

'bookmark.collection.delete': 'destructive-permanent',
'collection.bulk-remove': 'destructive-idempotent',
'bookmark.recent.clear': 'destructive-idempotent',

'attempt.submit-and-complete': 'state-changing',

'attempt.withdraw': 'state-changing',
'attempt.abandon': 'state-changing',

'quiz.publish': 'state-changing',

'quiz.version.delete': 'destructive-permanent',
'quiz.question.bulk-remove': 'destructive-idempotent',

'review.delete': 'destructive-permanent',

'account.delete': 'typed-confirm',
  });

export function getConfirmKind(action: string): ConfirmKind {
if ((PHASE4_ACTION_NAMES as readonly string[]).includes(action)) {
return PHASE4_CONFIRM_KIND[action as Phase4Action];
  }
return 'destructive-permanent';
}

export function actionsForKind(kind: ConfirmKind): readonly Phase4Action[] {
return PHASE4_ACTION_NAMES.filter((a) => PHASE4_CONFIRM_KIND[a] === kind);
}
