

const UUID_V4_REGEX_SOURCE =
'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

export const COMMENT_ID_UUID_REGEX: RegExp = new RegExp(
UUID_V4_REGEX_SOURCE,
'i',
);

export type CommentIdValidationReason =

| 'not-a-string'
  /** The input was a string but did not match the UUID v4 regex. */
  | 'invalid-uuid';

export type CommentIdValidationResult =
| { ok: true }
  | { ok: false; reason: CommentIdValidationReason };

export function validateCommentId(value: unknown): CommentIdValidationResult {
if (typeof value !== 'string') {
return { ok: false, reason: 'not-a-string' };
  }
if (value.length === 0) {
return { ok: false, reason: 'not-a-string' };
  }
if (!COMMENT_ID_UUID_REGEX.test(value)) {
return { ok: false, reason: 'invalid-uuid' };
  }
return { ok: true };
}

export function isCommentSelfModerationAttempt(
commentAuthorId: string | null | undefined,
currentUserId: string | null | undefined,
): boolean {
if (
typeof commentAuthorId !== 'string' ||
commentAuthorId.length === 0
  ) {
return false;
  }
if (
typeof currentUserId !== 'string' ||
currentUserId.length === 0
  ) {
return false;
  }
return commentAuthorId === currentUserId;
}