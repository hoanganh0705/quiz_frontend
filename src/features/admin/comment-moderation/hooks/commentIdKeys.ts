

export interface CommentKeyParts {
scope: 'comments';
segment?: string;
identifier?: string;
}

export function commentIdKey(commentId: string): readonly unknown[] {
return ['comments', 'byId', commentId];
}

export function commentIdKeyMatcher(
key: unknown,
commentId: string,
): boolean {
if (!Array.isArray(key)) return false;
return key[0] === 'comments' && key[1] === 'byId' && key[2] === commentId;
}

export function commentThreadKey(threadId: string): readonly unknown[] {
return ['comments', 'thread', threadId];
}

export function commentsNamespaceKeyMatcher(key: unknown): boolean {
return Array.isArray(key) && key[0] === 'comments';
}
