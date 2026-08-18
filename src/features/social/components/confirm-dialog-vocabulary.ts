

export interface DialogVocabulary {

readonly title: string;

readonly body: string;

readonly confirmLabel: string;

readonly cancelLabel: string;

readonly icon?: string;

readonly dataTestid: string;
}

export type ConfirmDialogAction =
| "unfollow"
  | "block"
  | "unblock"
  | "unfriend"
  | "cancel_friend_request";

const UNFOLLOW_VOCABULARY: DialogVocabulary = Object.freeze({
title: "Unfollow?",
body: "Are you sure? This user will no longer receive notifications about your activity. This action cannot be undone — send a new follow request to follow them again.",
confirmLabel: "Unfollow",
cancelLabel: "Cancel",
icon: "UserMinus",
dataTestid: "confirm-dialog.unfollow",
});

const BLOCK_VOCABULARY: DialogVocabulary = Object.freeze({
title: "Block this user?",
body: "Once blocked, they won't be able to see your content, follow you, or send you friend requests. If you're currently following them, that follow will be removed.",
confirmLabel: "Block",
cancelLabel: "Cancel",
icon: "Ban",
dataTestid: "confirm-dialog.block",
});

const UNBLOCK_VOCABULARY: DialogVocabulary = Object.freeze({
title: "Unblock?",
body: "Unblocking will restore the ability to see your content, follow you, and send you friend requests, based on their current privacy settings.",
confirmLabel: "Unblock",
cancelLabel: "Cancel",
icon: "UserPlus",
dataTestid: "confirm-dialog.unblock",
});

const UNFRIEND_VOCABULARY: DialogVocabulary = Object.freeze({
title: "Unfriend?",
body: "Unfriending does not cancel a pending friend request. Cancel any pending request separately. This user will no longer see your friend-only content. This action cannot be undone.",
confirmLabel: "Unfriend",
cancelLabel: "Cancel",
icon: "UserMinus",
dataTestid: "confirm-dialog.unfriend",
});

const CANCEL_FRIEND_REQUEST_VOCABULARY: DialogVocabulary = Object.freeze({
title: "Cancel friend request?",
body: "The recipient will no longer see this request in their incoming list. They will not be notified that you cancelled. This action cannot be undone.",
confirmLabel: "Cancel request",
cancelLabel: "Keep request",
icon: "XCircle",
dataTestid: "confirm-dialog.cancel-friend-request",
});

export const CONFIRM_DIALOGS: Readonly<Record<ConfirmDialogAction, DialogVocabulary>> =
Object.freeze({
unfollow: UNFOLLOW_VOCABULARY,
block: BLOCK_VOCABULARY,
unblock: UNBLOCK_VOCABULARY,
unfriend: UNFRIEND_VOCABULARY,
cancel_friend_request: CANCEL_FRIEND_REQUEST_VOCABULARY,
  });

export function getConfirmDialogCopy(
action: ConfirmDialogAction,
): DialogVocabulary {
return CONFIRM_DIALOGS[action];
}
