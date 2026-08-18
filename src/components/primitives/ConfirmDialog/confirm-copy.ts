

export type ConfirmKind =
| 'destructive-permanent'
  | 'destructive-idempotent'
  | 'state-changing'
  | 'irreversible-flow'
  | 'typed-confirm';

export type ConfirmTone = 'danger' | 'warning' | 'info';

export type ConfirmCopy = {
title: string;
body: string;
confirmLabel: string;
cancelLabel: string;
tone: ConfirmTone;

typedString?: string;
};

const DEFAULT_CANCEL = 'Cancel';

export const CONFIRM_COPY: Record<ConfirmKind, ConfirmCopy> = Object.freeze({

'destructive-permanent': {
title: 'Delete permanently?',
body: 'This cannot be undone. Once deleted, the data is permanently removed from the system and cannot be recovered.',
confirmLabel: 'Delete permanently',
cancelLabel: DEFAULT_CANCEL,
tone: 'danger',
  },

'destructive-idempotent': {
title: 'Remove these items?',
body: 'These items will be removed from your collection. You can re-add them later by searching for them again.',
confirmLabel: 'Remove',
cancelLabel: DEFAULT_CANCEL,
tone: 'warning',
  },

'state-changing': {
title: 'Continue?',
body: 'This will change the state of the item. You can take further actions after this completes.',
confirmLabel: 'Continue',
cancelLabel: DEFAULT_CANCEL,
tone: 'info',
  },

'irreversible-flow': {
title: 'Are you sure?',
body: 'Once you start, you will not be able to change the answers you submit. Make sure you are ready before continuing.',
confirmLabel: "I'm ready",
cancelLabel: 'Go back',
tone: 'warning',
  },

'typed-confirm': {
title: 'Type to confirm',
body: 'This is a permanent action. Type the word below to confirm.',
confirmLabel: 'Confirm',
cancelLabel: DEFAULT_CANCEL,
tone: 'danger',
typedString: 'confirm',
  },
});

export const CONFIRM_KINDS: readonly ConfirmKind[] = Object.freeze([
'destructive-permanent',
'destructive-idempotent',
'state-changing',
'irreversible-flow',
'typed-confirm',
]);

export function getConfirmCopy(kind: ConfirmKind): ConfirmCopy {
return CONFIRM_COPY[kind];
}
