

import { mutate as globalMutate, type ScopedMutator } from 'swr';

import { commentIdKeyMatcher } from '../hooks/commentIdKeys';
import { commentReportsKeyMatcher } from '../hooks/useCommentReports';

export { commentReportsKeyMatcher, commentIdKeyMatcher };

export function commentKey(
commentId: string,
): readonly ['comments', 'byId', string] {
return ['comments', 'byId', commentId] as const;
}

export function publicCommentsKeyMatcher(key: unknown): boolean {
if (!Array.isArray(key)) return false;
return key[0] === 'comments';
}

export function commentThreadKeyMatcher(key: unknown): boolean {
if (!Array.isArray(key)) return false;
return key[0] === 'comments' && key[1] === 'thread';
}

export function invalidateCommentReportsList(
mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
return (mutate(commentReportsKeyMatcher) as unknown) as Promise<unknown[]>;
}

export function invalidateCommentById(
commentId: string,
mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
if (typeof commentId !== 'string' || commentId.trim().length === 0) {
return Promise.resolve([]);
  }
const promises: unknown[] = [];
promises.push(mutate(commentKey(commentId) as unknown as string));
promises.push(
((mutate as unknown as (key: unknown) => Promise<unknown[]>)((
candidate: unknown
    ) => commentIdKeyMatcher(candidate, commentId)) as unknown) as Promise<
unknown[]
    >,
  );
promises.push(
(mutate(publicCommentsKeyMatcher) as unknown) as Promise<unknown[]>,
  );
return Promise.all(promises) as Promise<unknown[]>;
}